import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Automatically creates a DriverPayout record for the driver's job earnings
// when a move is marked completed. Idempotent — won't create duplicates.
// Triggered by the AutoDriverPayoutOnCompletion workflow.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check — allows admin or workflow (service-role) invocations
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
    if (!move) return Response.json({ error: 'Move not found' }, { status: 404 });
    if (move.status !== 'completed') {
      return Response.json({ skipped: true, reason: 'Move not completed' });
    }

    const driverId = move.assigned_driver_id;
    if (!driverId) {
      return Response.json({ skipped: true, reason: 'No assigned driver' });
    }

    const payoutAmount = move.driver_payout || 0;
    if (payoutAmount <= 0) {
      return Response.json({ skipped: true, reason: 'No driver payout amount on move' });
    }

    // Idempotency check — don't create a duplicate job-earnings payout for this move
    const existing = await base44.asServiceRole.entities.DriverPayout.filter({
      driver_profile_id: driverId,
      move_request_id,
      deduction_reason: 'job_earnings',
    });
    if (existing.length > 0) {
      return Response.json({ skipped: true, reason: 'Payout already exists', payout_id: existing[0].id });
    }

    // Create the payout record
    const payout = await base44.asServiceRole.entities.DriverPayout.create({
      driver_profile_id: driverId,
      move_request_id,
      amount: payoutAmount,
      currency: move.currency || 'USD',
      status: 'pending',
      notes: `Job earnings — ${move.customer_name || 'customer'} move on ${move.move_date || 'N/A'}`,
      deduction_reason: 'job_earnings',
    });

    // Update driver's total earnings
    const driver = await base44.asServiceRole.entities.DriverProfile.get(driverId);
    if (driver) {
      await base44.asServiceRole.entities.DriverProfile.update(driverId, {
        total_earnings: (driver.total_earnings || 0) + payoutAmount,
        total_jobs: (driver.total_jobs || 0) + 1,
      });
    }

    // Notify the driver that their payout is queued
    if (driver && driver.email) {
      try {
        const fmtAmt = (move.currency || 'USD') === 'USD'
          ? `$${payoutAmount.toFixed(2)}`
          : `${payoutAmount.toFixed(2)} ${move.currency}`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: driver.email,
          subject: `Payment of ${fmtAmt} is queued for you 💰`,
          body: [
            `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
            `<h2 style="color:#16a34a;">Your payment is on the way!</h2>`,
            `<p>Great work on the completed move for <strong>${move.customer_name || 'your customer'}</strong>.</p>`,
            `<p>Your earnings of <strong>${fmtAmt}</strong> have been queued and will be sent to your bank account on the next payout cycle.</p>`,
            `<div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:20px 0;">`,
            `<p style="margin:0;color:#6b7280;font-size:14px;">Move details</p>`,
            `<p style="margin:4px 0 0;font-weight:600;">${move.pickup_address || 'Pickup'} → ${move.dropoff_address || 'Dropoff'}</p>`,
            `<p style="margin:4px 0 0;color:#6b7280;font-size:14px;">Move date: ${move.move_date || 'N/A'}</p>`,
            `</div>`,
            `<p style="color:#6b7280;font-size:14px;">No action needed — payouts are processed automatically.</p>`,
            `</div>`,
          ].join('\n'),
        });
      } catch (emailErr) {
        console.error('Failed to notify driver of payout:', emailErr.message);
      }
    }

    return Response.json({
      created: true,
      payout_id: payout.id,
      driver_id: driverId,
      amount: payoutAmount,
      currency: move.currency || 'USD',
    });
  } catch (error) {
    console.error('auto-create-driver-payout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});