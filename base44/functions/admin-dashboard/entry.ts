import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'overview';

    // Approve / reject driver applications
    if (action === 'approve_driver' || action === 'reject_driver') {
      const { driver_id } = body;
      if (!driver_id) return Response.json({ error: 'driver_id is required' }, { status: 400 });
      const newStatus = action === 'approve_driver' ? 'approved' : 'rejected';
      const updated = await base44.asServiceRole.entities.DriverProfile.update(driver_id, { status: newStatus });
      return Response.json({ success: true, driver: updated });
    }

    // Update lead status
    if (action === 'update_lead_status') {
      const { lead_id, status } = body;
      if (!lead_id || !status) return Response.json({ error: 'lead_id and status are required' }, { status: 400 });
      const updatedLead = await base44.asServiceRole.entities.Lead.update(lead_id, { status });
      return Response.json({ success: true, lead: updatedLead });
    }

    // Fetch all pending payouts with driver + move details
    if (action === 'pending_payouts') {
      const [payouts, drivers, moves] = await Promise.all([
        base44.asServiceRole.entities.DriverPayout.filter({ status: 'pending' }, '-created_date', 500),
        base44.asServiceRole.entities.DriverProfile.list('-created_date', 500),
        base44.asServiceRole.entities.MoveRequest.list('-created_date', 500),
      ]);
      const driverMap = {};
      for (const d of drivers) driverMap[d.id] = d;
      const moveMap = {};
      for (const m of moves) moveMap[m.id] = m;

      const enriched = payouts.map((p) => ({
        id: p.id,
        amount: p.amount || 0,
        currency: p.currency || 'USD',
        driver_profile_id: p.driver_profile_id,
        move_request_id: p.move_request_id,
        driver_name: driverMap[p.driver_profile_id]?.full_name || 'Unknown',
        company_name: driverMap[p.driver_profile_id]?.company_name || null,
        pickup: moveMap[p.move_request_id]?.pickup_address || '',
        dropoff: moveMap[p.move_request_id]?.dropoff_address || '',
        move_date: moveMap[p.move_request_id]?.move_date || null,
        customer_name: moveMap[p.move_request_id]?.customer_name || '',
        bank_name: driverMap[p.driver_profile_id]?.bank_name || null,
        bank_account_type: driverMap[p.driver_profile_id]?.bank_account_type || null,
        bank_account_last4: driverMap[p.driver_profile_id]?.bank_account_last4 || null,
        bank_routing_number: driverMap[p.driver_profile_id]?.bank_routing_number || null,
      }));

      // Group totals by driver for convenience
      const byDriver = {};
      for (const p of enriched) {
        if (!byDriver[p.driver_profile_id]) {
          byDriver[p.driver_profile_id] = { driver_name: p.driver_name, company_name: p.company_name, count: 0, total: 0 };
        }
        byDriver[p.driver_profile_id].count += 1;
        byDriver[p.driver_profile_id].total += p.amount;
      }

      const grandTotal = enriched.reduce((s, p) => s + p.amount, 0);
      return Response.json({ payouts: enriched, byDriver: Object.values(byDriver), grandTotal, count: enriched.length });
    }

    // Bulk process payouts — mark selected pending payouts as paid
    if (action === 'bulk_payout') {
      const { payout_ids } = body;
      if (!Array.isArray(payout_ids) || payout_ids.length === 0) {
        return Response.json({ error: 'payout_ids array is required' }, { status: 400 });
      }
      const updated = await base44.asServiceRole.entities.DriverPayout.bulkUpdate(
        payout_ids.map((pid) => ({ id: pid, status: 'paid' }))
      );
      return Response.json({ success: true, processed: payout_ids.length, updated });
    }

    // Per-driver performance: total earnings + active jobs
    if (action === 'driver_performance') {
      const [drivers, moves, payouts] = await Promise.all([
        base44.asServiceRole.entities.DriverProfile.list('-created_date', 500),
        base44.asServiceRole.entities.MoveRequest.list('-created_date', 500),
        base44.asServiceRole.entities.DriverPayout.list('-created_date', 500),
      ]);

      const byDriver = {};
      for (const d of drivers) {
        byDriver[d.id] = {
          id: d.id,
          full_name: d.full_name,
          company_name: d.company_name || null,
          status: d.status,
          rating: d.rating || 0,
          active_jobs: 0,
          completed_jobs: 0,
          total_jobs: 0,
          total_earnings: 0,
          pending_payouts: 0,
        };
      }
      for (const m of moves) {
        const entry = m.assigned_driver_id ? byDriver[m.assigned_driver_id] : null;
        if (!entry) continue;
        entry.total_jobs += 1;
        if (['accepted', 'in_progress'].includes(m.status)) entry.active_jobs += 1;
        if (m.status === 'completed') entry.completed_jobs += 1;
      }
      for (const p of payouts) {
        const entry = p.driver_profile_id ? byDriver[p.driver_profile_id] : null;
        if (!entry) continue;
        entry.total_earnings += p.amount || 0;
        if (p.status === 'pending') entry.pending_payouts += p.amount || 0;
      }

      const driverStats = Object.values(byDriver).sort((a, b) => b.total_earnings - a.total_earnings);
      const totals = {
        totalEarnings: driverStats.reduce((s, d) => s + d.total_earnings, 0),
        pendingPayouts: driverStats.reduce((s, d) => s + d.pending_payouts, 0),
        activeJobs: driverStats.reduce((s, d) => s + d.active_jobs, 0),
        completedJobs: driverStats.reduce((s, d) => s + d.completed_jobs, 0),
      };
      return Response.json({ drivers: driverStats, totals });
    }

    // Overview — aggregate everything
    const [moves, drivers, payouts, trucks, users, leads] = await Promise.all([
      base44.asServiceRole.entities.MoveRequest.list('-created_date', 500),
      base44.asServiceRole.entities.DriverProfile.list('-created_date', 500),
      base44.asServiceRole.entities.DriverPayout.list('-created_date', 500),
      base44.asServiceRole.entities.Truck.list('-created_date', 500),
      base44.asServiceRole.entities.User.list('-created_date', 500),
      base44.asServiceRole.entities.Lead.list('-created_date', 50),
    ]);

    const revenue = moves.reduce((sum, m) => sum + (m.total_price || 0), 0);
    const collected = moves.filter((m) => m.paid).reduce((sum, m) => sum + (m.total_price || 0), 0);
    const pendingPayouts = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
    const paidPayouts = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);

    const movesByStatus = {
      pending: moves.filter((m) => m.status === 'pending').length,
      quoted: moves.filter((m) => m.status === 'quoted').length,
      accepted: moves.filter((m) => m.status === 'accepted').length,
      in_progress: moves.filter((m) => m.status === 'in_progress').length,
      completed: moves.filter((m) => m.status === 'completed').length,
      cancelled: moves.filter((m) => m.status === 'cancelled').length,
    };

    const pendingDrivers = drivers.filter((d) => d.status === 'pending_review');
    const approvedDrivers = drivers.filter((d) => d.status === 'approved');

    return Response.json({
      stats: {
        totalMoves: moves.length,
        totalRevenue: revenue,
        collectedRevenue: collected,
        pendingPayouts,
        paidPayouts,
        totalDrivers: drivers.length,
        pendingDrivers: pendingDrivers.length,
        approvedDrivers: approvedDrivers.length,
        totalTrucks: trucks.length,
        totalUsers: users.length,
      },
      movesByStatus,
      recentMoves: moves.slice(0, 10),
      pendingDrivers,
      recentPayouts: payouts.slice(0, 10),
      recentUsers: users.slice(0, 10),
      leads,
    });
  } catch (error) {
    console.error('admin-dashboard error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});