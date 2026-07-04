import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const moveId = body.move_request_id;
    if (!moveId) return Response.json({ error: 'move_request_id is required' }, { status: 400 });

    const move = await base44.asServiceRole.entities.MoveRequest.get(moveId);
    if (!move) return Response.json({ error: 'Move not found' }, { status: 404 });
    if (move.status !== 'completed') return Response.json({ skipped: true, reason: 'Move not completed' });

    const email = move.customer_email;
    if (!email) return Response.json({ skipped: true, reason: 'No customer email on move' });

    // 1 point per $1 spent
    const pointsToAward = Math.round(move.discounted_total > 0 ? move.discounted_total : (move.total_price || 0));
    if (pointsToAward <= 0) return Response.json({ skipped: true, reason: 'No spend to award points for' });

    // Find or create loyalty account
    const existing = await base44.asServiceRole.entities.LoyaltyAccount.filter({ user_email: email });
    let account = existing[0];

    // Prevent double-awarding for the same move
    if (account && account.last_awarded_move_id === moveId) {
      return Response.json({ skipped: true, reason: 'Points already awarded for this move', account });
    }

    if (account) {
      account = await base44.asServiceRole.entities.LoyaltyAccount.update(account.id, {
        total_points: (account.total_points || 0) + pointsToAward,
        moves_completed: (account.moves_completed || 0) + 1,
        last_awarded_move_id: moveId,
      });
    } else {
      account = await base44.asServiceRole.entities.LoyaltyAccount.create({
        user_email: email,
        total_points: pointsToAward,
        moves_completed: 1,
        last_awarded_move_id: moveId,
      });
    }

    return Response.json({
      awarded: pointsToAward,
      total_points: account.total_points,
      moves_completed: account.moves_completed,
      account_id: account.id,
    });
  } catch (error) {
    console.error('award-loyalty-points error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});