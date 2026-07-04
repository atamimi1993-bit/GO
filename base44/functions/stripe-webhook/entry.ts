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
        if (paymentType === 'installment') {
          // Fetch fresh move to get current installment count
          const move = await base44.asServiceRole.entities.MoveRequest.get(moveRequestId);
          const newCount = (move?.installments_paid || 0) + 1;
          const installmentAmount = move?.installment_amount || 0;
          const newBalance = Math.round(((move?.balance_due || 0) - installmentAmount) * 100) / 100;

          const updateFields = {
            deposit_paid: true,
            installments_paid: newCount,
            balance_due: Math.max(0, newBalance),
          };

          if (newCount >= 3) {
            updateFields.paid = true;
            updateFields.balance_due = 0;
          }

          await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, updateFields);
          console.log(`Installment ${newCount}/3 paid for move ${moveRequestId}. Balance: ${Math.max(0, newBalance)}`);
        } else if (paymentType === 'deposit') {
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

    if (event.type === 'account.updated') {
      const account = event.data.object;
      const drivers = await base44.asServiceRole.entities.DriverProfile.filter({
        stripe_account_id: account.id,
      });
      if (drivers.length > 0) {
        const payoutsEnabled = account.charges_enabled && account.details_submitted;
        await base44.asServiceRole.entities.DriverProfile.update(drivers[0].id, {
          stripe_payouts_enabled: payoutsEnabled,
        });
        console.log('Updated Stripe Connect status for driver ' + drivers[0].id + ': ' + payoutsEnabled);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});