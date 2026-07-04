import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TARGET_MARKETS = [
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
  'San Jose, CA',
  'Austin, TX',
  'Jacksonville, FL',
  'Fort Worth, TX',
  'Columbus, OH',
  'Charlotte, NC',
  'San Francisco, CA',
  'Indianapolis, IN',
  'Seattle, WA',
  'Denver, CO',
  'Boston, MA',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin auth if called manually
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const markets = body.markets && body.markets.length > 0 ? body.markets : TARGET_MARKETS;

    let totalFound = 0;
    let totalCreated = 0;
    const perMarket = [];

    for (const location of markets) {
      const prompt = `You are a lead generation assistant for "GO", a moving and hauling marketplace platform.
Search the web for people, families, or businesses in or near "${location}" who are likely to need moving services soon.

Look for:
- Real estate listings (homes for sale/rent — the buyers/tenants will need to move)
- Apartment complexes with availability (tenant turnover = moving needs)
- People or businesses posting about relocating to/from the area
- Businesses announcing office relocations or expansions
- College/university housing turnover (students moving in/out)
- New construction or development announcements
- Classified ads or social posts about moving

For each lead, provide:
- lead_name: Name of the person, business, listing, or property
- lead_type: "person" or "business"
- contact_info: Any publicly available contact info — or "Not publicly available" if none
- source: The URL or platform where this lead was found
- location: The specific city/neighborhood/area
- moving_reason: Why they likely need moving services (1 sentence)
- move_timeline: Estimated timing if available or "Unknown"
- priority: "high", "medium", or "low"

Return up to 10 realistic, relevant leads. Do not fabricate contact details.`;

      try {
        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
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

        const leads = (llmResponse && llmResponse.leads) || [];
        if (leads.length > 0) {
          const leadsToCreate = leads.map((l) => ({
            lead_name: l.lead_name || 'Unknown',
            lead_type: l.lead_type || 'person',
            contact_info: l.contact_info || 'Not publicly available',
            source: l.source || '',
            location: l.location || location,
            moving_reason: l.moving_reason || '',
            move_timeline: l.move_timeline || 'Unknown',
            priority: l.priority || 'medium',
            status: 'new',
            search_query: `Auto lead generation — ${location}`,
          }));
          const created = await base44.asServiceRole.entities.Lead.bulkCreate(leadsToCreate);
          totalFound += leads.length;
          totalCreated += created.length;
          perMarket.push({ location, found: leads.length, created: created.length });
        } else {
          perMarket.push({ location, found: 0, created: 0 });
        }
      } catch (err) {
        console.error(`Failed to find leads for ${location}:`, err.message);
        perMarket.push({ location, found: 0, created: 0, error: err.message });
      }
    }

    return Response.json({
      markets_searched: markets.length,
      total_found: totalFound,
      total_created: totalCreated,
      per_market: perMarket,
    });
  } catch (error) {
    console.error('auto-find-leads error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});