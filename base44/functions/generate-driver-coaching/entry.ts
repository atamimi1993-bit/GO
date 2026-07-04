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
    const { driver_profile_id } = body;

    if (!driver_profile_id) {
      return Response.json({ error: 'driver_profile_id is required' }, { status: 400 });
    }

    // Fetch driver profile
    const driver = await base44.asServiceRole.entities.DriverProfile.get(driver_profile_id);
    if (!driver) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Fetch driver's recent moves
    const moves = await base44.asServiceRole.entities.MoveRequest.filter({
      assigned_driver_id: driver_profile_id,
    }, '-created_date', 50);

    // Fetch ratings for this driver
    const ratings = await base44.asServiceRole.entities.Rating.filter({
      direction: 'customer_to_driver',
      ratee_id: driver_profile_id,
    }, '-created_date', 20);

    // Calculate metrics
    const completedMoves = moves.filter(m => m.status === 'completed');
    const cancelledMoves = moves.filter(m => m.status === 'cancelled');
    const acceptanceRate = moves.length > 0
      ? Math.round((completedMoves.length / moves.length) * 100)
      : 0;
    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + (r.stars || 0), 0) / ratings.length).toFixed(1)
      : driver.rating?.toFixed(1) || 'N/A';
    const recentComments = ratings
      .filter(r => r.comment)
      .slice(0, 5)
      .map(r => `${r.stars}★: ${r.comment}`);

    const prompt = `You are an expert driver performance coach for GO, a moving & logistics marketplace platform. Analyze the following driver's performance data and generate a personalized coaching report.

## Driver Profile
- Name: ${driver.full_name}
- Status: ${driver.status}
- Vehicle: ${driver.vehicle_category || 'N/A'}
- CDL: ${driver.cdl_certified ? `${driver.cdl_class}` : 'None'}
- Service area: ${driver.service_area || 'N/A'}
- Background check: ${driver.background_check_status}

## Performance Metrics
- Total jobs: ${driver.total_jobs}
- Completed jobs: ${completedMoves.length}
- Cancelled jobs: ${cancelledMoves.length}
- Acceptance rate: ${acceptanceRate}%
- Average rating: ${avgRating} / 5.0
- Total earnings: $${(driver.total_earnings || 0).toFixed(2)}
- Available: ${driver.available ? 'Yes' : 'No'}

## Recent Customer Feedback
${recentComments.length > 0 ? recentComments.join('\n') : 'No recent comments'}

## Recent Job History (last ${Math.min(moves.length, 10)} jobs)
${moves.slice(0, 10).map(m => `- ${m.status}: ${m.pickup_address} → ${m.dropoff_address} ($${(m.total_price || 0).toFixed(2)})`).join('\n') || 'No recent jobs'}

Generate a coaching report with these sections:
1. **Performance Summary**: Brief overview of how the driver is doing
2. **Strengths**: What they're doing well (be specific based on the data)
3. **Areas for Improvement**: Where they can improve (based on metrics and feedback)
4. **Action Items**: 3-5 specific, actionable steps they should take this week
5. **Earning Potential**: How much more they could earn by following the advice

Be encouraging but honest. Use the actual data to make it personal. If the driver is doing great, celebrate that. If they need help, be constructive.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          performance_summary: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          areas_for_improvement: { type: 'array', items: { type: 'string' } },
          action_items: { type: 'array', items: { type: 'string' } },
          earning_potential: { type: 'string' },
          overall_score: { type: 'number', description: 'Performance score 0-100' },
        },
        required: ['performance_summary', 'strengths', 'areas_for_improvement', 'action_items'],
      },
    });

    // Send coaching notification to the driver
    if (driver.email) {
      try {
        await base44.asServiceRole.entities.AppNotification.create({
          user_email: driver.email,
          title: '📊 Your Performance Coaching Report',
          body: result.performance_summary?.substring(0, 200) || 'Your coaching report is ready. Check your driver dashboard for personalized tips to improve your earnings.',
          type: 'info',
          icon: 'TrendingUp',
          link: '/driver-dashboard',
        });
      } catch (notifErr) {
        console.error('Failed to send coaching notification:', notifErr);
      }
    }

    return Response.json({
      driver: { id: driver.id, name: driver.full_name, rating: avgRating, total_jobs: driver.total_jobs, total_earnings: driver.total_earnings },
      coaching: result,
    });
  } catch (error) {
    console.error('Driver coaching generation failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});