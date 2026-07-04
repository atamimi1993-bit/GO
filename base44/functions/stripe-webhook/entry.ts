import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'No stripe-signature header' }, { status: 400 });
    }

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const moveRequestId = session.metadata?.move_request_id;
      const tipStage = session.metadata?.tip_stage;

      if (moveRequestId && tipStage) {
        // This is a tip payment
        const tipAmount = parseFloat(session.metadata?.tip_amount || '0');
        const updateData = tipStage === 'pickup'
          ? { pickup_tip: tipAmount, pickup_tip_paid: true }
          : { delivery_tip: tipAmount, delivery_tip_paid: true };
        await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, updateData);

        // Add tip to the driver's payout record
        const payouts = await base44.asServiceRole.entities.DriverPayout.filter({
          move_request_id: moveRequestId,
        });
        if (payouts.length > 0) {
          const payout = payouts[0];
          const newAmount = (payout.amount || 0) + tipAmount;
          await base44.asServiceRole.entities.DriverPayout.update(payout.id, { amount: newAmount });
          console.log('Updated driver payout ' + payout.id + ' with ' + tipStage + ' tip: ' + tipAmount);
        }
        console.log('Marked ' + tipStage + ' tip as paid for move ' + moveRequestId);
      } else if (moveRequestId) {
        // This is the main move payment
        await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, {
          paid: true,
        });
        console.log('Marked move ' + moveRequestId + ' as paid');
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});