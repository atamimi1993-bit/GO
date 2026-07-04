import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require authentication
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Verify the caller is the assigned driver
    const driverProfiles = await base44.asServiceRole.entities.DriverProfile.filter({
      email: user.email,
    });
    if (!driverProfiles || driverProfiles.length === 0) {
      return Response.json({ error: 'Driver profile not found' }, { status: 403 });
    }
    const driver = driverProfiles[0];

    if (move.assigned_driver_id !== driver.id) {
      return Response.json({ error: 'You are not assigned to this move' }, { status: 403 });
    }

    // Idempotency: if an en_route_to_pickup ping already exists, the customer
    // was already notified — skip to prevent duplicate emails on restarts.
    const existingPings = await base44.asServiceRole.entities.LocationPing.filter({
      move_request_id: move_request_id,
      milestone: 'en_route_to_pickup',
    });
    if (existingPings.length > 0) {
      return Response.json({ skipped: true, reason: 'Customer already notified — on the way ping exists' });
    }

    const driverName = move.assigned_driver_name || driver.full_name || 'Your driver';
    const greeting = move.customer_name ? `Hi ${move.customer_name.split(' ')[0]},` : 'Hello,';

    const detailRows = [
      move.pickup_address ? ['Pickup', move.pickup_address] : null,
      move.dropoff_address ? ['Drop-off', move.dropoff_address] : null,
      ['Driver', driverName],
    ].filter(Boolean);

    const htmlBody = [
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
      `<p>${greeting}</p>`,
      `<h2 style="margin:8px 0 4px;color:#16a34a;">Your driver is on the way! 🚚</h2>`,
      `<p style="color:#4b5563;">Great news — <strong>${driverName}</strong> has started heading to your pickup location. You can track their live location in real time from your dashboard.</p>`,
      `<table style="width:100%;border-collapse:collapse;margin:20px 0;">${detailRows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;width:120px;">${label}</td><td style="padding:8px 0;">${value}</td></tr>`
        )
        .join('')}</table>`,
      `<p style="margin-top:24px;color:#4b5563;">Open your app and tap "Track Live Location" to see exactly where your driver is.</p>`,
      `</div>`,
    ].join('\n');

    const plainBody = `${greeting}\n\nYour driver is on the way! 🚚\n${driverName} has started heading to your pickup location. Track their live location from your dashboard.\n\n${detailRows
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n')}`;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: move.customer_email,
        subject: `Your driver is on the way! 🚚 — ${move.pickup_address || 'Pickup'}`,
        body: htmlBody,
      });
    } catch (err) {
      console.error(`Failed to email customer ${move.customer_email}:`, err.message);
      return Response.json({ sent: false, error: err.message }, { status: 500 });
    }

    // In-app push notification so the customer sees it immediately
    try {
      await base44.asServiceRole.entities.AppNotification.create({
        user_email: move.customer_email,
        title: 'Your driver is on the way! 🚚',
        body: `${driverName} has started heading to your pickup location. Tap to track their live location.`,
        type: 'job',
        read: false,
        link: move.id ? `/move/${move.id}` : null,
        icon: 'truck',
      });
    } catch (notifErr) {
      console.error('Failed to create in-app on-the-way notification:', notifErr.message);
    }

    return Response.json({ sent: true, to: move.customer_email });
  } catch (error) {
    console.error('notify-customer-on-the-way error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});