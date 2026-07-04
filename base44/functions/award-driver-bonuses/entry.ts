import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SIGN_ON_BONUS = 250;
const DRIVER_REFERRAL_BONUS = 250;

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

    const driverId = move.assigned_driver_id;
    if (!driverId) {
      return Response.json({ skipped: true, reason: 'No assigned driver' });
    }

    const driver = await base44.asServiceRole.entities.DriverProfile.get(driverId);
    if (!driver) {
      return Response.json({ skipped: true, reason: 'Driver profile not found' });
    }

    // Count the driver's completed moves — only award on first completion
    const completedMoves = await base44.asServiceRole.entities.MoveRequest.filter({
      assigned_driver_id: driverId,
      status: 'completed',
    });

    const isFirstCompletion = completedMoves.length === 1;
    if (!isFirstCompletion) {
      return Response.json({ skipped: true, reason: 'Not first completed move' });
    }

    const payouts = [];
    let referrerEmail = null;

    // --- Sign-on bonus ---
    if (driver.sign_on_bonus_eligible) {
      try {
        const existingBonus = await base44.asServiceRole.entities.DriverPayout.filter({
          driver_profile_id: driverId,
          move_request_id,
          deduction_reason: 'sign_on_bonus',
        });
        if (existingBonus.length === 0) {
          const payout = await base44.asServiceRole.entities.DriverPayout.create({
            driver_profile_id: driverId,
            move_request_id,
            amount: SIGN_ON_BONUS,
            currency: move.currency || 'USD',
            status: 'pending',
            notes: 'Sign-on bonus — first completed job',
            deduction_reason: 'sign_on_bonus',
          });
          payouts.push({ type: 'sign_on_bonus', amount: SIGN_ON_BONUS, payout_id: payout.id });

          await base44.asServiceRole.entities.DriverProfile.update(driverId, {
            sign_on_bonus_eligible: false,
            total_earnings: (driver.total_earnings || 0) + SIGN_ON_BONUS,
          });
        }
      } catch (err) {
        console.error('Failed to award sign-on bonus:', err.message);
      }
    }

    // --- Driver referral bonus ---
    if (driver.referred_by_code) {
      try {
        // Find the referrer by their referral_code
        const referrers = await base44.asServiceRole.entities.DriverProfile.filter({
          referral_code: driver.referred_by_code,
        });
        const referrer = referrers[0];

        if (referrer && referrer.id !== driverId) {
          referrerEmail = referrer.email;

          // Check for duplicate referral payout
          const existingRefBonus = await base44.asServiceRole.entities.DriverPayout.filter({
            driver_profile_id: referrer.id,
            move_request_id,
            deduction_reason: 'driver_referral_bonus',
          });

          if (existingRefBonus.length === 0) {
            const refPayout = await base44.asServiceRole.entities.DriverPayout.create({
              driver_profile_id: referrer.id,
              move_request_id,
              amount: DRIVER_REFERRAL_BONUS,
              currency: move.currency || 'USD',
              status: 'pending',
              notes: `Driver referral bonus — referred ${driver.full_name}`,
              deduction_reason: 'driver_referral_bonus',
            });
            payouts.push({ type: 'driver_referral_bonus', amount: DRIVER_REFERRAL_BONUS, payout_id: refPayout.id, referrer: referrer.email });

            // Update referrer's earnings
            await base44.asServiceRole.entities.DriverProfile.update(referrer.id, {
              total_earnings: (referrer.total_earnings || 0) + DRIVER_REFERRAL_BONUS,
            });

            // Create/update Referral record
            const existingRef = await base44.asServiceRole.entities.Referral.filter({
              referral_code: driver.referred_by_code,
              referred_email: driver.email,
            });
            if (existingRef.length > 0) {
              await base44.asServiceRole.entities.Referral.update(existingRef[0].id, {
                status: 'rewarded',
                bonus_points: DRIVER_REFERRAL_BONUS,
                move_request_id,
              });
            } else {
              await base44.asServiceRole.entities.Referral.create({
                referral_code: driver.referred_by_code,
                referrer_email: referrer.email,
                referred_email: driver.email,
                move_request_id,
                status: 'rewarded',
                bonus_points: DRIVER_REFERRAL_BONUS,
              });
            }

            // Notify the referrer
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: referrer.email,
                subject: `You earned a $${DRIVER_REFERRAL_BONUS} driver referral bonus! 🎉`,
                body: [
                  `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
                  `<h2 style="color:#16a34a;">Driver Referral Bonus Earned!</h2>`,
                  `<p>A driver you referred — <strong>${driver.full_name}</strong> — just completed their first move with GO.</p>`,
                  `<p>You've earned a <strong>$${DRIVER_REFERRAL_BONUS} referral bonus</strong>, added to your pending payouts.</p>`,
                  `<p style="color:#6b7280;margin-top:24px;">Keep sharing your code to earn more!</p>`,
                  `</div>`,
                ].join('\n'),
              });
            } catch (emailErr) {
              console.error('Failed to send driver referral email:', emailErr.message);
            }
          }
        }
      } catch (err) {
        console.error('Failed to award driver referral bonus:', err.message);
      }
    }

    return Response.json({
      awarded: payouts.length > 0,
      driver_id: driverId,
      driver_name: driver.full_name,
      payouts,
    });
  } catch (error) {
    console.error('award-driver-bonuses error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});