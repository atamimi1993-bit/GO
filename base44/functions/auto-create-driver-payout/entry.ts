import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

// Automatically creates a DriverPayout record for the driver's job earnings
// when a move is marked completed, then pays everyone out:
//   1. Driver's Stripe Connect balance → their bank account (instant payout)
//   2. Platform's available Stripe balance → admin's bank account (instant payout)
// Idempotent — won't create duplicates or double-pay.
// Triggered by the AutoDriverPayoutOnCompletion workflow.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 🔒 Admin-only — allows admin users or service-role workflow invocations
    const user = await base44.auth.me().catch(() => null);
    if (user) {
      // Direct user call — must be admin
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
    } else {
      // No user context — verify service-role authentication (workflow invocation)
      const isServiceRole = await base44.auth.isAuthenticated().catch(() => false);
      if (!isServiceRole) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
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

    const driver = await base44.asServiceRole.entities.DriverProfile.get(driverId);

    // Create the payout record — start as "processing" since we're paying now
    const payout = await base44.asServiceRole.entities.DriverPayout.create({
      driver_profile_id: driverId,
      move_request_id,
      amount: payoutAmount,
      currency: move.currency || 'USD',
      status: 'processing',
      notes: `Job earnings — ${move.customer_name || 'customer'} move on ${move.move_date || 'N/A'}`,
      deduction_reason: 'job_earnings',
    });

    // Update driver's total earnings + job count
    if (driver) {
      await base44.asServiceRole.entities.DriverProfile.update(driverId, {
        total_earnings: (driver.total_earnings || 0) + payoutAmount,
        total_jobs: (driver.total_jobs || 0) + 1,
      });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const currencyCode = (move.currency || 'USD').toLowerCase();
    const fmtAmt = (v) => `$${(v || 0).toFixed(2)}`;

    // ── 1. Pay the driver: trigger instant payout from their Connect balance ──
    let driverPayoutResult = { skipped: true, reason: 'No Stripe Connect account' };
    if (driver?.stripe_account_id && driver?.stripe_payouts_enabled) {
      try {
        // Check the driver's available balance on their Connect account
        const driverBalance = await stripe.balance.retrieve({
          stripeAccount: driver.stripe_account_id,
        });
        const driverAvailable = (driverBalance.available || []).reduce((s, b) => s + (b.amount || 0), 0);

        if (driverAvailable > 0) {
          const driverPayout = await stripe.payouts.create({
            amount: driverAvailable,
            currency: driverBalance.available?.[0]?.currency || currencyCode,
            method: 'instant',
            metadata: {
              base44_app_id: Deno.env.get('BASE44_APP_ID'),
              source: 'auto_driver_payout',
              move_request_id,
              driver_profile_id: driverId,
            },
          }, {
            stripeAccount: driver.stripe_account_id,
          });

          driverPayoutResult = {
            paid: true,
            payout_id: driverPayout.id,
            amount: driverAvailable,
            status: driverPayout.status,
          };
          console.log('Driver payout created:', driverPayout.id, 'amount:', driverAvailable, 'for driver:', driverId);
        } else {
          driverPayoutResult = { skipped: true, reason: 'Driver Connect balance is zero — funds may still be pending' };
        }
      } catch (driverPayoutErr) {
        console.error('Driver payout failed:', driverPayoutErr.message, driverPayoutErr.code);
        driverPayoutResult = { error: driverPayoutErr.message, code: driverPayoutErr.code || null };
      }
    }

    // Update the DriverPayout record status based on the payout result
    let finalStatus = 'pending';
    if (driverPayoutResult.paid) {
      finalStatus = 'paid';
    } else if (driverPayoutResult.error) {
      finalStatus = 'pending'; // leave pending so admin can retry manually
    }
    await base44.asServiceRole.entities.DriverPayout.update(payout.id, {
      status: finalStatus,
      notes: `Job earnings — ${move.customer_name || 'customer'} move on ${move.move_date || 'N/A'}. Driver payout: ${driverPayoutResult.paid ? 'paid (' + driverPayoutResult.payout_id + ')' : driverPayoutResult.skipped ? 'skipped — ' + driverPayoutResult.reason : 'failed — ' + (driverPayoutResult.error || 'unknown')}`,
    });

    // ── 2. Pay the platform: deposit available balance to admin's bank ──
    let platformPayoutResult = { skipped: true, reason: 'No available balance' };
    try {
      const platformBalance = await stripe.balance.retrieve();
      const platformAvailable = (platformBalance.available || []).reduce((s, b) => s + (b.amount || 0), 0);

      if (platformAvailable > 0) {
        const platformPayout = await stripe.payouts.create({
          amount: platformAvailable,
          currency: platformBalance.available?.[0]?.currency || currencyCode,
          method: 'instant',
          metadata: {
            base44_app_id: Deno.env.get('BASE44_APP_ID'),
            source: 'auto_platform_payout',
            move_request_id,
          },
        });

        platformPayoutResult = {
          paid: true,
          payout_id: platformPayout.id,
          amount: platformAvailable,
          status: platformPayout.status,
        };
        console.log('Platform payout created:', platformPayout.id, 'amount:', platformAvailable);
      }
    } catch (platformPayoutErr) {
      console.error('Platform payout failed:', platformPayoutErr.message, platformPayoutErr.code);
      platformPayoutResult = { error: platformPayoutErr.message, code: platformPayoutErr.code || null };
    }

    // ── 3. Notify the driver about their payment ──
    if (driver && driver.email) {
      try {
        const driverPaid = driverPayoutResult.paid;
        const driverMsg = driverPaid
          ? `Your earnings of <strong>${fmtAmt(payoutAmount)}</strong> have been paid out to your bank account.`
          : driverPayoutResult.skipped
            ? `Your earnings of <strong>${fmtAmt(payoutAmount)}</strong> are queued. Your Connect balance is still settling — the payout will be retried on the next cycle.`
            : `Your earnings of <strong>${fmtAmt(payoutAmount)}</strong> are queued. There was an issue processing the instant payout — our team has been notified.`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: driver.email,
          subject: driverPaid ? `Payment of ${fmtAmt(payoutAmount)} sent to your bank 💰` : `Payment of ${fmtAmt(payoutAmount)} is queued`,
          body: [
            `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
            `<h2 style="color:#16a34a;">${driverPaid ? 'Your payment is on the way!' : 'Your payment is queued'}</h2>`,
            `<p>Great work on the completed move for <strong>${move.customer_name || 'your customer'}</strong>.</p>`,
            `<p>${driverMsg}</p>`,
            `<div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:20px 0;">`,
            `<p style="margin:0;color:#6b7280;font-size:14px;">Move details</p>`,
            `<p style="margin:4px 0 0;font-weight:600;">${move.pickup_address || 'Pickup'} → ${move.dropoff_address || 'Dropoff'}</p>`,
            `<p style="margin:4px 0 0;color:#6b7280;font-size:14px;">Move date: ${move.move_date || 'N/A'}</p>`,
            `</div>`,
            `<p style="color:#6b7280;font-size:14px;">No action needed — payments are processed automatically when jobs complete.</p>`,
            `</div>`,
          ].join('\n'),
        });
      } catch (emailErr) {
        console.error('Failed to notify driver of payout:', emailErr.message);
      }
    }

    // ── 4. Notify admins about the platform deposit ──
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const platformPaid = platformPayoutResult.paid;
      for (const admin of admins) {
        if (!admin.email) continue;
        if (!platformPaid && platformPayoutResult.skipped) continue; // skip email if nothing to deposit

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: platformPaid ? `Auto-deposit of ${fmtAmt(platformPayoutResult.amount / 100)} initiated` : 'Platform payout issue',
          body: [
            '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">',
            `<h2 style="color:#16a34a;">${platformPaid ? 'Scheduled payout processed' : 'Payout issue detected'}</h2>`,
            platformPaid
              ? `<p>An automatic deposit of <strong>${fmtAmt(platformPayoutResult.amount / 100)}</strong> has been initiated to your linked bank account from completed job <strong>${move.customer_name || ''}</strong>.</p>`
              : `<p>An issue occurred while processing the platform payout for completed job <strong>${move.customer_name || ''}</strong>. Error: ${platformPayoutResult.error || 'unknown'}. The weekly backup payout will retry.</p>`,
            '<div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:20px 0;">',
            '<p style="margin:0;color:#6b7280;font-size:14px;">Job details</p>',
            `<p style="margin:4px 0 0;font-weight:600;">${move.pickup_address || 'Pickup'} → ${move.dropoff_address || 'Dropoff'}</p>`,
            `<p style="margin:4px 0 0;color:#6b7280;font-size:14px;">Move date: ${move.move_date || 'N/A'}</p>`,
            platformPaid ? `<p style="margin:4px 0 0;color:#6b7280;font-size:14px;">Payout ID: ${platformPayoutResult.payout_id}</p>` : '',
            '</div>',
            '<p style="color:#6b7280;font-size:14px;">This is an automated payout triggered when a job completes.</p>',
            '</div>',
          ].join('\n'),
        });
      }
    } catch (emailErr) {
      console.error('Failed to notify admins of platform payout:', emailErr.message);
    }

    return Response.json({
      created: true,
      payout_id: payout.id,
      driver_id: driverId,
      amount: payoutAmount,
      currency: move.currency || 'USD',
      driver_payout: driverPayoutResult,
      platform_payout: platformPayoutResult,
    });
  } catch (error) {
    console.error('auto-create-driver-payout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});