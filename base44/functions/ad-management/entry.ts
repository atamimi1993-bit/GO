import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create_ad_checkout') {
      const { advertiser_name, advertiser_email, title, description, target_url, image_url, placement, audience } = body;
      if (!advertiser_name || !advertiser_email || !title || !placement) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      const origin = req.headers.get('origin') || 'https://app.base44.com';

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: 'price_1TpVWrPfPgvdgUUgFZlwOIx', quantity: 1 }],
        success_url: `${origin}/admin?ad=success`,
        cancel_url: `${origin}/admin?ad=cancelled`,
        customer_email: advertiser_email,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          advertiser_name,
          advertiser_email,
          title,
          description: description || '',
          target_url: target_url || '',
          image_url: image_url || '',
          placement,
          audience: audience || 'all',
          type: 'ad_space',
        },
      });

      return Response.json({ checkout_url: session.url });
    }

    if (action === 'get_active_ads') {
      const ads = await base44.asServiceRole.entities.AdSlot.filter({
        status: 'active',
      }, '-created_date', 50);
      return Response.json({ ads });
    }

    if (action === 'pause_ad') {
      const { ad_id } = body;
      await base44.asServiceRole.entities.AdSlot.update(ad_id, { status: 'paused' });
      return Response.json({ success: true });
    }

    if (action === 'resume_ad') {
      const { ad_id } = body;
      await base44.asServiceRole.entities.AdSlot.update(ad_id, { status: 'active' });
      return Response.json({ success: true });
    }

    if (action === 'track_impression') {
      const { ad_id } = body;
      const ads = await base44.asServiceRole.entities.AdSlot.filter({ id: ad_id });
      if (ads.length > 0) {
        const ad = ads[0];
        await base44.asServiceRole.entities.AdSlot.update(ad_id, {
          impressions: (ad.impressions || 0) + 1,
        });
      }
      return Response.json({ success: true });
    }

    if (action === 'track_click') {
      const { ad_id } = body;
      const ads = await base44.asServiceRole.entities.AdSlot.filter({ id: ad_id });
      if (ads.length > 0) {
        const ad = ads[0];
        await base44.asServiceRole.entities.AdSlot.update(ad_id, {
          clicks: (ad.clicks || 0) + 1,
        });
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Ad management error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});