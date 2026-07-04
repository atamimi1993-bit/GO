import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { content_type, platform, additional_context } = body;

    const validTypes = ['job_posting', 'outreach_message', 'social_post', 'recruitment_strategy'];
    if (!validTypes.includes(content_type)) {
      return Response.json(
        { error: `Invalid content_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const contentTypeLabels = {
      job_posting: 'a compelling job posting',
      outreach_message: 'a direct outreach message',
      social_post: 'an engaging social media post',
      recruitment_strategy: 'a comprehensive recruitment strategy',
    };

    const prompt = `You are a recruitment specialist for GO, a moving & logistics marketplace platform. GO connects customers who need things moved (residential moves, freight, corporate logistics, courier deliveries) with verified drivers who have their own trucks.

GO's unique selling points for drivers:
- Instant payouts via Stripe after each completed move
- Flexible schedule — drivers choose which jobs to accept
- No upfront costs or fees to join
- Sign-on bonus eligibility for qualifying drivers
- Referral bonus program (500 points when a referred driver completes their first move)
- Background check support provided
- Drivers keep 100% of tips
- Support for CDL and non-CDL drivers, box trucks, pickups, vans, and more

Task: Generate ${contentTypeLabels[content_type]} to recruit drivers for the GO platform.

${platform ? `Target platform: ${platform}` : 'Target platform: general (suitable for multiple channels)'}

${additional_context ? `Additional context from the admin: ${additional_context}` : ''}

Use web search to research:
1. Current best practices for recruiting truck drivers and movers in 2026
2. Which job boards and platforms drivers actively use (Indeed, TruckersReport, CDL Life, Facebook groups, etc.)
3. What drivers look for in job postings (pay transparency, schedule flexibility, fast payment)
4. Current market rates and competitive positioning
5. Direct URLs to job posting pages on those platforms

The driver sign-up page is at /drivers-wanted (info) and /driver-register (registration form).

Make the content compelling, specific, and ready to copy and paste. Include a clear call to action directing drivers to sign up.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'A short title for this recruitment content' },
          content: { type: 'string', description: 'The full recruitment content text, ready to copy and paste' },
          target_platforms: {
            type: 'array',
            items: { type: 'string' },
            description: 'Recommended platforms where this content should be posted'
          },
          posting_links: {
            type: 'array',
            items: { type: 'string' },
            description: 'Direct URLs to posting pages on job boards (if found via web search)'
          },
          tips: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tips for the admin on how to use this content effectively'
          },
        },
        required: ['title', 'content'],
      },
    });

    const post = await base44.entities.RecruitmentPost.create({
      title: result.title,
      content_type,
      content: result.content,
      target_platform: platform || (result.target_platforms && result.target_platforms[0]) || 'general',
      status: 'draft',
    });

    return Response.json({
      post,
      target_platforms: result.target_platforms || [],
      posting_links: result.posting_links || [],
      tips: result.tips || [],
    });
  } catch (error) {
    console.error('Driver recruitment generation failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});