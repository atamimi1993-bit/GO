import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const now = new Date();
    const campaignEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Deactivate old ads
    await base44.asServiceRole.entities.PromotionalAd.updateMany(
      { active: true },
      { $set: { active: false } }
    );

    // Generate ad content + promo codes via LLM
    const adPrompt = `You are the marketing engine for "GO", a global moving and hauling marketplace platform.
Generate 3 fresh promotional ad campaigns for the next 2 weeks (starting ${now.toISOString()}).

Each campaign should target a different angle:
1. A seasonal/timely promo (e.g. summer moving season, back-to-school, holiday special)
2. A new-customer discount promo (first-time movers)
3. A high-value/freight promo (large moves, corporate logistics)

For each ad, provide:
- headline: Punchy, attention-grabbing headline (max 60 chars)
- subtext: Supporting text explaining the offer (max 120 chars)
- cta_text: Short call-to-action button text (max 20 chars, e.g. "Claim Offer", "Book Now")
- cta_link: Always "/new-move"
- ad_type: "promo", "banner", or "spotlight" (vary them)
- promo_code: A catchy, memorable promo code (uppercase, no spaces, e.g. "SUMMER25")
- discount_percent: The discount percentage (between 5 and 30)
- bg_color: A Tailwind color name for the ad background (e.g. "emerald", "blue", "amber", "rose", "violet")

Make the copy energetic, trustworthy, and action-oriented. Vary the tone between ads.`;

    const adResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: adPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          ads: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                headline: { type: 'string' },
                subtext: { type: 'string' },
                cta_text: { type: 'string' },
                cta_link: { type: 'string' },
                ad_type: { type: 'string', enum: ['promo', 'banner', 'spotlight'] },
                promo_code: { type: 'string' },
                discount_percent: { type: 'number' },
                bg_color: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const ads = (adResponse && adResponse.ads) || [];
    if (ads.length === 0) {
      return Response.json({ error: 'No ads generated' }, { status: 500 });
    }

    // Create promo codes for each ad
    const promoCodes = ads.map((ad) => ({
      code: ad.promo_code,
      discount_percent: ad.discount_percent,
      active: true,
      max_uses: 100,
      uses_count: 0,
      description: ad.headline,
    }));
    await base44.asServiceRole.entities.PromoCode.bulkCreate(promoCodes);

    // Create ad records
    const adsToCreate = ads.map((ad) => ({
      headline: ad.headline,
      subtext: ad.subtext,
      cta_text: ad.cta_text || 'Claim Offer',
      cta_link: ad.cta_link || '/new-move',
      ad_type: ad.ad_type || 'promo',
      promo_code: ad.promo_code,
      discount_percent: ad.discount_percent,
      bg_color: ad.bg_color || 'emerald',
      active: true,
      campaign_start: now.toISOString(),
      campaign_end: campaignEnd.toISOString(),
    }));
    const createdAds = await base44.asServiceRole.entities.PromotionalAd.bulkCreate(adsToCreate);

    // Auto-generate leads from marketing sources
    const leadPrompt = `You are a lead generation assistant for "GO", a moving and hauling marketplace platform.
Search the web for people, families, or businesses who are likely to need moving services soon.

Look for:
- Real estate listings (homes for sale/rent — buyers/tenants need to move)
- Apartment complexes with availability (tenant turnover)
- People or businesses posting about relocating
- Businesses announcing office relocations or expansions
- College/university housing turnover
- New construction or development announcements

For each lead, provide:
- lead_name: Name of the person, business, listing, or property
- lead_type: "person" or "business"
- contact_info: Any publicly available contact info or "Not publicly available"
- source: The URL or platform where this lead was found
- location: The specific city/neighborhood/area
- moving_reason: Why they likely need moving services (1 sentence)
- move_timeline: Estimated timing or "Unknown"
- priority: "high", "medium", or "low"

Return up to 15 realistic leads. Do not fabricate contact details.`;

    const leadResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: leadPrompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          leads: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                lead_name: { type: 'string' },
                lead_type: { type: 'string', enum: ['person', 'business'] },
                contact_info: { type: 'string' },
                source: { type: 'string' },
                location: { type: 'string' },
                moving_reason: { type: 'string' },
                move_timeline: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              },
            },
          },
        },
      },
    });

    const leads = (leadResponse && leadResponse.leads) || [];
    let createdLeads = 0;
    if (leads.length > 0) {
      const leadsToCreate = leads.map((l) => ({
        lead_name: l.lead_name || 'Unknown',
        lead_type: l.lead_type || 'person',
        contact_info: l.contact_info || 'Not publicly available',
        source: l.source || 'Auto-generated campaign',
        location: l.location || 'Unknown',
        moving_reason: l.moving_reason || '',
        move_timeline: l.move_timeline || 'Unknown',
        priority: l.priority || 'medium',
        status: 'new',
        search_query: 'Biweekly auto-generation',
      }));
      const created = await base44.asServiceRole.entities.Lead.bulkCreate(leadsToCreate);
      createdLeads = created.length;
    }

    // Update the first ad with leads count
    if (createdAds.length > 0) {
      await base44.asServiceRole.entities.PromotionalAd.update(createdAds[0].id, {
        leads_generated: createdLeads,
      });
    }

    return Response.json({
      ads_generated: createdAds.length,
      promo_codes_created: promoCodes.length,
      leads_generated: createdLeads,
      campaign_start: now.toISOString(),
      campaign_end: campaignEnd.toISOString(),
      ads: createdAds,
    });
  } catch (error) {
    console.error('generate-ads error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});