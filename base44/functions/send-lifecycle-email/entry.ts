import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { sequence_type, user_email, user_name, move_data } = body;

    const validSequences = ['welcome', 'abandoned_booking', 'review_request', 're_engagement'];
    if (!validSequences.includes(sequence_type)) {
      return Response.json(
        { error: `Invalid sequence_type. Must be one of: ${validSequences.join(', ')}` },
        { status: 400 }
      );
    }

    // Re-engagement is a bulk sequence — finds inactive users and emails them all
    if (sequence_type === 're_engagement' && !user_email) {
      const allMoves = await base44.asServiceRole.entities.MoveRequest.list('-created_date', 500);
      const now = Date.now();
      const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

      const lastMoveByUser = {};
      for (const m of allMoves) {
        if (!m.customer_email) continue;
        const moveTime = new Date(m.created_date || m.move_date).getTime();
        if (isNaN(moveTime)) continue;
        if (!lastMoveByUser[m.customer_email] || moveTime > lastMoveByUser[m.customer_email]) {
          lastMoveByUser[m.customer_email] = moveTime;
        }
      }

      const inactiveUsers = Object.entries(lastMoveByUser)
        .filter(([_, lastTime]) => lastTime < ninetyDaysAgo)
        .map(([email]) => email);

      let sent = 0;
      let errors = 0;
      for (const email of inactiveUsers) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: 'We miss you! Come back for 10% off your next move 🎁',
            body: `Hi there,\n\nIt's been a while since your last move with GO, and we'd love to welcome you back!\n\nAs a thank-you for being part of the GO community, here's a 10% discount on your next move. Use code COMEBACK10 at checkout.\n\nWhether you're moving apartments, delivering freight, or need a courier — GO has you covered with verified drivers, real-time tracking, and transparent pricing.\n\nReady to move? Book now from the app.\n\nThe GO Team`,
            from_name: 'GO Team',
          });
          sent++;
        } catch (err) {
          console.error(`Re-engagement email failed for ${email}:`, err.message);
          errors++;
        }
      }

      return Response.json({ success: true, sequence_type: 're_engagement', sent, errors, total_inactive: inactiveUsers.length });
    }

    if (!user_email) {
      return Response.json({ error: 'user_email is required' }, { status: 400 });
    }

    const sequenceConfigs = {
      welcome: {
        subject: 'Welcome to GO — Move Anything, Anywhere! 🚚',
        body: `Hi ${user_name || 'there'},\n\nWelcome to GO! We're thrilled to have you. GO is your marketplace for moving anything — residential moves, freight, corporate logistics, and courier deliveries.\n\nHere's what you can do:\n• Book a move in minutes — get matched with a verified driver instantly\n• Track your move in real-time with GPS\n• Pay securely with transparent upfront pricing\n• Tip your driver directly in the app\n\nReady to book your first move? Head to the New Move page to get started.\n\nNeed help? Our support team is always here for you.\n\nThe GO Team`,
      },
      abandoned_booking: {
        subject: 'Still need to move? Your booking is waiting 💚',
        body: `Hi ${user_name || 'there'},\n\nWe noticed you started booking a move but didn't finish. No worries — your details are saved!\n\n${move_data ? `Your move: ${move_data.pickup_address || 'Pickup'} → ${move_data.dropoff_address || 'Dropoff'}${move_data.move_date ? ` on ${move_data.move_date}` : ''}` : ''}\n\nIt only takes a minute to complete your booking. Head back to the app to finish up and get matched with a driver.\n\nHave questions? Just reply to this email and we'll help you out.\n\nThe GO Team`,
      },
      review_request: {
        subject: 'How was your move? Share your experience ⭐',
        body: `Hi ${user_name || 'there'},\n\nWe hope your recent move with GO went smoothly! Your feedback helps us improve and helps other customers find great drivers.\n\n${move_data ? `Your move: ${move_data.pickup_address || 'Pickup'} → ${move_data.dropoff_address || 'Dropoff'}` : ''}\n\nWould you take a moment to rate your driver? It only takes 30 seconds and makes a big difference.\n\nOpen the app → My Moves → Rate your driver\n\nThank you for choosing GO!\n\nThe GO Team`,
      },
      re_engagement: {
        subject: 'We miss you! Come back for 10% off your next move 🎁',
        body: `Hi ${user_name || 'there'},\n\nIt's been a while since your last move with GO, and we'd love to welcome you back!\n\nAs a thank-you for being part of the GO community, here's a 10% discount on your next move. Use code COMEBACK10 at checkout.\n\nWhether you're moving apartments, delivering freight, or need a courier — GO has you covered with verified drivers, real-time tracking, and transparent pricing.\n\nReady to move? Book now from the app.\n\nThe GO Team`,
      },
    };

    const config = sequenceConfigs[sequence_type];

    const result = await base44.asServiceRole.integrations.Core.SendEmail({
      to: user_email,
      subject: config.subject,
      body: config.body,
      from_name: 'GO Team',
    });

    return Response.json({
      success: true,
      sequence_type,
      sent_to: user_email,
      subject: config.subject,
    });
  } catch (error) {
    console.error('Lifecycle email failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});