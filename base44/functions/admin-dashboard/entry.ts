import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch (authErr) {
      console.error('admin-dashboard auth failed:', authErr.message);
      return Response.json({ error: 'Authentication required', code: 'AUTH_FAILED' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify admin role against the trusted server-stored User record — do not
    // rely solely on the decrypted token context, which could be manipulated.
    let trustedUser;
    try {
      trustedUser = await base44.entities.User.get(user.id);
    } catch (lookupErr) {
      console.error('admin-dashboard user lookup failed:', lookupErr.message);
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
    if (!trustedUser || trustedUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'overview';

    // Whitelist of allowed actions to prevent unexpected code paths
    const ALLOWED_ACTIONS = [
      'overview', 'approve_driver', 'reject_driver', 'update_lead_status',
      'pending_payouts', 'export_payouts', 'bulk_payout', 'driver_performance', 'financials', 'weekly_growth', 'export_financials', 'metrics_overview',
    ];
    if (!ALLOWED_ACTIONS.includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

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

    // Export all payouts (enriched with driver + move details) for spreadsheet use
    if (action === 'export_payouts') {
      const { status_filter } = body;
      const query = status_filter ? { status: status_filter } : {};
      const [payouts, drivers, moves] = await Promise.all([
        base44.asServiceRole.entities.DriverPayout.filter(query, '-created_date', 500),
        base44.asServiceRole.entities.DriverProfile.list('-created_date', 500),
        base44.asServiceRole.entities.MoveRequest.list('-created_date', 500),
      ]);
      const driverMap = {};
      for (const d of drivers) driverMap[d.id] = d;
      const moveMap = {};
      for (const m of moves) moveMap[m.id] = m;

      const enriched = payouts.map((p) => {
        const driver = driverMap[p.driver_profile_id];
        const move = moveMap[p.move_request_id];
        return {
          payout_id: p.id,
          created_date: p.created_date,
          amount: p.amount || 0,
          currency: p.currency || 'USD',
          status: p.status,
          deduction_amount: p.deduction_amount || 0,
          deduction_reason: p.deduction_reason || '',
          notes: p.notes || '',
          driver_name: driver?.full_name || 'Unknown',
          company_name: driver?.company_name || '',
          bank_name: driver?.bank_name || '',
          bank_account_type: driver?.bank_account_type || '',
          bank_account_last4: driver?.bank_account_last4 || '',
          move_date: move?.move_date || '',
          customer_name: move?.customer_name || '',
          pickup_address: move?.pickup_address || '',
          dropoff_address: move?.dropoff_address || '',
          job_type: move?.job_type || '',
        };
      });

      return Response.json({ payouts: enriched, count: enriched.length });
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

      // Count ratings received per driver (customer_to_driver direction)
      const ratings = await base44.asServiceRole.entities.Rating.filter({ direction: 'customer_to_driver' }, '-created_date', 500);
      for (const r of ratings) {
        const entry = r.ratee_id ? byDriver[r.ratee_id] : null;
        if (!entry) continue;
        entry.total_ratings = (entry.total_ratings || 0) + 1;
      }

      const driverStats = Object.values(byDriver)
        .map((d) => ({ ...d, total_ratings: d.total_ratings || 0 }))
        .sort((a, b) => b.total_earnings - a.total_earnings);
      const totals = {
        totalEarnings: driverStats.reduce((s, d) => s + d.total_earnings, 0),
        pendingPayouts: driverStats.reduce((s, d) => s + d.pending_payouts, 0),
        activeJobs: driverStats.reduce((s, d) => s + d.active_jobs, 0),
        completedJobs: driverStats.reduce((s, d) => s + d.completed_jobs, 0),
      };
      return Response.json({ drivers: driverStats, totals });
    }

    // Financial dashboard — monthly time series of platform earnings, app fee income, and driver payouts
    if (action === 'financials') {
      const [allMoves, allPayouts] = await Promise.all([
        base44.asServiceRole.entities.MoveRequest.list('-created_date', 500),
        base44.asServiceRole.entities.DriverPayout.list('-created_date', 500),
      ]);

      const completedMoves = allMoves.filter((m) => m.status === 'completed' && (m.total_price || 0) > 0);
      const cancelledMoves = allMoves.filter((m) => m.status === 'cancelled' && (m.cancellation_fee || 0) > 0 && m.cancellation_fee_paid);
      const validPayouts = allPayouts.filter((p) => (p.amount || 0) > 0);

      const monthKey = (iso) => {
        if (!iso) return null;
        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      };

      const months = {};

      const ensureMonth = (key) => {
        if (!key) return;
        if (!months[key]) {
          months[key] = { month: key, platform_earnings: 0, app_fee_income: 0, driver_payouts: 0, cancellation_revenue: 0 };
        }
      };

      for (const m of completedMoves) {
        const key = monthKey(m.move_date || m.created_date);
        if (!key) continue;
        ensureMonth(key);
        months[key].platform_earnings += m.total_price || 0;
        months[key].app_fee_income += m.app_fee || (m.total_price || 0) * 0.25;
      }

      for (const c of cancelledMoves) {
        const key = monthKey(c.move_date || c.created_date);
        if (!key) continue;
        ensureMonth(key);
        months[key].cancellation_revenue += c.cancellation_fee || 0;
      }

      for (const p of validPayouts) {
        const key = monthKey(p.created_date);
        if (!key) continue;
        ensureMonth(key);
        months[key].driver_payouts += p.amount || 0;
      }

      const series = Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
      const totals = {
        platformEarnings: series.reduce((s, r) => s + r.platform_earnings, 0),
        appFeeIncome: series.reduce((s, r) => s + r.app_fee_income, 0),
        driverPayouts: series.reduce((s, r) => s + r.driver_payouts, 0),
        cancellationRevenue: series.reduce((s, r) => s + r.cancellation_revenue, 0),
      };
      return Response.json({ series, totals });
    }

    // Metrics overview — completed moves per month, top driver regions, total move-fee revenue
    if (action === 'metrics_overview') {
      const [allMoves, allDrivers] = await Promise.all([
        base44.asServiceRole.entities.MoveRequest.list('-created_date', 500),
        base44.asServiceRole.entities.DriverProfile.list('-created_date', 500),
      ]);

      const driverMap = {};
      for (const d of allDrivers) driverMap[d.id] = d;

      const monthKey = (iso) => {
        if (!iso) return null;
        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      };

      // Monthly completed moves + move-fee revenue
      const months = {};
      const ensureMonth = (key) => {
        if (!key) return;
        if (!months[key]) months[key] = { month: key, completed_moves: 0, move_fee_revenue: 0, total_revenue: 0 };
      };

      for (const m of allMoves) {
        if (m.status !== 'completed') continue;
        const key = monthKey(m.move_date || m.created_date);
        if (!key) continue;
        ensureMonth(key);
        months[key].completed_moves += 1;
        months[key].move_fee_revenue += m.app_fee || (m.total_price || 0) * 0.25;
        months[key].total_revenue += m.total_price || 0;
      }

      const monthlySeries = Object.values(months).sort((a, b) => a.month.localeCompare(b.month));

      // Top driver regions by completed moves and revenue
      const regions = {};
      for (const m of allMoves) {
        if (m.status !== 'completed' || !m.assigned_driver_id) continue;
        const driver = driverMap[m.assigned_driver_id];
        const region = driver?.service_area || 'Unknown';
        if (!regions[region]) regions[region] = { region, completed_moves: 0, revenue: 0, move_fee_revenue: 0, driver_count: new Set() };
        regions[region].completed_moves += 1;
        regions[region].revenue += m.total_price || 0;
        regions[region].move_fee_revenue += m.app_fee || (m.total_price || 0) * 0.25;
        if (driver) regions[region].driver_count.add(driver.id);
      }

      const topRegions = Object.values(regions)
        .map((r) => ({ ...r, driver_count: r.driver_count.size }))
        .sort((a, b) => b.completed_moves - a.completed_moves)
        .slice(0, 10);

      const totals = {
        totalCompletedMoves: monthlySeries.reduce((s, r) => s + r.completed_moves, 0),
        totalMoveFeeRevenue: monthlySeries.reduce((s, r) => s + r.move_fee_revenue, 0),
        totalRevenue: monthlySeries.reduce((s, r) => s + r.total_revenue, 0),
      };

      return Response.json({ monthlySeries, topRegions, totals });
    }

    // Export all moves with financial details for spreadsheet use
    if (action === 'export_financials') {
      const [allMoves, allPayouts, drivers] = await Promise.all([
        base44.asServiceRole.entities.MoveRequest.list('-created_date', 500),
        base44.asServiceRole.entities.DriverPayout.list('-created_date', 500),
        base44.asServiceRole.entities.DriverProfile.list('-created_date', 500),
      ]);
      const driverMap = {};
      for (const d of drivers) driverMap[d.id] = d;

      const movesExport = allMoves.map((m) => {
        const driver = m.assigned_driver_id ? driverMap[m.assigned_driver_id] : null;
        const movePayouts = allPayouts.filter((p) => p.move_request_id === m.id);
        const driverPayoutTotal = movePayouts.reduce((s, p) => s + (p.amount || 0), 0);
        return {
          move_id: m.id,
          created_date: m.created_date,
          move_date: m.move_date || '',
          status: m.status,
          job_type: m.job_type || '',
          customer_name: m.customer_name || '',
          customer_email: m.customer_email || '',
          pickup_address: m.pickup_address || '',
          dropoff_address: m.dropoff_address || '',
          distance_miles: m.distance_miles || 0,
          total_weight_lbs: m.total_weight_lbs || 0,
          service_level: m.service_level || '',
          truck_size_needed: m.truck_size_needed || '',
          assigned_driver: driver?.full_name || '',
          driver_company: driver?.company_name || '',
          base_cost: m.base_cost || 0,
          fuel_cost: m.fuel_cost || 0,
          tolls: m.tolls || 0,
          bulky_item_fee: m.bulky_item_fee || 0,
          materials_fee: m.materials_fee || 0,
          carrying_fee: m.carrying_fee || 0,
          extra_service_fee: m.extra_service_fee || 0,
          tax_amount: m.tax_amount || 0,
          app_fee: m.app_fee || 0,
          total_price: m.total_price || 0,
          driver_payout: m.driver_payout || driverPayoutTotal,
          payment_option: m.payment_option || '',
          paid: m.paid || false,
          deposit_paid: m.deposit_paid || false,
          tip_amount: m.tip_amount || 0,
          discount_amount: m.discount_amount || 0,
          promo_code: m.promo_code || '',
          cancellation_fee: m.cancellation_fee || 0,
          needs_storage: m.needs_storage || false,
          storage_days: m.storage_days || 0,
        };
      });

      return Response.json({ moves: movesExport, count: movesExport.length });
    }

    // Weekly growth — 12-week time series of earnings, active moves, and driver signups
    if (action === 'weekly_growth') {
      const [allMoves, allPayouts, allDrivers] = await Promise.all([
        base44.asServiceRole.entities.MoveRequest.list('-created_date', 500),
        base44.asServiceRole.entities.DriverPayout.list('-created_date', 500),
        base44.asServiceRole.entities.DriverProfile.list('-created_date', 500),
      ]);

      const getWeekStart = (iso) => {
        if (!iso) return null;
        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        const day = d.getUTCDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setUTCDate(d.getUTCDate() + diff);
        d.setUTCHours(0, 0, 0, 0);
        return d.toISOString().split('T')[0];
      };

      // Build the last 12 weeks (including the current week)
      const now = new Date();
      const currentDay = now.getUTCDay();
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      thisMonday.setUTCDate(thisMonday.getUTCDate() + mondayOffset);

      const weekKeys = [];
      for (let i = 11; i >= 0; i--) {
        const ws = new Date(thisMonday);
        ws.setUTCDate(thisMonday.getUTCDate() - i * 7);
        weekKeys.push(ws.toISOString().split('T')[0]);
      }

      const weeks = {};
      for (const wk of weekKeys) {
        const d = new Date(wk);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        weeks[wk] = {
          week: wk,
          label,
          earnings: 0,
          new_moves: 0,
          active_moves: 0,
          completed_moves: 0,
          new_drivers: 0,
          active_drivers: 0,
        };
      }

      // Earnings from completed moves (by move_date or created_date)
      for (const m of allMoves) {
        const wk = getWeekStart(m.move_date || m.created_date);
        if (!wk || !weeks[wk]) continue;
        if (m.status === 'completed' && (m.total_price || 0) > 0) {
          weeks[wk].earnings += m.total_price;
          weeks[wk].completed_moves += 1;
        }
        if (['accepted', 'in_progress'].includes(m.status)) {
          weeks[wk].active_moves += 1;
        }
        weeks[wk].new_moves += 1;
      }

      // New drivers by created_date
      const driverIdsByWeek = {};
      for (const d of allDrivers) {
        const wk = getWeekStart(d.created_date);
        if (!wk || !weeks[wk]) continue;
        weeks[wk].new_drivers += 1;
        if (!driverIdsByWeek[wk]) driverIdsByWeek[wk] = new Set();
        driverIdsByWeek[wk].add(d.id);
      }

      // Active drivers: drivers with at least one move (any status) created that week
      for (const m of allMoves) {
        const wk = getWeekStart(m.move_date || m.created_date);
        if (!wk || !weeks[wk]) continue;
        if (m.assigned_driver_id) {
          if (!driverIdsByWeek[wk]) driverIdsByWeek[wk] = new Set();
          driverIdsByWeek[wk].add(m.assigned_driver_id);
        }
      }
      for (const wk of weekKeys) {
        weeks[wk].active_drivers = driverIdsByWeek[wk]?.size || 0;
      }

      const series = weekKeys.map((wk) => weeks[wk]);
      const thisWeek = series[series.length - 1];
      const lastWeek = series[series.length - 2] || { earnings: 0, new_moves: 0, new_drivers: 0 };

      return Response.json({ series, thisWeek, lastWeek });
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