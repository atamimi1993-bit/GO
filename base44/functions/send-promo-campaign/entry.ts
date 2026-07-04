import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CARRIER_GATEWAYS = {
  att: 'txt.att.net',
  verizon: 'vtext.com',
  tmobile: 'tmomail.net',
  sprint: 'messaging.sprintpcs.com',
  boost: 'sms.myboostmobile.com',
  cricket: 'sms.cricketwireless.net',
  metropcs: 'mymetropcs.com',
  uscellular: 'email.uscc.net',
  googlefi: 'msg.fi.google.com',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { campaign_title, campaign_description, promo_code, audience } = body;

    if (!campaign_title || !promo_code) {
      return Response.json({ error: 'Missing campaign_title or promo_code' }, { status: 400 });
    }

    // Fetch all users with promo preferences set
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    let optedIn = allUsers.filter((u) => u.promo_channel && u.promo_channel !== 'none');

    // Filter by audience: drivers vs customers
    if (audience === 'drivers' || audience === 'customers') {
      const drivers = await base44.asServiceRole.entities.DriverProfile.filter({}, '-created_date', 500);
      const driverEmails = new Set(drivers.map((d) => d.email?.toLowerCase()).filter(Boolean));
      optedIn = audience === 'drivers'
        ? optedIn.filter((u) => driverEmails.has((u.email || '').toLowerCase()))
        : optedIn.filter((u) => !driverEmails.has((u.email || '').toLowerCase()));
    }

    const subject = audience === 'drivers'
      ? `GO Driver Reward: ${campaign_title}`
      : `Special Offer from GO: ${campaign_title}`;

    const messageBody = audience === 'drivers'
      ? `Hello,\n\n${campaign_description}\n\nUse code: ${promo_code}\n\nThank you for being part of the GO team!\n\n— The GO Team`
      : `Hi there,\n\n${campaign_description}\n\nUse promo code ${promo_code} at checkout to claim your discount.\n\nBook your move today at GO!\n\n— The GO Team`;

    const textBody = `${campaign_title}\n\n${campaign_description}\n\nUse code: ${promo_code}\n\n— GO Team`;

    let emailsSent = 0;
    let textsSent = 0;
    let errors = 0;

    for (const u of optedIn) {
      try {
        // Send email
        if ((u.promo_channel === 'email' || u.promo_channel === 'both') && u.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: u.email,
            subject,
            body: messageBody,
            from_name: 'GO',
          });
          emailsSent++;
        }

        // Send text via email-to-SMS gateway
        if ((u.promo_channel === 'text' || u.promo_channel === 'both') && u.phone_number && u.phone_carrier) {
          const gateway = CARRIER_GATEWAYS[u.phone_carrier];
          if (gateway) {
            const smsEmail = `${u.phone_number.replace(/\D/g, '')}@${gateway}`;
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: smsEmail,
              subject: '',
              body: textBody,
              from_name: 'GO',
            });
            textsSent++;
          }
        }
      } catch (e) {
        console.error(`Send error for user ${u.id}:`, e.message);
        errors++;
      }
    }

    return Response.json({
      emailsSent,
      textsSent,
      errors,
      totalReach: emailsSent + textsSent,
    });
  } catch (error) {
    console.error('send-promo-campaign error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});