import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Scans for DriverPayout records stuck in "pending" status for more than 24 hours.
// For each one found, sends an in-app notification + email to all admins so the
// issue is visible BEFORE the weekly platform payout sweep runs.
// Triggered by the PendingPayoutAlert workflow (every 6 hours).
// Dedup: marks the payout's notes with [ADMIN_ALERTED] so it only alerts once.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only — prevents unauthorized users from scanning payout data
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find all pending payouts
    const pendingPayouts = await base44.asServiceRole.entities.DriverPayout.filter({
      status: 'pending',
    });

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago
    const stale = pendingPayouts.filter((p) => {
      const created = new Date(p.created_date);
      return created < cutoff;
    });

    // Filter out already-alerted payouts (dedup via notes marker)
    const unalerted = stale.filter((p) => {
      const notes = p.notes || '';
      return !notes.includes('[ADMIN_ALERTED]');
    });

    if (unalerted.length === 0) {
      return Response.json({
        checked: true,
        stale_count: stale.length,
        alerted: 0,
        reason: 'No new stale pending payouts to alert',
      });
    }

    // Fetch admin users for notifications
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminEmails = admins.filter((a) => a.email).map((a) => a.email);
    const fmtAmt = (v) => `$${(v || 0).toFixed(2)}`;

    let alertedCount = 0;
    for (const payout of unalerted) {
      // Fetch the related move for context
      let moveInfo = '';
      try {
        const move = await base44.asServiceRole.entities.MoveRequest.get(payout.move_request_id);
        if (move) {
          moveInfo = `${move.pickup_address || 'Pickup'} → ${move.dropoff_address || 'Dropoff'} (${move.customer_name || 'customer'})`;
        }
      } catch {
        // move may have been deleted — proceed without context
      }

      const title = `⚠️ Stale pending payout: ${fmtAmt(payout.amount)} — ${payout.driver_name || 'Unknown driver'}`;
      const body = `A DriverPayout of ${fmtAmt(payout.amount)} has been stuck in "pending" status for over 24 hours. Driver: ${payout.driver_name || 'Unknown'}. Move: ${moveInfo || payout.move_request_id}. This payout has NOT been sent to the driver. Resolve before the weekly platform payout sweep runs.`;

      // In-app notification for each admin
      for (const email of adminEmails) {
        try {
          await base44.asServiceRole.entities.AppNotification.create({
            user_email: email,
            title,
            body,
            type: 'alert',
            read: false,
            link: '/admin',
            icon: 'alert-triangle',
          });
        } catch (e) {
          console.error('Failed to create app notification for', email, ':', e.message);
        }
      }

      // Email each admin
      for (const email of adminEmails) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: title,
            body: [
              '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">',
              '<h2 style="color:#dc2626;">⚠️ Stale Pending Driver Payout</h2>',
              `<p>A driver payout of <strong>${fmtAmt(payout.amount)}</strong> has been stuck in "pending" status for over 24 hours. <strong>The driver has NOT been paid.</strong></p>`,
              '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:20px 0;">',
              '<p style="margin:0;color:#991b1b;font-size:14px;font-weight:600;">Payout details</p>',
              `<p style="margin:4px 0 0;"><strong>Amount:</strong> ${fmtAmt(payout.amount)}</p>`,
              `<p style="margin:4px 0 0;"><strong>Driver:</strong> ${payout.driver_name || 'Unknown'}</p>`,
              `<p style="margin:4px 0 0;"><strong>Move:</strong> ${moveInfo || payout.move_request_id}</p>`,
              `<p style="margin:4px 0 0;"><strong>Payout ID:</strong> ${payout.id}</p>`,
              `<p style="margin:4px 0 0;"><strong>Created:</strong> ${new Date(payout.created_date).toLocaleString()}</p>`,
              '</div>',
              '<p style="color:#dc2626;font-weight:600;">Action required: Resolve this before the weekly platform payout sweep runs — the driver\'s unpaid cut could otherwise be swept into the platform bank account.</p>',
              '<p style="color:#6b7280;font-size:14px;">Check the admin dashboard → Payouts to review and retry this payout manually.</p>',
              '</div>',
            ].join('\n'),
          });
        } catch (e) {
          console.error('Failed to send alert email to', email, ':', e.message);
        }
      }

      // Mark payout as alerted (dedup)
      try {
        await base44.asServiceRole.entities.DriverPayout.update(payout.id, {
          notes: (payout.notes || '') + ' [ADMIN_ALERTED]',
        });
      } catch (e) {
        console.error('Failed to mark payout as alerted:', e.message);
      }

      alertedCount++;
    }

    return Response.json({
      checked: true,
      stale_count: stale.length,
      alerted: alertedCount,
    });
  } catch (error) {
    console.error('check-pending-payouts error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});