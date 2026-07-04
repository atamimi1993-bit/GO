import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALL_MARKETS = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
  'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Boston, MA',
  'Atlanta, GA', 'Miami, FL', 'Nashville, TN', 'Portland, OR',
];

const DRIVER_TYPES = [
  { key: 'cdl_a', label: 'CDL Class A drivers' },
  { key: 'cdl_b', label: 'CDL Class B drivers' },
  { key: 'box_truck', label: 'box truck drivers (non-CDL)' },
  { key: 'certified_mover', label: 'certified professional movers' },
];

function getRotatingMarkets(count = 6) {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const offset = (dayOfYear * count) % ALL_MARKETS.length;
  const markets = [];
  for (let i = 0; i < count; i++) {
    markets.push(ALL_MARKETS[(offset + i) % ALL_MARKETS.length]);
  }
  return markets;
}

function getRotatingDriverLocations(count = 3) {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const locations = [];
  for (let i = 0; i < count; i++) {
    locations.push(ALL_MARKETS[(dayOfYear + i * 3) % ALL_MARKETS.length]);
  }
  return locations;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetLeads = body.target_leads || 50;
    const targetDrivers = body.target_drivers || 50;

    const markets = body.markets || getRotatingMarkets(6);
    const driverLocations = getRotatingDriverLocations(3);

    // === LEADS ===
    let totalLeadsFound = 0;
    let totalLeadsCreated = 0;
    const leadPerMarket = [];

    for (const location of markets) {
      if (totalLeadsFound >= targetLeads) break;
      try {
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
- lead_name, lead_type (person/business), contact_info, source, location, moving_reason, move_timeline, priority (high/medium/low)

Return up to 12 realistic, relevant leads. Do not fabricate contact details.`;

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
            search_query: `Daily acquisition blast — ${location}`,
          }));
          const created = await base44.asServiceRole.entities.Lead.bulkCreate(leadsToCreate);
          totalLeadsFound += leads.length;
          totalLeadsCreated += created.length;
          leadPerMarket.push({ location, found: leads.length, created: created.length });
        } else {
          leadPerMarket.push({ location, found: 0, created: 0 });
        }
      } catch (err) {
        console.error(`Lead search failed for ${location}:`, err.message);
        leadPerMarket.push({ location, found: 0, created: 0, error: err.message });
      }
    }

    // === DRIVERS ===
    let totalDriversFound = 0;
    const driverPerSearch = [];

    for (const dt of DRIVER_TYPES) {
      if (totalDriversFound >= targetDrivers) break;
      for (const location of driverLocations) {
        if (totalDriversFound >= targetDrivers) break;
        try {
          const prompt = `You are a driver sourcing assistant for "GO", a moving and hauling marketplace platform.

Search the web for ${dt.label} in or near "${location}" who might be interested in joining a flexible driving gig platform.

Look for:
- CDL drivers on job boards, forums, and social media (Indeed, TruckersReport, CDL Life, CDLjobs.com)
- Certified professional movers with experience
- Box truck operators looking for work
- Driver communities and Facebook groups where drivers gather
- Recent CDL school graduates looking for their first gig
- Independent owner-operators who might want extra income

For each result, provide:
- name, type (driver/community/school), cdl_class, certification, location, platform, profile_url, notes, contact_approach

Return up to 15 realistic, relevant results. Do not fabricate URLs.`;

          const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: true,
            model: 'gemini_3_flash',
            response_json_schema: {
              type: 'object',
              properties: {
                drivers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string', enum: ['driver', 'community', 'school'] },
                      cdl_class: { type: 'string' },
                      certification: { type: 'string' },
                      location: { type: 'string' },
                      platform: { type: 'string' },
                      profile_url: { type: 'string' },
                      notes: { type: 'string' },
                      contact_approach: { type: 'string' },
                    },
                  },
                },
                recommended_platforms: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      url: { type: 'string' },
                      description: { type: 'string' },
                      posting_url: { type: 'string' },
                    },
                  },
                },
              },
            },
          });

          const drivers = (llmResponse && llmResponse.drivers) || [];
          totalDriversFound += drivers.length;
          driverPerSearch.push({
            driver_type: dt.key,
            location,
            found: drivers.length,
            drivers: drivers.slice(0, 5), // preview only to keep response small
          });
        } catch (err) {
          console.error(`Driver search failed for ${dt.label} in ${location}:`, err.message);
          driverPerSearch.push({ driver_type: dt.key, location, found: 0, error: err.message });
        }
      }
    }

    const leadGoalMet = totalLeadsFound >= targetLeads;
    const driverGoalMet = totalDriversFound >= targetDrivers;

    return Response.json({
      date: new Date().toISOString(),
      markets_searched: markets,
      driver_locations: driverLocations,
      leads: {
        target: targetLeads,
        found: totalLeadsFound,
        created: totalLeadsCreated,
        goal_met: leadGoalMet,
        per_market: leadPerMarket,
      },
      drivers: {
        target: targetDrivers,
        found: totalDriversFound,
        goal_met: driverGoalMet,
        per_search: driverPerSearch,
      },
      goals_met: leadGoalMet && driverGoalMet,
    });
  } catch (error) {
    console.error('daily-acquisition-blast error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});