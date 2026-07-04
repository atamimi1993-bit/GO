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
      const paymentType = session.metadata?.payment_type || 'full';

      if (moveRequestId) {
        if (paymentType === 'deposit') {
          await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, {
            deposit_paid: true,
          });
          console.log('Marked deposit paid for move ' + moveRequestId);
        } else {
          await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, {
            paid: true,
            deposit_paid: true,
          });
          console.log('Marked move ' + moveRequestId + ' as fully paid');
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});