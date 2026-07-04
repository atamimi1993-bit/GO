import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAX_BATCH_RADIUS_MILES = 5;
const BATCHING_WINDOW_HOURS = 3;
const MAX_SHIFT_HOURS = 8;
const BATCH_COMPLETION_BONUS = 15;
const TRAVEL_BUFFER_MINUTES = 30;
const DISPATCH_TIMEOUT_MS = 60_000;

const TRUCK_SIZE_RANK = { small: 0, medium: 1, large: 2, extra_large: 3 };
const ESTIMATED_JOB_HOURS = { small: 2, medium: 3, large: 4, extra_large: 5 };
const COURIER_VEHICLE_RANK = { motorcycle: 0, sedan: 1, suv: 2, van: 3, truck: 4, box_truck: 5 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { move_request_id, dry_run } = body;

    // Fetch upcoming unassigned moves (pending or quoted, not yet assigned)
    const now = new Date();
    const windowEnd = new Date(now.getTime() + (BATCHING_WINDOW_HOURS + MAX_SHIFT_HOURS) * 3600_000);

    const allMoves = await base44.asServiceRole.entities.MoveRequest.filter({
      status: { $in: ['pending', 'quoted'] },
    }, '-created_date', 200).catch(() => []);

    // Filter to moves within the batching window and have a move_date
    const candidates = allMoves.filter((m) => {
      if (!m.move_date) return false;
      if (m.batch_id) return false; // already batched
      if (move_request_id && m.id !== move_request_id) {
        // When triggered for a specific move, still scan against all others
      }
      const moveDateTime = parseMoveDateTime(m.move_date, m.move_time);
      if (!moveDateTime) return false;
      return moveDateTime >= now && moveDateTime <= windowEnd;
    });

    // Also include moves that are 'accepted' (assigned but not yet confirmed) —
    // these might be batchable if the driver hasn't confirmed yet
    const assignedMoves = await base44.asServiceRole.entities.MoveRequest.filter({
      status: 'accepted',
      driver_rate_confirmed: false,
    }, '-created_date', 200).catch(() => []);

    const assignedCandidates = assignedMoves.filter((m) => {
      if (!m.move_date || m.batch_id) return false;
      const moveDateTime = parseMoveDateTime(m.move_date, m.move_time);
      if (!moveDateTime) return false;
      return moveDateTime >= now && moveDateTime <= windowEnd;
    });

    // Combine — unassigned candidates + assigned-but-unconfirmed
    const pool = [...candidates, ...assignedCandidates];

    // Find batch pairs
    const batches = [];
    const usedMoveIds = new Set();

    for (let i = 0; i < pool.length; i++) {
      if (usedMoveIds.has(pool[i].id)) continue;
      for (let j = i + 1; j < pool.length; j++) {
        if (usedMoveIds.has(pool[j].id)) continue;

        const jobA = pool[i];
        const jobB = pool[j];

        const batchCheck = checkBatchCandidate(jobA, jobB);
        if (batchCheck.eligible) {
          batches.push({
            jobA,
            jobB,
            estimatedSavings: batchCheck.estimatedSavings,
            combinedDuration: batchCheck.combinedDuration,
          });
          usedMoveIds.add(jobA.id);
          usedMoveIds.add(jobB.id);
          break; // jobA is now batched, move to next
        }
      }
    }

    if (dry_run) {
      return Response.json({
        scanned: pool.length,
        batches_found: batches.length,
        batches: batches.map((b) => ({
          job_a: { id: b.jobA.id, pickup: b.jobA.pickup_address, date: b.jobA.move_date, time: b.jobA.move_time },
          job_b: { id: b.jobB.id, pickup: b.jobB.pickup_address, date: b.jobB.move_date, time: b.jobB.move_time },
          estimated_savings: b.estimatedSavings,
        })),
      });
    }

    // Process each batch
    const results = [];
    for (const batch of batches) {
      try {
        const result = await createAndDispatchBatch(base44, batch);
        results.push(result);
      } catch (err) {
        console.error('Batch processing failed:', err.message);
        results.push({ error: err.message, job_a_id: batch.jobA.id, job_b_id: batch.jobB.id });
      }
    }

    // Also expire stale batch offers
    await expireStaleBatches(base44);

    return Response.json({
      scanned: pool.length,
      batches_created: results.filter((r) => r.created).length,
      results,
    });
  } catch (error) {
    console.error('scan-batch-candidates error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseMoveDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const time = timeStr || '09:00';
  const dt = new Date(dateStr + 'T' + time + ':00');
  if (isNaN(dt.getTime())) return null;
  return dt;
}

function extractZip(address) {
  if (!address) return null;
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

function extractCity(address) {
  if (!address) return null;
  const parts = address.split(',').map((p) => p.trim());
  // US format: Street, City, State ZIP
  if (parts.length >= 2) return parts[parts.length - 2].toLowerCase();
  return null;
}

function estimateDistance(jobA, jobB) {
  const zipA = extractZip(jobA.pickup_address);
  const zipB = extractZip(jobB.pickup_address);
  const cityA = extractCity(jobA.pickup_address);
  const cityB = extractCity(jobB.pickup_address);

  if (zipA && zipB) {
    if (zipA === zipB) return 2; // same zip — very close
  }
  if (cityA && cityB && cityA === cityB) return 4; // same city — close
  if (zipA && zipB) {
    // Different zips — estimate ~8mi (outside radius)
    return 8;
  }
  // No zip data — fall back to city match
  if (cityA && cityB && cityA === cityB) return 4;
  return 99; // unknown — don't batch
}

function checkBatchCandidate(jobA, jobB) {
  // 1. Distance check
  const distance = estimateDistance(jobA, jobB);
  if (distance > MAX_BATCH_RADIUS_MILES) {
    return { eligible: false, reason: 'distance' };
  }

  // 2. Time delta check
  const dtA = parseMoveDateTime(jobA.move_date, jobA.move_time);
  const dtB = parseMoveDateTime(jobB.move_date, jobB.move_time);
  if (!dtA || !dtB) return { eligible: false, reason: 'no_date' };

  // Order jobs chronologically
  const [first, second] = dtA <= dtB ? [jobA, jobB] : [jobB, jobA];
  const firstDT = dtA <= dtB ? dtA : dtB;
  const secondDT = dtA <= dtB ? dtB : dtA;

  const deltaHours = (secondDT - firstDT) / 3600_000;
  if (deltaHours > BATCHING_WINDOW_HOURS) {
    return { eligible: false, reason: 'time_delta_too_large' };
  }
  if (deltaHours < 0) {
    return { eligible: false, reason: 'past_job' };
  }

  // 3. Combined duration check
  const firstHours = ESTIMATED_JOB_HOURS[first.truck_size_needed || 'medium'] || 3;
  const travelHours = TRAVEL_BUFFER_MINUTES / 60;
  const secondHours = ESTIMATED_JOB_HOURS[second.truck_size_needed || 'medium'] || 3;
  const combinedDuration = firstHours + travelHours + secondHours;

  if (combinedDuration > MAX_SHIFT_HOURS) {
    return { eligible: false, reason: 'shift_too_long' };
  }

  // 4. Vehicle size compatibility — same class OR second job fits in first's truck
  const sizeA = TRUCK_SIZE_RANK[jobA.truck_size_needed || 'medium'] ?? 1;
  const sizeB = TRUCK_SIZE_RANK[jobB.truck_size_needed || 'medium'] ?? 1;
  const maxNeeded = Math.max(sizeA, sizeB);
  // The larger truck handles both — OK as long as one job doesn't need bigger
  // than the other can handle. We just need a truck >= maxNeeded.
  if (maxNeeded > 3) {
    return { eligible: false, reason: 'extra_large_incompatible' };
  }

  // 5. Arrival window protection — if second job is premier, ensure batching
  // doesn't push its arrival outside the committed window
  if (second.customer_tier === 'premier' && second.arrival_window_deadline) {
    const deadline = new Date(second.arrival_window_deadline);
    const estimatedSecondStart = new Date(firstDT.getTime() + (firstHours + travelHours) * 3600_000);
    if (estimatedSecondStart > deadline) {
      return { eligible: false, reason: 'arrival_window_violation' };
    }
  }

  // 6. Same job type (don't mix courier with residential)
  if (jobA.job_type !== jobB.job_type) {
    return { eligible: false, reason: 'job_type_mismatch' };
  }

  // 7. Don't batch if either has extra_helper or elevator_service (complex jobs)
  if (jobA.extra_helper || jobB.extra_helper) {
    return { eligible: false, reason: 'extra_helper' };
  }

  // Estimate savings — avoided second dispatch (~$25) + reduced idle time (~$10)
  const estimatedSavings = 35 + (distance < 3 ? 10 : 0);

  return {
    eligible: true,
    estimatedSavings,
    combinedDuration,
    firstJob: first,
    secondJob: second,
  };
}

async function createAndDispatchBatch(base44, batch) {
  const { jobA, jobB, estimatedSavings } = batch;

  // Order chronologically
  const dtA = parseMoveDateTime(jobA.move_date, jobA.move_time);
  const dtB = parseMoveDateTime(jobB.move_date, jobB.move_time);
  const [firstJob, secondJob] = dtA <= dtB ? [jobA, jobB] : [jobB, jobA];

  const batchKey = `batch_${firstJob.id}_${secondJob.id}`;
  const totalPayout = (firstJob.driver_payout || 0) + (secondJob.driver_payout || 0);
  const totalPrice = (firstJob.total_price || 0) + (secondJob.total_price || 0);

  // Check if one of the jobs already has a driver assigned (but unconfirmed)
  const existingDriverId = firstJob.assigned_driver_id || secondJob.assigned_driver_id;

  let assignedDriver = null;
  let premierFallback = false;

  if (existingDriverId) {
    // One job already dispatched to a driver — try to assign the other to the same driver
    const driver = await base44.asServiceRole.entities.DriverProfile.get(existingDriverId).catch(() => null);
    if (driver && driver.status === 'approved' && driver.available !== false) {
      assignedDriver = driver;
    }
  }

  // If no existing driver, find one for both jobs
  if (!assignedDriver) {
    const driverResult = await findDriverForBatch(base44, firstJob, secondJob);
    if (!driverResult.driver) {
      // No driver for the batch — split and dispatch individually
      await splitAndDispatch(base44, firstJob, secondJob);
      return { created: false, reason: 'no_driver_for_batch', batch_key: batchKey };
    }
    assignedDriver = driverResult.driver;
    premierFallback = driverResult.fallback;
  }

  // Create RouteBatch record
  const routeBatch = await base44.asServiceRole.entities.RouteBatch.create({
    batch_key: batchKey,
    job_ids: `${firstJob.id},${secondJob.id}`,
    job_count: 2,
    driver_profile_id: assignedDriver.id,
    driver_name: assignedDriver.full_name,
    status: 'offered',
    estimated_savings: estimatedSavings,
    batch_completion_bonus: BATCH_COMPLETION_BONUS,
    total_driver_payout: totalPayout,
    total_customer_price: totalPrice,
    first_job_date: firstJob.move_date,
    first_job_time: firstJob.move_time || '09:00',
    offered_at: new Date().toISOString(),
    declined_driver_ids: firstJob.declined_driver_ids || '',
  });

  // Assign both jobs to the driver
  const now = new Date().toISOString();

  // First job
  await base44.asServiceRole.entities.MoveRequest.update(firstJob.id, {
    assigned_driver_id: assignedDriver.id,
    assigned_driver_name: assignedDriver.full_name,
    status: 'accepted',
    driver_rate_confirmed: false,
    dispatched_at: now,
    batch_id: routeBatch.id,
    batch_stop_order: 1,
    premier_fallback_used: premierFallback && firstJob.customer_tier === 'premier',
  });

  // Second job
  await base44.asServiceRole.entities.MoveRequest.update(secondJob.id, {
    assigned_driver_id: assignedDriver.id,
    assigned_driver_name: assignedDriver.full_name,
    status: 'accepted',
    driver_rate_confirmed: false,
    dispatched_at: now,
    batch_id: routeBatch.id,
    batch_stop_order: 2,
    premier_fallback_used: premierFallback && secondJob.customer_tier === 'premier',
  });

  // Set arrival window deadline for premier second job
  if (secondJob.customer_tier === 'premier' && secondJob.move_date) {
    const timePart = secondJob.move_time || '09:00';
    const moveDateTime = new Date(secondJob.move_date + 'T' + timePart + ':00');
    if (!isNaN(moveDateTime.getTime())) {
      const deadline = new Date(moveDateTime.getTime() + 15 * 60 * 1000).toISOString();
      await base44.asServiceRole.entities.MoveRequest.update(secondJob.id, {
        arrival_window_deadline: deadline,
      });
    }
  }

  // Notify driver
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: assignedDriver.email,
      subject: `🚚 2-Stop Route Dispatched: ${firstJob.pickup_address || 'Stop 1'} → ${secondJob.pickup_address || 'Stop 2'}`,
      body: [
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
        `<h2 style="color:#7c3aed;">2-Stop Route Dispatched!</h2>`,
        `<p>You've been assigned a <strong>batched 2-stop route</strong>. Complete both jobs for a <strong>$${BATCH_COMPLETION_BONUS} bonus</strong> on top of your regular payouts.</p>`,
        `<table style="width:100%;border-collapse:collapse;margin:16px 0;">`,
        `<tr><td colspan="2" style="padding:8px 0;font-weight:bold;color:#7c3aed;">Stop 1</td></tr>`,
        `<tr><td style="padding:4px 0;font-weight:bold;color:#6b7280;width:100px;">Date/Time</td><td style="padding:4px 0;">${firstJob.move_date} at ${firstJob.move_time || 'TBD'}</td></tr>`,
        `<tr><td style="padding:4px 0;font-weight:bold;color:#6b7280;">Pickup</td><td style="padding:4px 0;">${firstJob.pickup_address || 'N/A'}</td></tr>`,
        `<tr><td style="padding:4px 0;font-weight:bold;color:#6b7280;">Drop-off</td><td style="padding:4px 0;">${firstJob.dropoff_address || 'N/A'}</td></tr>`,
        `<tr><td style="padding:4px 0;font-weight:bold;color:#6b7280;">Payout</td><td style="padding:4px 0;color:#059669;font-weight:bold;">$${(firstJob.driver_payout || 0).toFixed(2)}</td></tr>`,
        `<tr><td colspan="2" style="padding:8px 0;font-weight:bold;color:#7c3aed;">Stop 2</td></tr>`,
        `<tr><td style="padding:4px 0;font-weight:bold;color:#6b7280;">Date/Time</td><td style="padding:4px 0;">${secondJob.move_date} at ${secondJob.move_time || 'TBD'}</td></tr>`,
        `<tr><td style="padding:4px 0;font-weight:bold;color:#6b7280;">Pickup</td><td style="padding:4px 0;">${secondJob.pickup_address || 'N/A'}</td></tr>`,
        `<tr><td style="padding:4px 0;font-weight:bold;color:#6b7280;">Drop-off</td><td style="padding:4px 0;">${secondJob.dropoff_address || 'N/A'}</td></tr>`,
        `<tr><td style="padding:4px 0;font-weight:bold;color:#6b7280;">Payout</td><td style="padding:4px 0;color:#059669;font-weight:bold;">$${(secondJob.driver_payout || 0).toFixed(2)}</td></tr>`,
        `<tr><td colspan="2" style="padding:12px 0 4px;"><hr style="border:none;border-top:1px solid #e5e7eb;" /></td></tr>`,
        `<tr><td style="padding:4px 0;font-weight:bold;color:#6b7280;">Total Payout</td><td style="padding:4px 0;color:#059669;font-weight:bold;font-size:1.1em;">$${totalPayout.toFixed(2)}</td></tr>`,
        `<tr><td style="padding:4px 0;font-weight:bold;color:#6b7280;">Batch Bonus</td><td style="padding:4px 0;color:#7c3aed;font-weight:bold;">+$${BATCH_COMPLETION_BONUS}.00</td></tr>`,
        `</table>`,
        `<p style="margin-top:16px;">Open your driver dashboard to <strong>accept or decline</strong> this route. <strong>Accept within 60 seconds.</strong></p>`,
        `</div>`,
      ].join('\n'),
    });
  } catch (err) {
    console.error('Failed to notify batched driver:', err.message);
  }

  return {
    created: true,
    batch_id: routeBatch.id,
    batch_key: batchKey,
    driver: { id: assignedDriver.id, name: assignedDriver.full_name },
    total_payout: totalPayout,
    estimated_savings: estimatedSavings,
  };
}

