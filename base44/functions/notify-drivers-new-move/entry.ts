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

    // Only notify for new/quotable moves
    if (!['pending', 'quoted'].includes(move.status)) {
      return Response.json({ skipped: true, reason: `status is ${move.status}` });
    }

    // Find approved, available drivers whose service_area matches the pickup state
    const drivers = await base44.asServiceRole.entities.DriverProfile.list('-created_date', 500);
    const pickupState = (move.pickup_state || '').trim().toLowerCase();

    const matched = drivers.filter((d) => {
      if (d.status !== 'approved' || d.available === false) return false;
      if (!pickupState || !d.service_area) return false;
      const area = d.service_area.toLowerCase();
      return area.includes(pickupState) || pickupState.includes(area);
    });

    if (matched.length === 0) {
      return Response.json({ notified: 0, reason: 'No matching drivers' });
    }

    const moveDate = move.move_date
      ? new Date(move.move_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : 'TBD';
    const moveTime = move.move_time || 'Flexible';

    const subject = `New Move Available: ${move.pickup_address || 'Pickup'} on ${moveDate}`;
    const htmlBody = [
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
      `<p>A new move request matching your service area is now available.</p>`,
      `<table style="width:100%;border-collapse:collapse;margin:16px 0;">`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;width:120px;">Move Date</td><td style="padding:8px 0;">${moveDate}</td></tr>`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Move Time</td><td style="padding:8px 0;">${moveTime}</td></tr>`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Pickup</td><td style="padding:8px 0;">${move.pickup_address || 'N/A'}</td></tr>`,
      `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Drop-off</td><td style="padding:8px 0;">${move.dropoff_address || 'N/A'}</td></tr>`,
      move.items_summary ? `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Items</td><td style="padding:8px 0;">${move.items_summary}</td></tr>` : '',
      move.total_weight_lbs ? `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Total Weight</td><td style="padding:8px 0;">${move.total_weight_lbs} lbs</td></tr>` : '',
      move.truck_size_needed ? `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Truck Size</td><td style="padding:8px 0;">${move.truck_size_needed}</td></tr>` : '',
      `</table>`,
      `<p style="margin-top:24px;">Log in to your driver dashboard to <strong>accept this job</strong> before someone else does.</p>`,
      `</div>`,
    ].join('\n');

    const results = [];
    for (const driver of matched) {
      if (!driver.email) continue;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: driver.email,
          subject,
          body: htmlBody,
        });
        results.push({ driver_id: driver.id, email: driver.email, sent: true });
      } catch (err) {
        console.error(`Failed to email driver ${driver.id}:`, err.message);
        results.push({ driver_id: driver.id, email: driver.email, sent: false, error: err.message });
      }
    }

    return Response.json({ notified: results.filter((r) => r.sent).length, results });
  } catch (error) {
    console.error('notify-drivers-new-move error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});