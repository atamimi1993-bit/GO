import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    const { location, driver_type } = body;

    const driverTypeLabel = driver_type === 'cdl_a' ? 'CDL Class A drivers'
      : driver_type === 'cdl_b' ? 'CDL Class B drivers'
      : driver_type === 'box_truck' ? 'box truck drivers (non-CDL)'
      : driver_type === 'certified_mover' ? 'certified professional movers'
      : 'CDL and certified drivers';

    const locationContext = location ? `in or near "${location}"` : 'across the United States';

    const prompt = `You are a driver sourcing assistant for "GO", a moving and hauling marketplace platform that connects customers with verified drivers who have their own trucks.

Search the web for ${driverTypeLabel} ${locationContext} who might be interested in joining a flexible driving gig platform.

Look for:
- CDL drivers on job boards, forums, and social media (Indeed, TruckersReport, CDL Life, CDLjobs.com, etc.)
- Certified professional movers with experience
- Box truck operators looking for work
- Driver communities and Facebook groups where CDL drivers gather
- Recent CDL school graduates looking for their first gig
- Independent owner-operators who might want extra income
- Drivers posting about looking for work or being between jobs
- Truck driving school directories and graduate lists

For each result, provide:
- name: Name of the driver, handle, or community
- type: "driver" (individual), "community" (group/forum), or "school" (CDL school/training program)
- cdl_class: "Class A", "Class B", "None", or "Unknown"
- certification: Any certifications mentioned (e.g., "CDL A with Hazmat", "Professional Mover Certified", "None")
- location: City/state/region if known, or "Nationwide" for online communities
- platform: Where they were found (e.g., "Indeed", "TruckersReport", "Facebook Group", "CDL Life")
- profile_url: Direct URL to the profile, post, or group if available
- notes: Why they might be a good fit for GO (1-2 sentences)
- contact_approach: Suggested way to reach out (e.g., "Direct message on forum", "Apply via Indeed", "Post in Facebook group")

Return up to 15 realistic, relevant results. Do not fabricate URLs — only include URLs that are real or likely real based on web search results. If you cannot find a direct URL, set profile_url to "Not publicly available".`;

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
    const platforms = (llmResponse && llmResponse.recommended_platforms) || [];

    return Response.json({
      found: drivers.length,
      driver_type: driverTypeLabel,
      location: location || 'Nationwide',
      drivers,
      recommended_platforms: platforms,
    });
  } catch (error) {
    console.error('find-cdl-drivers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});