import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === 'create_checkout') {
      const { tier } = body;
      if (!['pro', 'elite'].includes(tier)) {
        return Response.json({ error: 'Invalid tier' }, { status: 400 });
      }

      const inIframe = req.headers.get('x-frame-options') !== null || req.headers.get('sec-fetch-dest') === 'iframe';
      if (inIframe) {
        return Response.json({ error: 'Checkout is only available from the published app.' }, { status: 403 });
      }

      const priceMap = {
        pro: 'price_1TpVWrPfPgvdgUUgVmtkefDa',
        elite: 'price_1TpVWrPfPgvdgUUg2ODONZYJ',
      };

      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      const origin = req.headers.get('origin') || 'https://app.base44.com';

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceMap[tier], quantity: 1 }],
        success_url: `${origin}/driver-dashboard?upgrade=success&tier=${tier}`,
        cancel_url: `${origin}/driver-dashboard?upgrade=cancelled`,
        customer_email: user.email,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          driver_email: user.email,
          tier,
          type: 'driver_subscription',
        },
      });

      return Response.json({ checkout_url: session.url });
    }

    if (action === 'get_status') {
      const subs = await base44.entities.DriverSubscription.filter({ driver_email: user.email });
      if (subs.length === 0) {
        return Response.json({ tier: 'free', jobs_this_month: 0, jobs_limit: 3, status: 'active' });
      }
      return Response.json(subs[0]);
    }

    if (action === 'cancel') {
      const subs = await base44.entities.DriverSubscription.filter({ driver_email: user.email });
      if (subs.length === 0) return Response.json({ error: 'No subscription found' }, { status: 404 });
      const sub = subs[0];
      if (!sub.stripe_subscription_id) return Response.json({ error: 'No Stripe subscription' }, { status: 400 });

      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      await stripe.subscriptions.del(sub.stripe_subscription_id);
      await base44.entities.DriverSubscription.update(sub.id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Driver subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});