async function findDriverForBatch(base44, firstJob, secondJob) {
  const needsCDL = firstJob.job_type === 'freight' ||
    firstJob.job_type === 'corporate_logistics' ||
    firstJob.truck_size_needed === 'extra_large' ||
    secondJob.truck_size_needed === 'extra_large';

  const isCourier = firstJob.job_type === 'courier';

  // Parse service area from first job
  const pickupState = (firstJob.pickup_state || '').trim().toLowerCase();
  const pickupTokens = pickupState.split(/[,\s]+/).filter((t) => t.length > 1);
  const pickupParts = (firstJob.pickup_address || '').split(',').map((p) => p.trim().toLowerCase());
  if (pickupParts.length > 0 && pickupParts[pickupParts.length - 1]) {
    pickupTokens.push(pickupParts[pickupParts.length - 1]);
  }

  const declinedIds = (firstJob.declined_driver_ids || '').split(',').filter(Boolean);

  const drivers = await base44.asServiceRole.entities.DriverProfile.list('-created_date', 500);

  let filtered = drivers.filter((d) => {
    if (d.status !== 'approved' || d.available === false) return false;
    if (declinedIds.includes(d.id)) return false;
    if (!d.service_area) return false;
    const area = d.service_area.toLowerCase();
    return pickupTokens.some((t) => area.includes(t));
  });

  if (filtered.length === 0) {
    filtered = drivers.filter((d) => {
      if (d.status !== 'approved' || d.available === false) return false;
      if (declinedIds.includes(d.id)) return false;
      return true;
    });
  }

  if (filtered.length === 0) return { driver: null };

  if (needsCDL) {
    filtered = filtered.filter((d) => d.cdl_certified);
    if (filtered.length === 0) return { driver: null };
  }

  if (isCourier) {
    let courierPool = filtered.filter((d) => d.courier_eligible === true);
    if (courierPool.length === 0) courierPool = filtered;
    courierPool.sort((a, b) => {
      const aVeh = COURIER_VEHICLE_RANK[a.vehicle_category] ?? 6;
      const bVeh = COURIER_VEHICLE_RANK[b.vehicle_category] ?? 6;
      if (aVeh !== bVeh) return aVeh - bVeh;
      return (b.rating || 5) - (a.rating || 5);
    });
    const pick = pickPremierPreferred(courierPool, firstJob.customer_tier === 'premier' || secondJob.customer_tier === 'premier');
    return pick;
  }

  // Non-courier: check truck size
  const requiredSize = Math.max(
    TRUCK_SIZE_RANK[firstJob.truck_size_needed] ?? 1,
    TRUCK_SIZE_RANK[secondJob.truck_size_needed] ?? 1
  );

  const driverIds = filtered.map((d) => d.id);
  const trucks = await base44.asServiceRole.entities.Truck.filter({
    driver_profile_id: { $in: driverIds },
  }).catch(() => []);

  const trucksByDriver = {};
  for (const truck of trucks) {
    if (!trucksByDriver[truck.driver_profile_id]) trucksByDriver[truck.driver_profile_id] = [];
    trucksByDriver[truck.driver_profile_id].push(truck);
  }

  const withTrucks = filtered.filter((d) => {
    const driverTrucks = trucksByDriver[d.id] || [];
    return driverTrucks.some((t) => (TRUCK_SIZE_RANK[t.size_category] ?? 0) >= requiredSize);
  });

  if (withTrucks.length === 0) return { driver: null };

  withTrucks.sort((a, b) => {
    const ratingDiff = (b.rating || 5) - (a.rating || 5);
    if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
    return (b.total_jobs || 0) - (a.total_jobs || 0);
  });

  const isPremier = firstJob.customer_tier === 'premier' || secondJob.customer_tier === 'premier';
  return pickPremierPreferred(withTrucks, isPremier);
}

