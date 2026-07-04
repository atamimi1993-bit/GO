import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Initiates a background check for a driver via Checkr.
// If CHECKR_API_KEY is not configured, creates a "pending" record that admin
// can manually review and update. When Checkr is configured, creates a candidate
// and invokes a standard background check package.
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

    const checkrKey = Deno.env.get('CHECKR_API_KEY');

    // Manual status update (admin reviewing an external report)
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

    // Automated Checkr flow
    if (!checkrKey) {
      // No Checkr key — mark as pending for manual review
      await base44.asServiceRole.entities.DriverProfile.update(driver_id, {
        background_check_status: 'pending',
        background_check_date: new Date().toISOString(),
      });
      return Response.json({
        success: true,
        status: 'pending',
        message: 'CHECKR_API_KEY not configured. Marked as pending for manual review.',
      });
    }

    // Create Checkr candidate
    const nameParts = (driver.full_name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Unknown';
    const candidateRes = await fetch('https://api.checkr.com/v1/candidates', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(checkrKey + ':'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email: driver.email,
        phone: driver.phone,
        dob: driver.license_expiry,
      }),
    });

    if (!candidateRes.ok) {
      const errText = await candidateRes.text();
      console.error('Checkr candidate creation failed:', errText);
      // Fall back to pending
      await base44.asServiceRole.entities.DriverProfile.update(driver_id, {
        background_check_status: 'pending',
        background_check_date: new Date().toISOString(),
      });
      return Response.json({ success: true, status: 'pending', message: 'Checkr candidate creation failed, marked as pending.' });
    }

    const candidate = await candidateRes.json();

    // Invoke standard background check package
    const checkRes = await fetch('https://api.checkr.com/v1/engagements', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(checkrKey + ':'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate_id: candidate.id,
        package: 'tasker_standard',
      }),
    });

    if (!checkRes.ok) {
      const errText = await checkRes.text();
      console.error('Checkr engagement creation failed:', errText);
    }

    await base44.asServiceRole.entities.DriverProfile.update(driver_id, {
      background_check_status: 'pending',
      background_check_date: new Date().toISOString(),
      background_check_candidate_id: candidate.id,
    });

    // Send notification
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: driver.email,
        subject: 'Background Check Initiated — GO',
        body: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;"><h2>Background Check Started</h2><p>A background check has been initiated through our partner, Checkr. You\'ll receive an email from Checkr with instructions to complete any required forms.</p><p>Once complete, your results will be available in your Driver Hub.</p></div>',
      });
    } catch (e) {
      console.error('Failed to email driver:', e.message);
    }

    return Response.json({ success: true, status: 'pending', candidate_id: candidate.id });
  } catch (error) {
    console.error('initiate-background-check error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});