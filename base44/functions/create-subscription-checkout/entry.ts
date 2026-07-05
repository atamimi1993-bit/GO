import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

// Creates a Stripe Checkout session for a business subscription plan.
// Called by business accounts to subscribe to a monthly plan.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 🔒 Auth check — reject unauthenticated requests
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { plan_id } = body;

    if (!plan_id) return Response.json({ error: 'plan_id is required' }, { status: 400 });

    // Fetch the plan
    const plans = await base44.asServiceRole.entities.SubscriptionPlan.filter({ id: plan_id, active: true });
    if (!plans || plans.length === 0) {
      return Response.json({ error: 'Plan not found' }, { status: 404 });
    }
    const plan = plans[0];

    if (!plan.stripe_price_id) {
      return Response.json({ error: 'Plan is not yet configured for payment' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || new URL(req.url).origin;

    // Check if business already has a subscription
    const existingSubs = await base44.asServiceRole.entities.BusinessSubscription.filter({
      business_email: user.email,
      status: { $in: ['active', 'trialing', 'past_due'] },
    });

    if (existingSubs && existingSubs.length > 0) {
      return Response.json({ error: 'You already have an active subscription' }, { status: 400 });
    }

    // Find or create the business account
    let businessAccounts = await base44.asServiceRole.entities.BusinessAccount.filter({
      account_owner_email: user.email,
    });
    let businessAccountId = businessAccounts?.[0]?.id || null;
    let businessName = businessAccounts?.[0]?.business_name || user.full_name || 'Business';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: origin + '/business-account?subscription=success',
      cancel_url: origin + '/business-plans?subscription=cancelled',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        plan_id: plan.id,
        plan_tier: plan.tier,
        plan_name: plan.name,
        business_email: user.email,
        business_account_id: businessAccountId || '',
        business_name: businessName,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('create-subscription-checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});