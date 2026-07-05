import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Premier eligibility thresholds — drivers must meet ALL of these simultaneously
const PREMIER_MIN_JOBS = 50;
const PREMIER_MIN_RATING = 4.8;
const PREMIER_DISPUTE_LOOKBACK_DAYS = 90;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 🔒 Admin-only — allows admin users or service-role workflow invocations
    const user = await base44.auth.me().catch(() => null);
    if (user) {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
    } else {
      const isServiceRole = await base44.auth.isAuthenticated().catch(() => false);
      if (!isServiceRole) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { driver_profile_id, recompute_all } = body;

    let driverIds = [];

    if (recompute_all) {
      const allDrivers = await base44.asServiceRole.entities.DriverProfile.list('-created_date', 500);
      driverIds = allDrivers.map((d) => d.id);
    } else if (driver_profile_id) {
      driverIds = [driver_profile_id];
    } else {
      return Response.json({ error: 'driver_profile_id or recompute_all is required' }, { status: 400 });
    }

    const ninetyDaysAgo = new Date(Date.now() - PREMIER_DISPUTE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const results = [];

    for (const driverId of driverIds) {
      try {
        const driver = await base44.asServiceRole.entities.DriverProfile.get(driverId);
        if (!driver) continue;

        // 1. Completed jobs count
        const completedMoves = await base44.asServiceRole.entities.MoveRequest.filter({
          assigned_driver_id: driverId,
          status: 'completed',
        });
        const completedJobs = completedMoves.length;

        // 2. Average rating (customer → driver ratings)
        const ratings = await base44.asServiceRole.entities.Rating.filter({
          ratee_id: driverId,
          direction: 'customer_to_driver',
        });
        const avgRating = ratings.length > 0
          ? ratings.reduce((sum, r) => sum + (r.stars || 0), 0) / ratings.length
          : driver.rating || 5;

        // 3. Unresolved disputes in trailing 90 days
        const damageReports = await base44.asServiceRole.entities.DamageReport.filter({
          driver_profile_id: driverId,
        });
        const unresolvedDisputes = damageReports.filter((d) =>
          (d.status === 'submitted' || d.status === 'under_review') &&
          new Date(d.created_date) >= ninetyDaysAgo
        ).length;

        // 4. Background check verified
        const bgClear = driver.background_check_status === 'clear';

        // Eligibility — ALL conditions must be met
        const eligible = completedJobs >= PREMIER_MIN_JOBS &&
          avgRating >= PREMIER_MIN_RATING &&
          unresolvedDisputes === 0 &&
          bgClear;

        await base44.asServiceRole.entities.DriverProfile.update(driverId, {
          premier_eligible: eligible,
          premier_eligible_updated_at: new Date().toISOString(),
        });

        results.push({
          driver_id: driverId,
          driver_name: driver.full_name,
          premier_eligible: eligible,
          completed_jobs: completedJobs,
          avg_rating: Math.round(avgRating * 100) / 100,
          unresolved_disputes: unresolvedDisputes,
          background_clear: bgClear,
          reasons: eligible ? null : [
            ...(completedJobs < PREMIER_MIN_JOBS ? [`needs ${PREMIER_MIN_JOBS - completedJobs} more completed jobs`] : []),
            ...(avgRating < PREMIER_MIN_RATING ? [`rating ${avgRating.toFixed(2)} < ${PREMIER_MIN_RATING}`] : []),
            ...(unresolvedDisputes > 0 ? [`${unresolvedDisputes} unresolved dispute(s)`] : []),
            ...(!bgClear ? ['background check not clear'] : []),
          ],
        });
      } catch (err) {
        console.error(`Failed to evaluate driver ${driverId}:`, err.message);
      }
    }

    return Response.json({ recomputed: results.length, results });
  } catch (error) {
    console.error('recalculate-premier-eligibility error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});