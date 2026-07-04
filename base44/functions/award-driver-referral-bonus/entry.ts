import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DRIVER_REFERRAL_BONUS = 500;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require admin authentication
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { driver_profile_id } = body;
    if (!driver_profile_id) {
      return Response.json({ error: 'driver_profile_id is required' }, { status: 400 });
    }

    const driver = await base44.asServiceRole.entities.DriverProfile.get(driver_profile_id);
    if (!driver) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Only award when the driver has been verified/approved
    if (driver.status !== 'approved') {
      return Response.json({ skipped: true, reason: `Driver status is '${driver.status}', not 'approved'` });
    }

    const referredByCode = driver.referred_by_code;
    if (!referredByCode) {
      return Response.json({ skipped: true, reason: 'No referral code on this driver' });
    }

    const driverEmail = driver.email;
    if (!driverEmail) {
      return Response.json({ skipped: true, reason: 'Driver has no email on file' });
    }

    // Find the referrer by matching their referral_code
    const referrerDrivers = await base44.asServiceRole.entities.DriverProfile.filter({ referral_code: referredByCode });
    const referrer = referrerDrivers[0];
    if (!referrer) {
      return Response.json({ skipped: true, reason: 'Referrer not found for code: ' + referredByCode });
    }

    // Can't refer yourself
    if (referrer.email === driverEmail) {
      return Response.json({ skipped: true, reason: 'Cannot refer yourself' });
    }

    // Check if a referral record already exists and was already rewarded
    const existing = await base44.asServiceRole.entities.Referral.filter({
      referrer_email: referrer.email,
      referred_email: driverEmail,
    });
    const alreadyRewarded = existing.find((r) => r.status === 'rewarded');
    if (alreadyRewarded) {
      return Response.json({ skipped: true, reason: 'Driver referral bonus already awarded' });
    }

    // --- Award points to the referrer ---
    const referrerLoyaltyAccounts = await base44.asServiceRole.entities.LoyaltyAccount.filter({ user_email: referrer.email });
    let referrerAccount = referrerLoyaltyAccounts[0];
    if (!referrerAccount) {
      referrerAccount = await base44.asServiceRole.entities.LoyaltyAccount.create({
        user_email: referrer.email,
        total_points: 0,
        moves_completed: 0,
        referral_code: referredByCode,
      });
    }
    const referrerNewTotal = (referrerAccount.total_points || 0) + DRIVER_REFERRAL_BONUS;
    await base44.asServiceRole.entities.LoyaltyAccount.update(referrerAccount.id, {
      total_points: referrerNewTotal,
    });

    // --- Award points to the newly verified driver ---
    const driverLoyaltyAccounts = await base44.asServiceRole.entities.LoyaltyAccount.filter({ user_email: driverEmail });
    let driverAccount = driverLoyaltyAccounts[0];
    if (!driverAccount) {
      const prefix = (driver.full_name || 'DRV').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
      const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newCode = `GO-${prefix}${suffix}`;
      driverAccount = await base44.asServiceRole.entities.LoyaltyAccount.create({
        user_email: driverEmail,
        total_points: 0,
        moves_completed: 0,
        referral_code: newCode,
      });
    }
    const driverNewTotal = (driverAccount.total_points || 0) + DRIVER_REFERRAL_BONUS;
    await base44.asServiceRole.entities.LoyaltyAccount.update(driverAccount.id, {
      total_points: driverNewTotal,
    });

    // --- Update or create the Referral record ---
    const pendingReferral = existing.find((r) => r.status === 'pending');
    if (pendingReferral) {
      await base44.asServiceRole.entities.Referral.update(pendingReferral.id, {
        status: 'rewarded',
        bonus_points: DRIVER_REFERRAL_BONUS,
      });
    } else {
      await base44.asServiceRole.entities.Referral.create({
        referral_code: referredByCode,
        referrer_email: referrer.email,
        referred_email: driverEmail,
        status: 'rewarded',
        bonus_points: DRIVER_REFERRAL_BONUS,
      });
    }

    // --- Notify both parties ---
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: referrer.email,
        subject: `You earned ${DRIVER_REFERRAL_BONUS} bonus points! 🎉`,
        body: [
          `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
          `<h2 style="color:#16a34a;">Driver Referral Verified!</h2>`,
          `<p>A driver you referred — <strong>${driver.full_name}</strong> — has been verified and approved on GO.</p>`,
          `<p>You've earned <strong>${DRIVER_REFERRAL_BONUS} bonus loyalty points</strong> — added to your GO Rewards balance.</p>`,
          `<p>Your new total: <strong>${referrerNewTotal.toLocaleString()} points</strong>.</p>`,
          `<p style="color:#6b7280;margin-top:24px;">Keep inviting drivers to earn more rewards!</p>`,
          `</div>`,
        ].join('\n'),
      });
    } catch (err) {
      console.error('Failed to send referrer email:', err.message);
    }

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: driverEmail,
        subject: `Welcome to GO! You earned ${DRIVER_REFERRAL_BONUS} bonus points! 🎉`,
        body: [
          `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
          `<h2 style="color:#16a34a;">You're Verified! 🚚</h2>`,
          `<p>Congratulations, <strong>${driver.full_name}</strong> — your driver account has been approved!</p>`,
          `<p>You were referred by <strong>${referrer.full_name}</strong>, and you've both earned <strong>${DRIVER_REFERRAL_BONUS} bonus loyalty points</strong> as a referral reward.</p>`,
          `<p>Your GO Rewards total: <strong>${driverNewTotal.toLocaleString()} points</strong>.</p>`,
          `<p style="color:#6b7280;margin-top:24px;">Start accepting jobs to earn even more!</p>`,
          `</div>`,
        ].join('\n'),
      });
    } catch (err) {
      console.error('Failed to send driver email:', err.message);
    }

    return Response.json({
      awarded: true,
      bonus_points: DRIVER_REFERRAL_BONUS,
      referrer_email: referrer.email,
      referrer_total_points: referrerNewTotal,
      driver_email: driverEmail,
      driver_total_points: driverNewTotal,
    });
  } catch (error) {
    console.error('award-driver-referral-bonus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});