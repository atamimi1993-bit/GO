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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require authentication — this is not a public checkout endpoint
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const {
      owner_email,
      renter_name,
      renter_email,
      renter_phone,
      requested_start_date,
      requested_end_date,
      message,
      vehicle_title,
    } = body;

    if (!owner_email) {
      return Response.json({ error: 'Missing owner_email' }, { status: 400 });
    }

    // Verify the caller is the renter submitting the request
    if (renter_email && renter_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'You can only submit rental requests on your own behalf' }, { status: 403 });
    }

    const safeVehicleTitle = escapeHtml(vehicle_title || 'Your listing');
    const safeRenterName = escapeHtml(renter_name || 'N/A');
    const safeRenterEmail = escapeHtml(renter_email || 'N/A');
    const safeRenterPhone = escapeHtml(renter_phone);
    const safeStartDate = escapeHtml(requested_start_date);
    const safeEndDate = escapeHtml(requested_end_date);
    const safeMessage = escapeHtml(message);

    const subject = `New rental request for your ${vehicle_title || 'vehicle'}`;
    const bodyHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">You have a new rental request!</h2>
        <p><strong>Vehicle:</strong> ${safeVehicleTitle}</p>
        <p><strong>Renter:</strong> ${safeRenterName}</p>
        <p><strong>Email:</strong> ${safeRenterEmail}</p>
        ${safeRenterPhone ? `<p><strong>Phone:</strong> ${safeRenterPhone}</p>` : ''}
        <p><strong>Requested dates:</strong> ${safeStartDate} to ${safeEndDate}</p>
        ${safeMessage ? `<p><strong>Message:</strong><br>${safeMessage}</p>` : ''}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">Log in to your GO account to review this request and send a quote.</p>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      to: owner_email,
      subject,
      body: bodyHtml,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('notify-rental-request error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});