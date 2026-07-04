import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch (authErr) {
      console.error('notify-admin-damage auth failed:', authErr.message);
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { damage_report_id } = body;
    if (!damage_report_id) {
      return Response.json({ error: 'damage_report_id is required' }, { status: 400 });
    }

    const report = await base44.asServiceRole.entities.DamageReport.get(damage_report_id);
    if (!report) {
      return Response.json({ error: 'Damage report not found' }, { status: 404 });
    }

    const move = report.move_request_id
      ? await base44.asServiceRole.entities.MoveRequest.get(report.move_request_id)
      : null;

    const reportType = report.report_type === 'lost' ? 'Lost Item' : 'Damaged Item';
    const submittedDate = new Date(report.created_date).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const subject = `⚠️ ${reportType} Report: ${report.item_name} — Move ${report.move_request_id?.slice(-8) || 'N/A'}`;

    const rows = [
      ['Report ID', report.id],
      ['Move ID', report.move_request_id || 'N/A'],
      ['Report Type', reportType],
      ['Item Name', report.item_name],
      ['Customer', report.customer_name || 'N/A'],
      ['Customer Email', report.customer_email || 'N/A'],
      ['Driver', report.driver_name || 'N/A'],
      ['Claimed Value', `$${(report.claimed_value || 0).toFixed(2)}`],
      ['Submitted', submittedDate],
      ['Status', report.status],
      move ? ['Pickup', move.pickup_address || 'N/A'] : null,
      move ? ['Drop-off', move.dropoff_address || 'N/A'] : null,
      move ? ['Move Date', move.move_date || 'N/A'] : null,
    ].filter(Boolean);

    const evidenceLink = report.evidence_photo_url
      ? `<p style="margin-top:16px;"><a href="${report.evidence_photo_url}" target="_blank" style="color:#2563eb;font-weight:bold;">📎 View Evidence Photo</a></p>`
      : '<p style="margin-top:16px;color:#6b7280;">No evidence photo attached.</p>';

    const htmlBody = [
      `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">`,
      `<h2 style="color:#dc2626;">${reportType} Report — Review Required</h2>`,
      `<p style="color:#4b5563;">A customer has submitted a ${reportType.toLowerCase()} report that requires admin review before processing.</p>`,
      `<table style="width:100%;border-collapse:collapse;margin:16px 0;">`,
      ...rows.map(
        ([label, value]) =>
          `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;width:160px;">${label}</td><td style="padding:8px 0;">${value}</td></tr>`
      ),
      `</table>`,
      `<div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="font-weight:bold;margin:0 0 8px;color:#374151;">Description:</p>
        <p style="margin:0;color:#4b5563;white-space:pre-wrap;">${report.description || 'No description provided.'}</p>
      </div>`,
      evidenceLink,
      `<p style="margin-top:24px;font-size:13px;color:#6b7280;">Review this report in the admin dashboard and update the status once resolved.</p>`,
      `</div>`,
    ].join('\n');

    const plainBody = `${reportType} Report — Review Required\n\n${rows
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n')}\n\nDescription: ${report.description || 'N/A'}\n\nEvidence: ${report.evidence_photo_url || 'None'}`;

    const notified = [];
    const skipped = [];

    // Notify all admin users
    const admins = await base44.asServiceRole.entities.User.list('-created_date', 100);
    for (const admin of admins) {
      if (admin.role !== 'admin' || !admin.email) {
        skipped.push(admin.id);
        continue;
      }
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject,
          body: htmlBody,
        });
        notified.push(admin.email);
      } catch (err) {
        console.error(`Failed to email admin ${admin.email}:`, err.message);
        skipped.push(admin.id);
      }
    }

    // Mark as under_review
    await base44.asServiceRole.entities.DamageReport.update(damage_report_id, { status: 'under_review' });

    return Response.json({
      success: true,
      notified_admins: notified,
      skipped,
      report_id: damage_report_id,
    });
  } catch (error) {
    console.error('notify-admin-damage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});