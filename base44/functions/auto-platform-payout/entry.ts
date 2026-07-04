import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

// Automatically deposits the platform's available Stripe balance to the linked
// bank account via instant payout. Triggered by the WeeklyPlatformPayout workflow.
// Uses service-role auth (no user token needed) — safe for scheduled invocation.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only — prevents unauthorized users from triggering instant balance payouts
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await base44.auth.me();
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Fetch the platform's available + pending balance
    const balance = await stripe.balance.retrieve();
    const available = balance.available || [];
    const availableAmount = available.reduce((sum, b) => sum + (b.amount || 0), 0);
    const availableCurrency = available[0]?.currency || 'usd';
    const pendingAmount = (balance.pending || []).reduce((sum, b) => sum + (b.amount || 0), 0);

    // Nothing to pay out — skip silently
    if (availableAmount <= 0) {
      console.log('auto-platform-payout: no available balance, skipping.');
      return Response.json({
        skipped: true,
        reason: 'No available balance',
        available_amount: 0,
        pending_amount: pendingAmount,
      });
    }

    // Create the instant payout
    const payout = await stripe.payouts.create({
      amount: availableAmount,
      currency: availableCurrency,
      method: 'instant',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        source: 'auto_platform_payout',
      },
    });

    console.log('Auto platform payout created:', payout.id, 'amount:', availableAmount, availableCurrency);

    // Notify admins that the payout was processed
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const fmtAmt = (value) => {
        const v = (value || 0) / 100;
        return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };
      for (const admin of admins) {
        if (!admin.email) continue;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `Auto-deposit of ${fmtAmt(availableAmount)} initiated`,
          body: [
            '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">',
            '<h2 style="color:#16a34a;">Scheduled payout processed</h2>',
            `<p>Your weekly automatic deposit of <strong>${fmtAmt(availableAmount)} ${availableCurrency.toUpperCase()}</strong> has been initiated and is on its way to your linked bank account.</p>`,
            '<div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:20px 0;">',
            '<p style="margin:0;color:#6b7280;font-size:14px;">Payout details</p>',
            `<p style="margin:4px 0 0;font-weight:600;">Payout ID: ${payout.id}</p>`,
            `<p style="margin:4px 0 0;color:#6b7280;font-size:14px;">Status: ${payout.status}</p>`,
            `<p style="margin:4px 0 0;color:#6b7280;font-size:14px;">Method: Instant</p>`,
            '</div>',
            '<p style="color:#6b7280;font-size:14px;">This is an automated weekly payout. No action needed.</p>',
            '</div>',
          ].join('\n'),
        });
      }
    } catch (emailErr) {
      console.error('Failed to notify admins of auto payout:', emailErr.message);
    }

    return Response.json({
      success: true,
      payout_id: payout.id,
      amount: availableAmount,
      currency: availableCurrency,
      status: payout.status,
      method: payout.method,
    });
  } catch (error) {
    console.error('auto-platform-payout error:', error.message, error.code);
    return Response.json({
      error: error.message,
      code: error.code || null,
      type: error.type || null,
    }, { status: 500 });
  }
});