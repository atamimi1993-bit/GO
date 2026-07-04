import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Generate a certificate number from the move ID and current date
function generateCertNumber(moveId) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const shortId = (moveId || '').slice(-6).toUpperCase();
  return `GO-INS-${datePart}-${shortId}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require authentication — admin or workflow (service-role) invocation
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { move_request_id } = body;
    if (!move_request_id) {
      return Response.json({ error: 'move_request_id is required' }, { status: 400 });
    }

    const move = await base44.asServiceRole.entities.MoveRequest.get(move_request_id);
    if (!move) {
      return Response.json({ error: 'Move request not found' }, { status: 404 });
    }

    if (!move.customer_email) {
      return Response.json({ skipped: true, reason: 'No customer email on file' });
    }

    // Fetch assigned driver for certificate details
    let driver = null;
    if (move.assigned_driver_id) {
      try {
        driver = await base44.asServiceRole.entities.DriverProfile.get(move.assigned_driver_id);
      } catch (e) {
        console.error('Failed to fetch driver for certificate:', e.message);
      }
    }

    const certNumber = generateCertNumber(move.id);
    const issueDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    const moveDate = move.move_date
      ? new Date(move.move_date).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
      : 'TBD';

    const customerName = escapeHtml(move.customer_name || 'Valued Customer');
    const greeting = move.customer_name
      ? `Hi ${escapeHtml(move.customer_name.split(' ')[0])},`
      : 'Hello,';

    const coverageAmount = '$0.60 per pound per article';
    const totalWeight = move.total_weight_lbs
      ? `${move.total_weight_lbs.toLocaleString()} lbs`
      : 'Standard household goods';

    const detailRows = [
      ['Certificate Number', escapeHtml(certNumber)],
      ['Issue Date', escapeHtml(issueDate)],
      ['Customer', customerName],
      ['Move Date', escapeHtml(moveDate)],
      move.move_time ? ['Move Time', escapeHtml(move.move_time)] : null,
      ['Pickup Address', escapeHtml(move.pickup_address)],
      ['Drop-off Address', escapeHtml(move.dropoff_address)],
      move.assigned_driver_name ? ['Assigned Driver', escapeHtml(move.assigned_driver_name)] : null,
      driver?.license_number ? ['Driver License #', escapeHtml(driver.license_number)] : null,
      ['Total Weight', escapeHtml(totalWeight)],
      ['Coverage Level', escapeHtml(coverageAmount)],
    ].filter(Boolean);

    const detailRowsHtml = detailRows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 0;font-weight:600;color:#6b7280;width:180px;">${label}</td><td style="padding:6px 0;color:#1f2937;">${value}</td></tr>`
      )
      .join('');

    const subject = `Insurance Certificate ${certNumber} — Your Move is Protected`;

    const htmlBody = [
      `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">`,
      // Header with shield
      `<div style="background:#16a34a;padding:28px 20px;border-radius:12px 12px 0 0;text-align:center;">`,
      `<div style="font-size:36px;margin-bottom:4px;">🛡️</div>`,
      `<h1 style="color:#fff;margin:0;font-size:22px;">Certificate of Insurance</h1>`,
      `<p style="color:#dcfce7;margin:4px 0 0;font-size:13px;">Your move is covered and protected</p>`,
      `</div>`,
      // Body
      `<div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px 20px;">`,
      `<p>${greeting}</p>`,
      `<p style="color:#4b5563;">Your move has been confirmed and is now protected under our insurance coverage. This certificate serves as your official proof of coverage for the move described below. Please keep this email for your records.</p>`,
      // Certificate details table
      `<div style="margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">${detailRowsHtml}</table>
      </div>`,
      // Coverage box
      `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <h3 style="margin:0 0 8px;font-size:14px;color:#166534;">Coverage Summary</h3>
        <p style="margin:0;font-size:13px;color:#166534;line-height:1.5;">
          <strong>Released Value Protection:</strong> ${escapeHtml(coverageAmount)} is included at no additional cost. This is the minimum coverage required by federal law for interstate moves. The mover assumes liability for the value of goods at this rate unless you purchase additional coverage.
        </p>
      </div>`,
      // Terms note
      `<div style="margin:16px 0;">
        <h3 style="margin:0 0 4px;font-size:14px;color:#374151;">Terms & Conditions</h3>
        <p style="font-size:12px;color:#6b7280;line-height:1.6;">
          This certificate is issued upon confirmation of your move booking. Coverage is effective from the time items are loaded until delivered to the drop-off address. Claims for loss or damage must be filed within 30 days of delivery. For full terms, please refer to your service agreement or contact support.
        </p>
      </div>`,
      `<p style="margin-top:24px;font-size:12px;color:#6b7280;text-align:center;border-top:1px solid #e5e7eb;padding-top:16px;">
        Certificate ID: ${escapeHtml(certNumber)}<br>
        This is an automated email. Please keep it for your records.
      </p>`,
      `</div>`,
      `</div>`,
    ].join('\n');

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: move.customer_email,
        subject,
        body: htmlBody,
      });
    } catch (err) {
      console.error(`Failed to email certificate to ${move.customer_email}:`, err.message);
      return Response.json({ sent: false, error: err.message }, { status: 500 });
    }

    return Response.json({
      sent: true,
      to: move.customer_email,
      certificate_number: certNumber,
      move_id: move.id,
    });
  } catch (error) {
    console.error('send-insurance-certificate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});