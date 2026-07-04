import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Public endpoint — no auth required. Only returns public-safe data
    // (no earnings, no bank details, no contact info).

    // Fetch all approved drivers
    const drivers = await base44.asServiceRole.entities.DriverProfile.filter(
      { status: 'approved' },
      '-rating',
      200
    );

    // Fetch all customer-to-driver ratings
    const ratings = await base44.asServiceRole.entities.Rating.filter(
      { direction: 'customer_to_driver' },
      '-created_date',
      500
    );

    // Group ratings by ratee_id
    const ratingsByDriver = {};
    for (const r of ratings) {
      if (!r.ratee_id) continue;
      if (!ratingsByDriver[r.ratee_id]) {
        ratingsByDriver[r.ratee_id] = { total_stars: 0, count: 0 };
      }
      ratingsByDriver[r.ratee_id].total_stars += r.stars || 0;
      ratingsByDriver[r.ratee_id].count += 1;
    }

    // Fetch completed moves to count per driver
    const completedMoves = await base44.asServiceRole.entities.MoveRequest.filter(
      { status: 'completed' },
      '-updated_date',
      500
    );

    const movesByDriver = {};
    for (const m of completedMoves) {
      if (!m.assigned_driver_id) continue;
      movesByDriver[m.assigned_driver_id] = (movesByDriver[m.assigned_driver_id] || 0) + 1;
    }

    // Build ranking entries
    const ranked = drivers.map((d) => {
      const ratingData = ratingsByDriver[d.id] || { total_stars: 0, count: 0 };
      const completedJobs = movesByDriver[d.id] || d.total_jobs || 0;
      const avgRating = ratingData.count > 0
        ? Math.round((ratingData.total_stars / ratingData.count) * 10) / 10
        : d.rating || 0;
      const reviewCount = ratingData.count;

      // Score: weighted combination of rating and completed jobs
      const score = Math.round((avgRating * 20 + Math.min(completedJobs, 50) * 0.8) * 10) / 10;

      return {
        id: d.id,
        full_name: d.full_name,
        company_name: d.company_name || null,
        profile_photo_url: d.profile_photo_url || null,
        service_area: d.service_area || null,
        cdl_certified: d.cdl_certified || false,
        cdl_class: d.cdl_class || 'None',
        avg_rating: avgRating,
        review_count: reviewCount,
        completed_jobs: completedJobs,
        score,
      };
    });

    // Sort by score descending
    ranked.sort((a, b) => b.score - a.score);

    // Assign ranks
    ranked.forEach((d, i) => { d.rank = i + 1; });

    return Response.json({ rankings: ranked });
  } catch (error) {
    console.error('driver-rankings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});