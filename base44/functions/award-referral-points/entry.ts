import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const REFERRAL_BONUS_POINTS = 500;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require authentication — allows admin users or workflow (service-role) invocations
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { move_request_id } = body;
    if (!move_request_id) {
      return Response.json({ error: 'move_request_id is required' }, { status: 400 });
    }

    const move = await base44.asServiceRole.entities.MoveRequest.get(move_request_id);
    if (!move) return Response.json({ error: 'Move not found' }, { status: 404 });
    if (move.status !== 'completed') {
      return Response.json({ skipped: true, reason: 'Move not completed' });
    }

    const code = move.referral_code;
    if (!code) {
      return Response.json({ skipped: true, reason: 'No referral code on this move' });
    }

    const referredEmail = move.customer_email;
    if (!referredEmail) {
      return Response.json({ skipped: true, reason: 'No customer email on move' });
    }

    // Find the referrer's loyalty account by the referral code
    const referrerAccounts = await base44.asServiceRole.entities.LoyaltyAccount.filter({ referral_code: code });
    const referrerAccount = referrerAccounts[0];
    if (!referrerAccount) {
      return Response.json({ skipped: true, reason: 'Referrer account not found for code: ' + code });
    }

    // Can't refer yourself
    if (referrerAccount.user_email === referredEmail) {
      return Response.json({ skipped: true, reason: 'Cannot refer yourself' });
    }

    // Check if referral was already rewarded for this move
    const existing = await base44.asServiceRole.entities.Referral.filter({ move_request_id });
    if (existing.length > 0 && existing[0].status === 'rewarded') {
      return Response.json({ skipped: true, reason: 'Referral bonus already awarded for this move' });
    }

    // Award bonus points to referrer
    const updated = await base44.asServiceRole.entities.LoyaltyAccount.update(referrerAccount.id, {
      total_points: (referrerAccount.total_points || 0) + REFERRAL_BONUS_POINTS,
    });

    // Create or update the referral record
    if (existing.length > 0) {
      await base44.asServiceRole.entities.Referral.update(existing[0].id, {
        status: 'rewarded',
        bonus_points: REFERRAL_BONUS_POINTS,
        referrer_email: referrerAccount.user_email,
        referral_code: code,
      });
    } else {
      await base44.asServiceRole.entities.Referral.create({
        referral_code: code,
        referrer_email: referrerAccount.user_email,
        referred_email: referredEmail,
        move_request_id,
        status: 'rewarded',
        bonus_points: REFERRAL_BONUS_POINTS,
      });
    }

    // Notify the referrer
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: referrerAccount.user_email,
        subject: `You earned ${REFERRAL_BONUS_POINTS} bonus points! 🎉`,
        body: [
          `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
          `<h2 style="color:#16a34a;">Referral Bonus Earned!</h2>`,
          `<p>Your friend just completed their move using your referral code <strong>${code}</strong>.</p>`,
          `<p>You've earned <strong>${REFERRAL_BONUS_POINTS} bonus loyalty points</strong> — added to your GO Rewards balance.</p>`,
          `<p>Your new total: <strong>${updated.total_points.toLocaleString()} points</strong>.</p>`,
          `<p style="color:#6b7280;margin-top:24px;">Keep sharing your code to earn more rewards!</p>`,
          `</div>`,
        ].join('\n'),
      });
    } catch (err) {
      console.error('Failed to send referral email:', err.message);
    }

    return Response.json({
      awarded: true,
      bonus_points: REFERRAL_BONUS_POINTS,
      referrer_email: referrerAccount.user_email,
      referrer_total_points: updated.total_points,
    });
  } catch (error) {
    console.error('award-referral-points error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});