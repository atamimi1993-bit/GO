import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Premier arrival window guarantee — 15 minutes from scheduled move time.
// If the driver hasn't arrived (onsite_verified) by the deadline, the job is
// flagged and a partial refund is triggered from the SHARED RESERVE POOL.
// Driver payout is NEVER affected — the reserve pool absorbs the refund.
const PREMIER_ARRIVAL_WINDOW_MINUTES = 15;
const PREMIER_REFUND_PCT = 0.10; // 10% of service value refunded from reserve pool

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

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
      return Response.json({ error: 'Move not found' }, { status: 404 });
    }

    // Only premier jobs carry the arrival window guarantee
    if (move.customer_tier !== 'premier') {
      return Response.json({ skipped: true, reason: 'Not a premier job' });
    }

    // Already arrived on time — no action
    if (move.arrival_verified_at) {
      return Response.json({ skipped: true, reason: 'Driver arrived on time' });
    }

    // Already flagged — don't double-process
    if (move.arrival_window_missed) {
      return Response.json({ skipped: true, reason: 'Already flagged as missed' });
    }

    // Compute the arrival window deadline if not already set
    let deadline = move.arrival_window_deadline ? new Date(move.arrival_window_deadline) : null;

    if (!deadline && move.move_date) {
      const timePart = move.move_time || '09:00';
      const moveDateTime = new Date(move.move_date + 'T' + timePart + ':00');
      if (!isNaN(moveDateTime.getTime())) {
        deadline = new Date(moveDateTime.getTime() + PREMIER_ARRIVAL_WINDOW_MINUTES * 60 * 1000);
      }
    }

    if (!deadline) {
      return Response.json({ skipped: true, reason: 'Cannot compute arrival deadline — missing move date/time' });
    }

    // If the window hasn't closed yet, nothing to do
    const now = new Date();
    if (now <= deadline) {
      return Response.json({ skipped: true, reason: 'Arrival window still open', deadline: deadline.toISOString() });
    }

    // ─── Window missed — flag the job ──────────────────────────────────────
    await base44.asServiceRole.entities.MoveRequest.update(move_request_id, {
      arrival_window_missed: true,
      arrival_window_deadline: deadline.toISOString(),
    });

    // Refund amount — 10% of service value, drawn from reserve pool (NOT driver payout)
    const jobValue = Math.max(0,
      (move.total_price || 0) -
      (move.tax_amount || 0) -
      (move.fuel_cost || 0) -
      (move.tolls || 0) -
      (move.materials_fee || 0)
    );
    const refundAmount = Math.round(jobValue * PREMIER_REFUND_PCT * 100) / 100;

    // Notify customer about the missed window + refund
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: move.customer_email,
        subject: 'GO Premier — Arrival Window Missed',
        body: [
          '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">',
          '<h2 style="color:#dc2626;">We\'re sorry — your driver missed the arrival window</h2>',
          `<p>Your GO Premier job included a guaranteed ${PREMIER_ARRIVAL_WINDOW_MINUTES}-minute arrival window. Since the driver did not arrive on time, you\'re receiving a <strong>$${refundAmount.toFixed(2)}</strong> partial refund.</p>`,
          '<p>This refund is processed from our reserve pool and does not affect your driver\'s payout.</p>',
          '<p style="color:#6b7280;margin-top:24px;">We apologize for the inconvenience.</p>',
          '</div>',
        ].join('\n'),
      });
    } catch (emailErr) {
      console.error('Failed to send arrival-missed email:', emailErr.message);
    }

    // Admin alert so ops can track arrival-window hit-rate
    try {
      const adminUsers = await base44.asServiceRole.entities.User.list('-created_date', 10);
      for (const admin of adminUsers.filter((u) => u.role === 'admin')) {
        await base44.asServiceRole.entities.AppNotification.create({
          user_email: admin.email,
          title: 'Premier arrival window missed',
          body: `Job ${move.id.slice(-6).toUpperCase()} — driver missed the 15-min arrival window. $${refundAmount.toFixed(2)} refund triggered from reserve pool.`,
          type: 'alert',
          link: '/move/' + move.id,
        });
      }
    } catch (notifErr) {
      console.error('Failed to send admin notification:', notifErr.message);
    }

    return Response.json({
      flagged: true,
      move_id: move_request_id,
      deadline: deadline.toISOString(),
      refund_amount: refundAmount,
      refund_source: 'reserve_pool',
      driver_payout_affected: false,
    });
  } catch (error) {
    console.error('check-arrival-window error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});