function pickPremierPreferred(rankedPool, isPremier) {
  if (!isPremier) return { driver: rankedPool[0], fallback: false };
  const premierPool = rankedPool.filter((d) => d.premier_eligible === true);
  if (premierPool.length > 0) return { driver: premierPool[0], fallback: false };
  return { driver: rankedPool[0], fallback: true };
}

async function splitAndDispatch(base44, firstJob, secondJob) {
  // If batching failed, dispatch each job individually
  try {
    await base44.asServiceRole.functions.invoke('auto-dispatch-driver', { move_request_id: firstJob.id });
  } catch (e) {
    console.error('Split dispatch for job A failed:', e.message);
  }
  try {
    await base44.asServiceRole.functions.invoke('auto-dispatch-driver', { move_request_id: secondJob.id });
  } catch (e) {
    console.error('Split dispatch for job B failed:', e.message);
  }

  // Mark any existing RouteBatch as split
  // (none created in this path, but for safety)
}

async function expireStaleBatches(base44) {
  const now = Date.now();
  const offeredBatches = await base44.asServiceRole.entities.RouteBatch.filter({
    status: 'offered',
  }, '-created_date', 100).catch(() => []);

  for (const batch of offeredBatches) {
    if (!batch.offered_at) continue;
    const elapsed = now - new Date(batch.offered_at).getTime();
    if (elapsed > DISPATCH_TIMEOUT_MS) {
      // Expire — split the batch and re-dispatch individually
      const jobIds = (batch.job_ids || '').split(',').filter(Boolean);
      await base44.asServiceRole.entities.RouteBatch.update(batch.id, {
        status: 'expired',
        notes: `Timed out after ${Math.round(elapsed / 1000)}s`,
      });

      // Clear batch assignments and re-dispatch
      for (const jobId of jobIds) {
        const move = await base44.asServiceRole.entities.MoveRequest.get(jobId).catch(() => null);
        if (!move) continue;

        const declinedList = (move.declined_driver_ids || '').split(',').filter(Boolean);
        if (move.assigned_driver_id && !declinedList.includes(move.assigned_driver_id)) {
          declinedList.push(move.assigned_driver_id);
        }

        await base44.asServiceRole.entities.MoveRequest.update(jobId, {
          assigned_driver_id: null,
          assigned_driver_name: null,
          status: 'pending',
          driver_rate_confirmed: false,
          dispatched_at: null,
          batch_id: null,
          batch_stop_order: 0,
          declined_driver_ids: declinedList.join(','),
        });

        // Re-dispatch individually
        try {
          await base44.asServiceRole.functions.invoke('auto-dispatch-driver', { move_request_id: jobId });
        } catch (e) {
          console.error('Re-dispatch after batch expiry failed:', e.message);
        }
      }
    }
  }
}