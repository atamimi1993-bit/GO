import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth — driver must be authenticated
    let user;
    try {
      user = await base44.auth.me();
    } catch (authErr) {
      console.error('respond-to-dispatch auth failed:', authErr.message);
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { move_request_id, response } = body;
    if (!move_request_id || !response) {
      return Response.json({ error: 'move_request_id and response are required' }, { status: 400 });
    }

    if (!['accept', 'decline'].includes(response)) {
      return Response.json({ error: 'response must be "accept" or "decline"' }, { status: 400 });
    }

    // Get driver profile for this user
    const profiles = await base44.entities.DriverProfile.filter({ email: user.email });
    if (!profiles || profiles.length === 0) {
      return Response.json({ error: 'Driver profile not found' }, { status: 403 });
    }
    const driver = profiles[0];

    // Get the move request (service role to bypass RLS)
    const move = await base44.asServiceRole.entities.MoveRequest.get(move_request_id);
    if (!move) {
      return Response.json({ error: 'Move request not found' }, { status: 404 });
    }

    // Verify this driver is the one dispatched
    if (move.assigned_driver_id !== driver.id) {
      return Response.json({ error: 'This job is not dispatched to you' }, { status: 403 });
    }

    if (response === 'accept') {
      // Gate: driver must have Stripe Connect payouts enabled to accept jobs
      if (!driver.stripe_payouts_enabled) {
        return Response.json({
          error: 'You must connect your bank account via Stripe before accepting jobs. Set up payouts in the Driver Hub.',
        }, { status: 403 });
      }

      // Accept the dispatch
      await base44.asServiceRole.entities.MoveRequest.update(move_request_id, {
        driver_rate_confirmed: true,
      });

      // If this is a batch, confirm the other job too and mark batch as accepted
      if (move.batch_id) {
        const batch = await base44.asServiceRole.entities.RouteBatch.get(move.batch_id).catch(() => null);
        if (batch && batch.status === 'offered') {
          const jobIds = (batch.job_ids || '').split(',').filter(Boolean);
          for (const jobId of jobIds) {
            if (jobId !== move_request_id) {
              await base44.asServiceRole.entities.MoveRequest.update(jobId, {
                driver_rate_confirmed: true,
              });
            }
          }
          await base44.asServiceRole.entities.RouteBatch.update(batch.id, {
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          });
        }
      }

      return Response.json({ accepted: true, move_request_id, batch_accepted: !!move.batch_id });
    }

    // Decline — check if this move is part of a batch
    if (move.batch_id) {
      // Decline entire batch — clear both jobs, re-dispatch individually
      const batch = await base44.asServiceRole.entities.RouteBatch.get(move.batch_id).catch(() => null);
      if (batch && (batch.status === 'offered' || batch.status === 'accepted')) {
        const jobIds = (batch.job_ids || '').split(',').filter(Boolean);
        const declinedList = (move.declined_driver_ids || '').split(',').filter(Boolean);
        if (!declinedList.includes(driver.id)) declinedList.push(driver.id);

        // Clear both jobs
        for (const jobId of jobIds) {
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
        }

        // Mark batch as declined
        await base44.asServiceRole.entities.RouteBatch.update(batch.id, {
          status: 'declined',
        });

        // Re-dispatch each job individually
        const reDispatchResults = [];
        for (const jobId of jobIds) {
          try {
            const res = await base44.functions.invoke('auto-dispatch-driver', { move_request_id: jobId });
            reDispatchResults.push(res?.data || { dispatched: false });
          } catch (err) {
            console.error('Re-dispatch failed for batch job:', err.message);
            reDispatchResults.push({ dispatched: false, reason: err.message });
          }
        }

        return Response.json({
          declined: true,
          batch_declined: true,
          move_request_id,
          re_dispatch: reDispatchResults,
        });
      }
    }

    // Single-job decline (original logic)
    const declinedList = (move.declined_driver_ids || '').split(',').filter(Boolean);
    if (!declinedList.includes(driver.id)) declinedList.push(driver.id);

    await base44.asServiceRole.entities.MoveRequest.update(move_request_id, {
      assigned_driver_id: null,
      assigned_driver_name: null,
      status: 'pending',
      driver_rate_confirmed: false,
      dispatched_at: null,
      declined_driver_ids: declinedList.join(','),
    });

    // Re-dispatch to next best driver
    let reDispatchResult = null;
    try {
      const reDispatchRes = await base44.functions.invoke('auto-dispatch-driver', { move_request_id });
      reDispatchResult = reDispatchRes?.data || reDispatchResult;
    } catch (err) {
      console.error('Re-dispatch failed:', err.message);
      reDispatchResult = { dispatched: false, reason: 'Re-dispatch failed: ' + err.message };
    }

    return Response.json({
      declined: true,
      move_request_id,
      re_dispatch: reDispatchResult,
    });
  } catch (error) {
    console.error('respond-to-dispatch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});