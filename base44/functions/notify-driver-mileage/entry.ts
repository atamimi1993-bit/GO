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
      return Response.json({ skipped: true, reason: 'No driver assigned to this move' });
    }

    // Check if a route log already exists for this move — skip reminder if so
    const existingLogs = await base44.asServiceRole.entities.RouteLog.filter({ move_request_id: move_request_id });
    if (existingLogs.length > 0) {
      return Response.json({ skipped: true, reason: 'Route log already submitted for this move' });
    }

    // Get the driver's profile for email
    const driver = await base44.asServiceRole.entities.DriverProfile.get(move.assigned_driver_id);
    if (!driver || !driver.email) {
      return Response.json({ skipped: true, reason: 'Driver profile or email not found' });
    }

    const moveDate = move.move_date
      ? new Date(move.move_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'N/A';

    const subject = `Mileage Reminder: Log your route for ${move.pickup_address || 'pickup'} → ${move.dropoff_address || 'dropoff'}`;
    const htmlBody = [
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
      `<p>Hi ${driver.full_name?.split(' ')[0] || 'Driver'},</p>`,
      `<h2 style="margin:8px 0 4px;color:#16a34a;">Please log your mileage</h2>`,
      `<p style="color:#4b5563;">Your move has been marked as complete. To ensure accurate records and timely payouts, please log your actual mileage and route details now.</p>`,
      `<table style="width:100%;border-collapse:collapse;margin:20px 0;">`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;width:120px;">Move Date</td><td style="padding:8px 0;">${moveDate}</td></tr>`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Pickup</td><td style="padding:8px 0;">${move.pickup_address || 'N/A'}</td></tr>`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Drop-off</td><td style="padding:8px 0;">${move.dropoff_address || 'N/A'}</td></tr>`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Estimated Distance</td><td style="padding:8px 0;">${move.distance_miles || 0} ${move.distance_unit || 'mi'}</td></tr>`,
      `</table>`,
      `<p style="margin-top:24px;color:#4b5563;">Log in to your driver dashboard, open the completed move, and submit your actual mileage and time log. This only takes a minute and keeps your earnings records accurate.</p>`,
      `</div>`,
    ].join('\n');

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: driver.email,
        subject,
        body: htmlBody,
      });
    } catch (err) {
      console.error(`Failed to email driver ${driver.email}:`, err.message);
      return Response.json({ sent: false, error: err.message }, { status: 500 });
    }

    return Response.json({ sent: true, to: driver.email, move_request_id });
  } catch (error) {
    console.error('notify-driver-mileage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});