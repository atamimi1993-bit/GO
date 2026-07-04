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
      const { lead_id } = body;
      if (!lead_id) return Response.json({ error: 'lead_id is required' }, { status: 400 });

      const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id });
      if (leads.length === 0) return Response.json({ error: 'Lead not found' }, { status: 404 });
      const lead = leads[0];

      const existing = await base44.entities.LeadPurchase.filter({
        lead_id,
        driver_email: user.email,
        status: 'purchased',
      });
      if (existing.length > 0) {
        return Response.json({ error: 'You already purchased this lead', lead_purchase: existing[0] }, { status: 409 });
      }

      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      const origin = req.headers.get('origin') || 'https://app.base44.com';

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: 'price_1TpVWrPfPgvdgUUggwHp3916', quantity: 1 }],
        success_url: `${origin}/lead-marketplace?purchase=success&lead_id=${lead_id}`,
        cancel_url: `${origin}/lead-marketplace?purchase=cancelled`,
        customer_email: user.email,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          lead_id,
          driver_email: user.email,
          type: 'lead_purchase',
        },
      });

      return Response.json({ checkout_url: session.url, session_id: session.id });
    }

    if (action === 'get_my_leads') {
      const purchases = await base44.entities.LeadPurchase.filter({
        driver_email: user.email,
      }, '-created_date', 50);
      return Response.json({ leads: purchases });
    }

    if (action === 'get_available_leads') {
      const leads = await base44.asServiceRole.entities.Lead.filter({
        status: 'new',
        assignment_status: 'unassigned',
      }, '-created_date', 50);

      const purchased = await base44.asServiceRole.entities.LeadPurchase.filter({
        driver_email: user.email,
        status: 'purchased',
      });

      const purchasedIds = new Set(purchased.map(p => p.lead_id));
      const available = leads.map(l => ({
        id: l.id,
        lead_name: l.lead_name,
        lead_type: l.lead_type,
        location: l.location,
        moving_reason: l.moving_reason,
        move_timeline: l.move_timeline,
        priority: l.priority,
        source: l.source,
        purchased: purchasedIds.has(l.id),
      }));

      return Response.json({ leads: available });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Lead marketplace error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});