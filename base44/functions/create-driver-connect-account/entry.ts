import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const syncOnly = body?.sync_only === true;

    const profiles = await base44.entities.DriverProfile.filter({ email: user.email });
    if (profiles.length === 0) {
      return Response.json({ error: 'No driver profile found' }, { status: 404 });
    }
    const profile = profiles[0];

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || new URL(req.url).origin;

    let accountId = profile.stripe_account_id;
    let payoutsEnabled = profile.stripe_payouts_enabled;

    // Sync account status from Stripe if account exists
    if (accountId) {
      try {
        const account = await stripe.accounts.retrieve(accountId);
        payoutsEnabled = account.charges_enabled && account.details_submitted;
        if (profile.stripe_payouts_enabled !== payoutsEnabled) {
          await base44.entities.DriverProfile.update(profile.id, {
            stripe_payouts_enabled: payoutsEnabled,
          });
        }
      } catch (e) {
        console.error('Failed to sync Stripe account status:', e.message);
      }
    }

    // Sync-only mode: return current status without creating onboarding link
    if (syncOnly) {
      return Response.json({
        stripe_account_id: accountId,
        stripe_payouts_enabled: payoutsEnabled,
      });
    }

    // Create Stripe Express account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        metadata: {
          driver_profile_id: profile.id,
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
        },
      });
      accountId = account.id;
      await base44.entities.DriverProfile.update(profile.id, {
        stripe_account_id: accountId,
      });
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: origin + '/driver-hub?stripe=refresh',
      return_url: origin + '/driver-hub?stripe=success',
      type: 'account_onboarding',
    });

    return Response.json({ url: accountLink.url, account_id: accountId });
  } catch (error) {
    console.error('Connect account error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});