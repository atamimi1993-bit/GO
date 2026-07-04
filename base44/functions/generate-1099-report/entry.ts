import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Generates a 1099-style earnings report aggregating all paid driver payouts for a given year.
// Drivers earning $600+ in a calendar year require a 1099-NEC form.
// Admin-only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (authErr) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let trustedUser;
    try {
      trustedUser = await base44.entities.User.get(user.id);
    } catch {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
    if (!trustedUser || trustedUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const year = parseInt(body?.year) || new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    // Fetch all paid payouts — paginated to handle large datasets
    let allPayouts = [];
    let offset = 0;
    const pageSize = 500;
    while (true) {
      const batch = await base44.asServiceRole.entities.DriverPayout.filter(
        { status: 'paid' },
        '-created_date',
        pageSize,
        offset
      );
      if (!batch || batch.length === 0) break;
      allPayouts = allPayouts.concat(batch);
      if (batch.length < pageSize) break;
      offset += pageSize;
    }

    // Filter to the target year
    const yearPayouts = allPayouts.filter(p => {
      const d = new Date(p.created_date);
      return d >= yearStart && d <= yearEnd;
    });

    // Group by driver
    const byDriver = {};
    for (const p of yearPayouts) {
      const id = p.driver_profile_id;
      if (!id) continue;
      if (!byDriver[id]) {
        byDriver[id] = { total: 0, count: 0, currency: p.currency || 'USD' };
      }
      const net = (p.amount || 0) - (p.deduction_amount || 0);
      byDriver[id].total += net;
      byDriver[id].count += 1;
    }

    // Fetch driver profiles
    const driverIds = Object.keys(byDriver);
    const results = [];
    for (const id of driverIds) {
      let driverName = 'Unknown Driver';
      let driverEmail = '';
      let driverPhone = '';
      let stripeConnected = false;
      try {
        const driver = await base44.asServiceRole.entities.DriverProfile.get(id);
        driverName = driver?.full_name || 'Unknown Driver';
        driverEmail = driver?.email || '';
        driverPhone = driver?.phone || '';
        stripeConnected = !!driver?.stripe_account_id;
      } catch {}

      const earnings = Math.round(byDriver[id].total * 100) / 100;
      results.push({
        driver_id: id,
        driver_name: driverName,
        email: driverEmail,
        phone: driverPhone,
        total_earnings: earnings,
        payout_count: byDriver[id].count,
        currency: byDriver[id].currency,
        needs_1099: earnings >= 600,
        stripe_connected: stripeConnected,
      });
    }

    // Sort by earnings descending
    results.sort((a, b) => b.total_earnings - a.total_earnings);

    const totalEarnings = results.reduce((s, r) => s + r.total_earnings, 0);
    const needing1099 = results.filter(r => r.needs_1099).length;

    return Response.json({
      year,
      total_drivers: results.length,
      total_earnings: Math.round(totalEarnings * 100) / 100,
      drivers_needing_1099: needing1099,
      results,
    });
  } catch (error) {
    console.error('generate-1099-report error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});