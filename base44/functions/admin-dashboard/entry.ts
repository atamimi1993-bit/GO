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