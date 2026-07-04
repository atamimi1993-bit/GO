import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require admin auth — instant payouts move real money
    let user;
    try {
      user = await base44.auth.me();
    } catch (authErr) {
      console.error('create-instant-payout auth failed:', authErr.message);
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let trustedUser;
    try {
      trustedUser = await base44.entities.User.get(user.id);
    } catch (lookupErr) {
      console.error('create-instant-payout user lookup failed:', lookupErr.message);
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
    if (!trustedUser || trustedUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Fetch the Stripe account's available + pending balance
    const balance = await stripe.balance.retrieve();
    const available = balance.available || [];
    const availableAmount = available.reduce((sum, b) => sum + (b.amount || 0), 0);
    const availableCurrency = available[0]?.currency || 'usd';
    const pendingAmount = (balance.pending || []).reduce((sum, b) => sum + (b.amount || 0), 0);

    // Default (no action) = balance check only, no payout created
    if (!body?.action || body.action === 'check') {
      return Response.json({
        available_amount: availableAmount,
        available_currency: availableCurrency,
        pending_amount: pendingAmount,
        can_payout: availableAmount > 0,
      });
    }

    // action === 'payout' = create an instant payout for the full available balance
    if (availableAmount <= 0) {
      return Response.json({
        error: 'No available balance to pay out. Funds are still pending settlement.',
        available_amount: 0,
        pending_amount: pendingAmount,
      }, { status: 400 });
    }

    const payout = await stripe.payouts.create({
      amount: availableAmount,
      currency: availableCurrency,
      method: 'instant',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        triggered_by: user.email,
      },
    });

    console.log('Instant payout created:', payout.id, 'amount:', availableAmount, availableCurrency, 'by:', user.email);

    return Response.json({
      success: true,
      payout_id: payout.id,
      amount: availableAmount,
      currency: availableCurrency,
      arrival_date: payout.arrival_date,
      status: payout.status,
      method: payout.method,
    });
  } catch (error) {
    console.error('Instant payout error:', error.message, error.code);
    return Response.json({
      error: error.message,
      code: error.code || null,
      type: error.type || null,
    }, { status: 500 });
  }
});