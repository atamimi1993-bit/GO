import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Free AI-powered background screening — uses the platform's built-in LLM
// (Gemini with web search) to check public records and verify identity.
//
// Two-phase screening:
//   Phase 1: Public records search — searches the web for criminal records,
//            court cases, and sex offender registry hits matching the driver's
//            name and location.
//   Phase 2: Document verification — if a license photo is uploaded, uses LLM
//            vision to verify the document is valid and matches the driver's
//            profile information.
//
// The LLM returns a structured report that admins review before making a
// final decision. This is NOT a certified background check — it's a free
// pre-screening tool that surfaces publicly available information.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try { user = await base44.auth.me(); } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let trustedUser;
    try { trustedUser = await base44.entities.User.get(user.id); } catch {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
    if (!trustedUser || trustedUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { driver_id, manual_status, manual_report_url } = body;

    if (!driver_id) return Response.json({ error: 'driver_id is required' }, { status: 400 });

    let driver;
    try {
      driver = await base44.asServiceRole.entities.DriverProfile.get(driver_id);
    } catch {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Manual status update (admin overrides after reviewing the report)
    if (manual_status) {
      const validStatuses = ['clear', 'consider', 'failed'];
      if (!validStatuses.includes(manual_status)) {
        return Response.json({ error: 'Invalid manual_status' }, { status: 400 });
      }
      const updateData = {
        background_check_status: manual_status,
        background_check_date: new Date().toISOString(),
      };
      if (manual_report_url) updateData.background_check_report_url = manual_report_url;
      await base44.asServiceRole.entities.DriverProfile.update(driver_id, updateData);

      // Notify driver
      if (driver.email) {
        try {
          const statusLabel = { clear: 'Cleared', consider: 'Under Review', failed: 'Failed' }[manual_status];
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: driver.email,
            subject: 'Background Check Update — GO',
            body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;"><h2>Background Check ${statusLabel}</h2><p>Your background check status has been updated to <strong>${statusLabel}</strong>.</p>${manual_status === 'clear' ? '<p>You\'re all set! You can continue accepting jobs on the platform.</p>' : manual_status === 'consider' ? '<p>Some items require further review. Our team will reach out if we need additional information.</p>' : '<p>Please contact support to discuss next steps.</p>'}</div>`,
          });
        } catch (e) {
          console.error('Failed to email driver:', e.message);
        }
      }
      return Response.json({ success: true, status: manual_status });
    }

    // --- Automated AI Screening ---

    // Mark as pending while screening runs
    await base44.asServiceRole.entities.DriverProfile.update(driver_id, {
      background_check_status: 'pending',
      background_check_date: new Date().toISOString(),
    });

    const nameParts = (driver.full_name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const searchLocation = driver.service_area || '';

    // Phase 1: Public records search using LLM with web search
    const recordsPrompt = [
      `You are a background screening assistant. Search public records for the following person:`,
      `Name: ${driver.full_name}`,
      searchLocation ? `Location: ${searchLocation}` : '',
      `Phone: ${driver.phone || 'N/A'}`,
      '',
      'Search for:',
      '1. Criminal records or court cases matching this name and location',
      '2. Sex offender registry listings',
      '3. Any news articles about criminal activity involving this person',
      '4. Professional licensing issues or complaints',
      '',
      'IMPORTANT INSTRUCTIONS:',
      '- Only report findings you actually find in search results',
      '- Do NOT fabricate or assume information',
      '- If you find nothing concerning, say so explicitly',
      '- If you find potential matches, note that names are common and verification is needed',
      '- This is a pre-screening tool only, not a certified background check',
    ].join('\n');

    let recordsResult = null;
    try {
      recordsResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: recordsPrompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            records_found: { type: 'boolean' },
            findings: { type: 'array', items: { type: 'string' } },
            risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
            summary: { type: 'string' },
            disclaimer: { type: 'string' },
          },
        },
      });
    } catch (e) {
      console.error('Public records search failed:', e.message);
    }

    // Phase 2: Document verification if license photo is uploaded
    let docResult = null;
    if (driver.license_doc_url) {
      try {
        docResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: [
            `You are a document verification assistant. Analyze this uploaded driver's license image and verify:`,
            `1. Is this a valid government-issued driver's license?`,
            `2. Does the name on the license match: "${driver.full_name}"?`,
            `3. Is the license expired? (License expiry on file: ${driver.license_expiry || 'N/A'})`,
            `4. Does the document appear to be genuine (not digitally altered)?`,
            '',
            'Report any discrepancies or concerns. Do not fabricate information you cannot see in the image.',
          ].join('\n'),
          file_urls: [driver.license_doc_url],
          response_json_schema: {
            type: 'object',
            properties: {
              is_valid_document: { type: 'boolean' },
              name_matches: { type: 'boolean' },
              appears_genuine: { type: 'boolean' },
              expiry_concern: { type: 'string' },
              notes: { type: 'string' },
            },
          },
        });
      } catch (e) {
        console.error('Document verification failed:', e.message);
      }
    }

    // Build the full report
    const reportLines = [
      '═══════════════════════════════════════════',
      '  GO DRIVER BACKGROUND SCREENING REPORT',
      '═══════════════════════════════════════════',
      '',
      `Driver: ${driver.full_name}`,
      `Email: ${driver.email}`,
      `Phone: ${driver.phone || 'N/A'}`,
      `Service Area: ${driver.service_area || 'N/A'}`,
      `License #: ${driver.license_number || 'N/A'}`,
      `License Expiry: ${driver.license_expiry || 'N/A'}`,
      `Screening Date: ${new Date().toLocaleString()}`,
      '',
      '───────────────────────────────────────────',
      '  PHASE 1: PUBLIC RECORDS SEARCH',
      '───────────────────────────────────────────',
      '',
      recordsResult
        ? `Records Found: ${recordsResult.records_found ? 'YES' : 'NO'}`
        : 'Search failed — no results returned',
      '',
      recordsResult?.findings?.length > 0
        ? 'Findings:\n' + recordsResult.findings.map((f, i) => `  ${i + 1}. ${f}`).join('\n')
        : 'No findings were returned from the search.',
      '',
      `Risk Assessment: ${(recordsResult?.risk_level || 'unknown').toUpperCase()}`,
      '',
      'Summary:',
      recordsResult?.summary || 'No summary available.',
      '',
      '───────────────────────────────────────────',
      '  PHASE 2: DOCUMENT VERIFICATION',
      '───────────────────────────────────────────',
      '',
      driver.license_doc_url
        ? [
            `Valid Document: ${docResult?.is_valid_document ? 'Yes' : 'No'}`,
            `Name Matches: ${docResult?.name_matches ? 'Yes' : 'No'}`,
            `Appears Genuine: ${docResult?.appears_genuine ? 'Yes' : 'No'}`,
            docResult?.expiry_concern ? `Expiry Concern: ${docResult.expiry_concern}` : '',
            docResult?.notes ? `Notes: ${docResult.notes}` : '',
          ].filter(Boolean).join('\n')
        : 'No license document uploaded — document verification skipped.',
      '',
      '═══════════════════════════════════════════',
      recordsResult?.disclaimer || 'DISCLAIMER: This is an AI-assisted pre-screening tool that searches publicly available information. It is NOT a certified background check. Results should be verified before making final hiring decisions.',
      '═══════════════════════════════════════════',
    ];

    const fullReport = reportLines.join('\n');

    // Store the report
    await base44.asServiceRole.entities.DriverProfile.update(driver_id, {
      background_check_report: fullReport,
      background_check_date: new Date().toISOString(),
    });

    // Notify driver
    if (driver.email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: driver.email,
          subject: 'Background Screening Completed — GO',
          body: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;"><h2>Background Screening Complete</h2><p>Your background screening has been processed. Our team is reviewing the results and will update your status shortly.</p><p>You can check your Driver Hub for the latest status.</p></div>',
        });
      } catch (e) {
        console.error('Failed to email driver:', e.message);
      }
    }

    return Response.json({
      success: true,
      status: 'pending',
      report: fullReport,
      records_risk_level: recordsResult?.risk_level || 'unknown',
      doc_verified: docResult?.is_valid_document || null,
    });
  } catch (error) {
    console.error('initiate-background-check error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});