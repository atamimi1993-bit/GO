import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { move_request_id } = body;
    if (!move_request_id) {
      return Response.json({ error: 'move_request_id is required' }, { status: 400 });
    }

    const move = await base44.asServiceRole.entities.MoveRequest.get(move_request_id);
    if (!move) {
      return Response.json({ error: 'Move request not found' }, { status: 404 });
    }

    if (!move.assigned_driver_id) {
      return Response.json({ skipped: true, reason: 'No driver assigned' });
    }

    const drivers = await base44.asServiceRole.entities.DriverProfile.filter({ id: move.assigned_driver_id });
    const driver = drivers[0];
    if (!driver || !driver.email) {
      return Response.json({ skipped: true, reason: 'Driver email not found' });
    }

    const moveDate = move.move_date
      ? new Date(move.move_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'N/A';

    const greeting = driver.full_name ? `Hi ${driver.full_name.split(' ')[0]},` : 'Hello,';

    const htmlBody = [
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
      `<p>${greeting}</p>`,
      `<h2 style="margin:8px 0 4px;color:#dc2626;">Move Cancelled</h2>`,
      `<p style="color:#4b5563;">A move assigned to you has been cancelled by the customer${move.cancellation_fee_paid ? ' — a cancellation fee was charged' : ''}.</p>`,
      `<table style="width:100%;border-collapse:collapse;margin:20px 0;">`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;width:120px;">Customer</td><td style="padding:8px 0;">${move.customer_name || 'N/A'}</td></tr>`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Move Date</td><td style="padding:8px 0;">${moveDate}</td></tr>`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Pickup</td><td style="padding:8px 0;">${move.pickup_address || 'N/A'}</td></tr>`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Drop-off</td><td style="padding:8px 0;">${move.dropoff_address || 'N/A'}</td></tr>`,
      move.cancellation_fee_paid ? `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Fee Collected</td><td style="padding:8px 0;color:#16a34a;font-weight:bold;">$${move.cancellation_fee || 250}</td></tr>` : '',
      `</table>`,
      `<p style="margin-top:24px;color:#4b5563;">This job is no longer active. Check your dashboard for other available jobs.</p>`,
      `</div>`,
    ].join('\n');

    const plainBody = `${greeting}\n\nMove Cancelled\n\nA move assigned to you has been cancelled${move.cancellation_fee_paid ? ' — a cancellation fee was charged' : ''}.\n\nCustomer: ${move.customer_name || 'N/A'}\nMove Date: ${moveDate}\nPickup: ${move.pickup_address || 'N/A'}\nDrop-off: ${move.dropoff_address || 'N/A'}`;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: driver.email,
        subject: `Move Cancelled: ${move.pickup_address || 'Pickup'}`,
        body: htmlBody,
      });
    } catch (err) {
      console.error(`Failed to email driver ${driver.email}:`, err.message);
      return Response.json({ sent: false, error: err.message }, { status: 500 });
    }

    return Response.json({ sent: true, to: driver.email });
  } catch (error) {
    console.error('notify-driver-cancellation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});