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

    // Idempotency: if an en_route_to_dropoff notification ping already exists,
    // the customer was already notified — skip to prevent duplicate emails.
    const existingPings = await base44.asServiceRole.entities.LocationPing.filter({
      move_request_id: move_request_id,
      milestone: 'en_route_to_dropoff',
    });
    if (existingPings.length > 0) {
      return Response.json({ skipped: true, reason: 'Customer already notified — en route to dropoff ping exists' });
    }

    // Fetch latest ping as fallback for driver coordinates
    let lastPingForEta = null;
    try {
      const recentPings = await base44.asServiceRole.entities.LocationPing.filter(
        { move_request_id: move_request_id },
        '-created_date',
        1
      );
      lastPingForEta = recentPings && recentPings.length > 0 ? recentPings[0] : null;
    } catch (e) {
      console.error('Failed to fetch latest ping for ETA:', e.message);
    }

    const driverName = move.assigned_driver_name || driver.full_name || 'Your driver';
    const greeting = move.customer_name ? `Hi ${move.customer_name.split(' ')[0]},` : 'Hello,';

    // --- ETA calculation (best-effort) ---
    let driverLat = body.lat;
    let driverLng = body.lng;
    if ((!driverLat || !driverLng) && lastPingForEta) {
      driverLat = lastPingForEta.lat;
      driverLng = lastPingForEta.lng;
    }

    let etaText = '';
    if (driverLat && driverLng && move.dropoff_address) {
      try {
        // Geocode the dropoff address via Nominatim (free, no API key)
        const geoResp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(move.dropoff_address)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'GO-Movers/1.0' } }
        );
        const geoData = await geoResp.json();
        if (geoData && geoData.length > 0) {
          const destLat = parseFloat(geoData[0].lat);
          const destLng = parseFloat(geoData[0].lon);
          // Get drive time via OSRM (free, no API key)
          const routeResp = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${destLng},${destLat}?overview=false`
          );
          const routeData = await routeResp.json();
          if (routeData && routeData.routes && routeData.routes.length > 0) {
            const etaMins = Math.round(routeData.routes[0].duration / 60);
            const distMeters = routeData.routes[0].distance;
            const distMiles = (distMeters / 1609.34).toFixed(1);
            if (etaMins < 1) {
              etaText = `Estimated arrival: less than 1 minute (${distMiles} mi away)`;
            } else {
              etaText = `Estimated arrival: approximately ${etaMins} minute${etaMins !== 1 ? 's' : ''} (${distMiles} mi away)`;
            }
          }
        }
      } catch (etaErr) {
        console.error('ETA calculation failed (non-blocking):', etaErr.message);
      }
    }

    const detailRows = [
      move.pickup_address ? ['Pickup', move.pickup_address] : null,
      move.dropoff_address ? ['Drop-off', move.dropoff_address] : null,
      ['Driver', driverName],
      etaText ? ['ETA', etaText] : null,
    ].filter(Boolean);

    const etaBanner = etaText
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#166534;font-weight:600;">📍 ${etaText}</p></div>`
      : '';

    const htmlBody = [
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
      `<p>${greeting}</p>`,
      `<h2 style="margin:8px 0 4px;color:#16a34a;">Your items are on the way to drop-off! 📦🚚</h2>`,
      `<p style="color:#4b5563;">Great news — <strong>${driverName}</strong> has picked up your items and is now heading to your drop-off location. You can track their live location in real time from your dashboard.</p>`,
      etaBanner,
      `<table style="width:100%;border-collapse:collapse;margin:20px 0;">${detailRows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;width:120px;">${label}</td><td style="padding:8px 0;">${value}</td></tr>`
        )
        .join('')}</table>`,
      `<p style="margin-top:24px;color:#4b5563;">Open your app and tap "Track Live Location" to see exactly where your driver is.</p>`,
      `</div>`,
    ].join('\n');

    const plainBody = `${greeting}\n\nYour items are on the way to drop-off! 📦🚚\n${driverName} has picked up your items and is heading to your drop-off location.${etaText ? '\n' + etaText : ''}\nTrack their live location from your dashboard.\n\n${detailRows
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n')}`;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: move.customer_email,
        subject: `Your items are on the way to drop-off! 📦 — ${move.dropoff_address || 'Delivery'}`,
        body: htmlBody,
      });
    } catch (err) {
      console.error(`Failed to email customer ${move.customer_email}:`, err.message);
      return Response.json({ sent: false, error: err.message }, { status: 500 });
    }

    // In-app push notification
    try {
      await base44.asServiceRole.entities.AppNotification.create({
        user_email: move.customer_email,
        title: 'Your items are on the way to drop-off! 📦',
        body: `${driverName} has picked up your items and is heading to your drop-off location. Tap to track their live location.`,
        type: 'job',
        read: false,
        link: move.id ? `/move/${move.id}` : null,
        icon: 'truck',
      });
    } catch (notifErr) {
      console.error('Failed to create in-app dropoff notification:', notifErr.message);
    }

    return Response.json({ sent: true, to: move.customer_email });
  } catch (error) {
    console.error('notify-customer-en-route-dropoff error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});