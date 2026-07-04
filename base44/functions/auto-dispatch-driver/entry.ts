import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TRUCK_SIZE_RANK = { small: 0, medium: 1, large: 2, extra_large: 3 };
const DISPATCH_TIMEOUT_MS = 60_000; // 60-second accept window

// Vehicle categories suitable for courier jobs (cars/vans preferred over big trucks)
const COURIER_VEHICLE_RANK = { motorcycle: 0, sedan: 1, suv: 2, van: 3, truck: 4, box_truck: 5 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow any authenticated user (customer booking, admin) or workflow
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
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

    // Skip if already assigned and confirmed
    if (move.assigned_driver_id && move.driver_rate_confirmed) {
      return Response.json({ dispatched: false, reason: 'already confirmed by driver' });
    }

    // Auto-expire stale dispatches (dispatched > 60s ago, not yet responded)
    if (move.assigned_driver_id && move.dispatched_at) {
      const elapsed = Date.now() - new Date(move.dispatched_at).getTime();
      if (elapsed < DISPATCH_TIMEOUT_MS) {
        return Response.json({ dispatched: false, reason: 'dispatch still pending', expires_in_ms: DISPATCH_TIMEOUT_MS - elapsed });
      }
      // Timeout expired — add driver to declined list and re-dispatch
      const declined = (move.declined_driver_ids || '').split(',').filter(Boolean);
      if (!declined.includes(move.assigned_driver_id)) declined.push(move.assigned_driver_id);
      await base44.asServiceRole.entities.MoveRequest.update(move_request_id, {
        assigned_driver_id: null,
        assigned_driver_name: null,
        driver_rate_confirmed: false,
        dispatched_at: null,
        declined_driver_ids: declined.join(','),
      });
    }

    // Parse pickup location
    const pickupState = (move.pickup_state || '').trim().toLowerCase();
    const pickupTokens = pickupState.split(/[,\s]+/).filter((t) => t.length > 1);

    // Also parse city from pickup_address (last comma-separated part before state)
    const pickupParts = (move.pickup_address || '').split(',').map((p) => p.trim().toLowerCase());
    if (pickupParts.length > 0 && pickupParts[pickupParts.length - 1]) {
      pickupTokens.push(pickupParts[pickupParts.length - 1]);
    }

    // Get declined driver IDs
    const declinedIds = (move.declined_driver_ids || '').split(',').filter(Boolean);

    // Find approved, available drivers
    const drivers = await base44.asServiceRole.entities.DriverProfile.list('-created_date', 500);

    // Filter by service area match and not declined
    const areaMatched = drivers.filter((d) => {
      if (d.status !== 'approved' || d.available === false) return false;
      if (declinedIds.includes(d.id)) return false;
      if (!d.service_area) return false;
      const area = d.service_area.toLowerCase();
      return pickupTokens.some((t) => area.includes(t));
    });

    if (areaMatched.length === 0) {
      // Fall back: no service area match — try all available drivers (broaden the net)
      const broadMatched = drivers.filter((d) => {
        if (d.status !== 'approved' || d.available === false) return false;
        if (declinedIds.includes(d.id)) return false;
        return true;
      });

      if (broadMatched.length === 0) {
        // No drivers at all — notify all drivers about the job
        try {
          await base44.asServiceRole.functions.invoke('notify-drivers-new-move', { move_request_id });
        } catch (e) {
          console.error('notify-drivers fallback failed:', e.message);
        }
        return Response.json({ dispatched: false, reason: 'No available drivers — notified all drivers' });
      }

      // Use broad match
      return await selectAndAssignDriver(base44, move, broadMatched);
    }

    return await selectAndAssignDriver(base44, move, areaMatched);
  } catch (error) {
    console.error('auto-dispatch-driver error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Premier routing — for premier jobs, prefer premier-eligible drivers.
// Falls back to standard drivers only if no premier driver is available (flagged).
function pickPremierPreferred(rankedPool, isPremier) {
  if (!isPremier) return { driver: rankedPool[0], fallback: false };
  const premierPool = rankedPool.filter((d) => d.premier_eligible === true);
  if (premierPool.length > 0) return { driver: premierPool[0], fallback: false };
  return { driver: rankedPool[0], fallback: true };
}

async function selectAndAssignDriver(base44, move, candidates) {
  // Check CDL requirement
  const needsCDL = move.job_type === 'freight' ||
    move.job_type === 'corporate_logistics' ||
    move.truck_size_needed === 'extra_large';

  const cdlFiltered = needsCDL
    ? candidates.filter((d) => d.cdl_certified)
    : candidates;

  if (cdlFiltered.length === 0) {
    return Response.json({ dispatched: false, reason: 'No CDL-certified drivers available for this job' });
  }

  // Courier jobs: prefer courier-eligible drivers with small vehicles; skip truck-size requirement
  const isCourier = move.job_type === 'courier';

  if (isCourier) {
    // Prefer courier-eligible drivers; fall back to all if none
    let courierPool = cdlFiltered.filter((d) => d.courier_eligible === true);
    if (courierPool.length === 0) courierPool = cdlFiltered;

    // Rank: courier-eligible first, then smallest vehicle (efficiency), then rating, then jobs
    courierPool.sort((a, b) => {
      const aCourier = a.courier_eligible ? 1 : 0;
      const bCourier = b.courier_eligible ? 1 : 0;
      if (aCourier !== bCourier) return bCourier - aCourier;
      const aVeh = COURIER_VEHICLE_RANK[a.vehicle_category] ?? 6;
      const bVeh = COURIER_VEHICLE_RANK[b.vehicle_category] ?? 6;
      if (aVeh !== bVeh) return aVeh - bVeh;
      const ratingDiff = (b.rating || 5) - (a.rating || 5);
      if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
      return (b.total_jobs || 0) - (a.total_jobs || 0);
    });

    const courierPick = pickPremierPreferred(courierPool, move.customer_tier === 'premier');
    return await assignDriver(base44, move, courierPick.driver, courierPick.fallback);
  }

  // Non-courier: check truck size — query trucks for all candidate drivers
  const driverIds = cdlFiltered.map((d) => d.id);
  const trucks = await base44.asServiceRole.entities.Truck.filter({
    driver_profile_id: { $in: driverIds },
  }).catch(() => []);

  // Map driver → trucks
  const trucksByDriver = {};
  for (const truck of trucks) {
    if (!trucksByDriver[truck.driver_profile_id]) trucksByDriver[truck.driver_profile_id] = [];
    trucksByDriver[truck.driver_profile_id].push(truck);
  }

  // Required truck size rank
  const requiredSize = TRUCK_SIZE_RANK[move.truck_size_needed] ?? 1;

  // Filter drivers who have a truck of sufficient size
  const withTrucks = cdlFiltered.filter((d) => {
    const driverTrucks = trucksByDriver[d.id] || [];
    return driverTrucks.some((t) => {
      const truckSize = TRUCK_SIZE_RANK[t.size_category] ?? 0;
      return truckSize >= requiredSize;
    });
  });

  if (withTrucks.length === 0) {
    return Response.json({ dispatched: false, reason: 'No drivers with a matching truck size' });
  }

  // Rank: highest rating, then most jobs, then CDL-certified preferred
  withTrucks.sort((a, b) => {
    const ratingDiff = (b.rating || 5) - (a.rating || 5);
    if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
    return (b.total_jobs || 0) - (a.total_jobs || 0);
  });

  const truckPick = pickPremierPreferred(withTrucks, move.customer_tier === 'premier');

  return await assignDriver(base44, move, truckPick.driver, truckPick.fallback);
}

async function assignDriver(base44, move, bestDriver, premierFallback = false) {
  // For premier jobs, lock in the arrival window deadline (move time + 15 min)
  let arrivalWindowDeadline = null;
  if (move.customer_tier === 'premier' && move.move_date) {
    const timePart = move.move_time || '09:00';
    const moveDateTime = new Date(move.move_date + 'T' + timePart + ':00');
    if (!isNaN(moveDateTime.getTime())) {
      arrivalWindowDeadline = new Date(moveDateTime.getTime() + 15 * 60 * 1000).toISOString();
    }
  }

  // Assign driver
  await base44.asServiceRole.entities.MoveRequest.update(move.id, {
    assigned_driver_id: bestDriver.id,
    assigned_driver_name: bestDriver.full_name,
    status: 'accepted',
    driver_rate_confirmed: false,
    dispatched_at: new Date().toISOString(),
    premier_fallback_used: premierFallback,
    ...(arrivalWindowDeadline ? { arrival_window_deadline: arrivalWindowDeadline } : {}),
  });

  // Notify driver by email
  try {
    const moveDate = move.move_date
      ? new Date(move.move_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : 'TBD';
    const moveTime = move.move_time || 'Flexible';
    const payout = move.driver_payout || move.driver_fee || 0;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: bestDriver.email,
      subject: `🚚 New Job Dispatched: ${move.pickup_address || 'Pickup'} → ${move.dropoff_address || 'Dropoff'}`,
      body: [
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
        `<h2 style="color:#059669;">You've been dispatched a new job!</h2>`,
        `<p>A move in your service area has been auto-assigned to you. <strong>Accept it within 60 seconds</strong> before it's offered to another driver.</p>`,
        `<table style="width:100%;border-collapse:collapse;margin:16px 0;">`,
        `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;width:120px;">Move Date</td><td style="padding:8px 0;">${moveDate} at ${moveTime}</td></tr>`,
        `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Pickup</td><td style="padding:8px 0;">${move.pickup_address || 'N/A'}</td></tr>`,
        `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Drop-off</td><td style="padding:8px 0;">${move.dropoff_address || 'N/A'}</td></tr>`,
        move.truck_size_needed ? `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Truck Size</td><td style="padding:8px 0;">${move.truck_size_needed}</td></tr>` : '',
        move.total_weight_lbs ? `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Weight</td><td style="padding:8px 0;">${move.total_weight_lbs} lbs</td></tr>` : '',
        payout ? `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Your Payout</td><td style="padding:8px 0;color:#059669;font-weight:bold;">$${payout.toFixed(2)}</td></tr>` : '',
        `</table>`,
        `<p style="margin-top:24px;">Open your driver dashboard to <strong>accept or decline</strong> this job.</p>`,
        `</div>`,
      ].join('\n'),
    });
  } catch (err) {
    console.error('Failed to notify dispatched driver:', err.message);
  }

  return Response.json({
    dispatched: true,
    driver: { id: bestDriver.id, name: bestDriver.full_name, email: bestDriver.email },
  });
}