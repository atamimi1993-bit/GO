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