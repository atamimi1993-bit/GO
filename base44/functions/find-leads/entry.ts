import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { location, keywords } = body;
    if (!location) return Response.json({ error: 'location is required' }, { status: 400 });

    const searchQuery = (keywords ? `${location} ${keywords}` : location).trim();

    const prompt = `You are a lead generation assistant for "GO", a moving and hauling marketplace platform.

Search the web for people, families, or businesses in or near "${location}" who are likely to need moving services soon.
${keywords ? `Focus especially on: ${keywords}` : ''}

Look for:
- Real estate listings (homes for sale/rent — the buyers/tenants will need to move)
- Apartment complexes with availability (tenant turnover = moving needs)
- People or businesses posting about relocating to/from the area
- Businesses announcing office relocations or expansions
- College/university housing turnover (students moving in/out)
- New construction or development announcements (people moving in)
- Classified ads or social posts about moving

For each lead, provide:
- lead_name: Name of the person, business, listing, or property
- lead_type: "person" or "business"
- contact_info: Any publicly available contact info (email, phone, website) — or "Not publicly available" if none
- source: The URL or platform where this lead was found
- location: The specific city/neighborhood/area
- moving_reason: Why they likely need moving services (1 sentence)
- move_timeline: Estimated timing if available (e.g. "Summer 2026", "Immediate") or "Unknown"
- priority: "high" (likely moving soon, clear need), "medium" ( probable need), or "low" (possible but uncertain)

Return up to 15 realistic, relevant leads. Do not fabricate contact details — if none are publicly available, say so.`;

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
    if (leads.length === 0) {
      return Response.json({ found: 0, created: 0, leads: [] });
    }

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
      search_query: searchQuery,
    }));

    const created = await base44.asServiceRole.entities.Lead.bulkCreate(leadsToCreate);

    return Response.json({
      found: leads.length,
      created: created.length,
      leads: created,
    });
  } catch (error) {
    console.error('find-leads error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});