import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { form_name, identifier } = body;

    // Extract IP from request headers
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : (req.headers.get('x-real-ip') || 'unknown');

    if (!form_name) {
      return Response.json({ error: 'form_name is required' }, { status: 400 });
    }

    // Rate limit configuration per form type
    const LIMITS = {
      login: { maxAttempts: 5, windowMinutes: 15 },
      register: { maxAttempts: 3, windowMinutes: 60 },
      new_move: { maxAttempts: 5, windowMinutes: 30 },
      default: { maxAttempts: 10, windowMinutes: 15 },
    };

    const config = LIMITS[form_name] || LIMITS.default;
    const windowMs = config.windowMinutes * 60 * 1000;
    const since = new Date(Date.now() - windowMs).toISOString();

    // Query recent security events for this IP + form
    const key = identifier || ip;
    const recentEvents = await base44.asServiceRole.entities.SecurityEvent.filter(
      {
        form_name,
        $or: [
          { ip_address: ip },
          { user_email: identifier || '' },
        ],
      },
      '-created_date',
      config.maxAttempts + 5
    );

    // Count rate-limit events within the window
    const recentCount = recentEvents.filter(
      (e) => e.event_type === 'rate_limit_exceeded' || e.event_type === 'failed_login' || e.event_type === 'blocked_request'
    ).filter((e) => new Date(e.created_date) > new Date(since)).length;

    const blocked = recentCount >= config.maxAttempts;

    if (blocked) {
      // Log the blocked attempt
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'blocked_request',
        ip_address: ip,
        form_name,
        details: `Rate limit exceeded for ${form_name} — ${recentCount} attempts in ${config.windowMinutes}min`,
        severity: 'high',
      });
    }

    return Response.json({
      allowed: !blocked,
      attempts: recentCount,
      limit: config.maxAttempts,
      windowMinutes: config.windowMinutes,
      form_name,
    });
  } catch (error) {
    // On error, allow the request through (fail open) so legitimate users aren't blocked by a bug
    console.error('Rate limit check failed:', error.message);
    return Response.json({ allowed: true, error: error.message }, { status: 200 });
  }
});