import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Reject requests carrying a user-level Authorization header — webhooks
    // come from Stripe (no user auth), so an Authorization header indicates
    // a spoofed request from an authenticated app user.
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      console.error('stripe-webhook: rejected request with Authorization header');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'No stripe-signature header' }, { status: 400 });
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret || webhookSecret.trim() === '') {
      console.error('STRIPE_WEBHOOK_SECRET is not configured or is empty');
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (verifyErr) {
      console.error('Stripe signature verification failed:', verifyErr.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

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

          if (newCount >= (move?.installments_total_count || 3)) {
            updateFields.paid = true;
            updateFields.balance_due = 0;
          }

          await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, updateFields);
          console.log(`Installment ${newCount}/${move?.installments_total_count || 3} paid for move ${moveRequestId}. Balance: ${Math.max(0, newBalance)}`);
        } else if (paymentType === 'deposit') {
          await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, {
            deposit_paid: true,
          });
          console.log('Marked deposit paid for move ' + moveRequestId);
        } else if (paymentType === 'cancellation_fee') {
          await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, {
            status: 'cancelled',
            cancellation_fee_paid: true,
          });
          console.log('Marked move ' + moveRequestId + ' as cancelled with fee paid');
          try {
            await base44.asServiceRole.functions.invoke('notify-driver-cancellation', { move_request_id: moveRequestId });
          } catch (e) {
            console.error('Driver cancellation notification failed:', e.message);
          }
        } else if (paymentType === 'pickup') {
          await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, {
            deposit_paid: true,
          });
          console.log('Pickup payment completed for move ' + moveRequestId);
        } else if (paymentType === 'delivery') {
          await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, {
            paid: true,
            balance_due: 0,
          });
          console.log('Delivery payment completed for move ' + moveRequestId);
        } else if (paymentType === 'tip') {
          const tipAmount = session.amount_total ? session.amount_total / 100 : 0;
          await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, {
            tip_paid: true,
            tip_amount: tipAmount,
          });
          console.log('Tip of ' + tipAmount + ' paid for move ' + moveRequestId);
        } else {
          await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, {
            paid: true,
            deposit_paid: true,
          });
          console.log('Marked move ' + moveRequestId + ' as fully paid');
        }

        // Send automatic email receipt to customer for any move payment
        // (skip cancellation fees — those aren't move service payments)
        if (paymentType !== 'cancellation_fee') {
          const amountPaid = session.amount_total ? session.amount_total / 100 : null;
          try {
            await base44.asServiceRole.functions.invoke('send-payment-receipt', {
              move_request_id: moveRequestId,
              payment_type: paymentType,
              stripe_session_id: session.id,
              amount_paid: amountPaid,
            });
            console.log('Payment receipt sent for move ' + moveRequestId + ' (' + paymentType + ')');
          } catch (receiptErr) {
            console.error('Failed to send payment receipt for move ' + moveRequestId + ':', receiptErr.message);
          }
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

    // Driver subscription checkout
    if (event.type === 'checkout.session.completed' && session?.metadata?.type === 'driver_subscription') {
      const meta = session.metadata || {};
      const driverEmail = meta.driver_email;
      const tier = meta.tier;
      if (driverEmail && tier) {
        const stripe2 = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
        let subDetail = null;
        try { subDetail = await stripe2.subscriptions.retrieve(session.subscription); } catch (e) { console.error('Sub retrieve failed:', e.message); }
        const subData = {
          driver_email: driverEmail,
          driver_name: meta.driver_name || '',
          driver_profile_id: meta.driver_profile_id || '',
          tier,
          stripe_subscription_id: session.subscription,
          stripe_customer_id: session.customer,
          status: 'active',
          jobs_limit: tier === 'elite' ? 999999 : 999999,
          current_period_start: subDetail ? new Date(subDetail.current_period_start * 1000).toISOString() : null,
          current_period_end: subDetail ? new Date(subDetail.current_period_end * 1000).toISOString() : null,
        };
        const existing = await base44.asServiceRole.entities.DriverSubscription.filter({ driver_email: driverEmail });
        if (existing.length > 0) {
          await base44.asServiceRole.entities.DriverSubscription.update(existing[0].id, subData);
        } else {
          await base44.asServiceRole.entities.DriverSubscription.create(subData);
        }
        console.log('Driver subscription activated: ' + driverEmail + ' tier=' + tier);
      }
    }

    // Lead purchase checkout
    if (event.type === 'checkout.session.completed' && session?.metadata?.type === 'lead_purchase') {
      const meta = session.metadata || {};
      const leadId = meta.lead_id;
      const driverEmail = meta.driver_email;
      if (leadId && driverEmail) {
        const leads = await base44.asServiceRole.entities.Lead.filter({ id: leadId });
        const lead = leads.length > 0 ? leads[0] : null;
        const purchaseData = {
          lead_id: leadId,
          lead_name: lead?.lead_name || 'Unknown',
          lead_location: lead?.location || '',
          lead_contact: lead?.contact_info || '',
          driver_email: driverEmail,
          price_paid: session.amount_total ? session.amount_total / 100 : 5,
          stripe_session_id: session.id,
          status: 'purchased',
        };
        await base44.asServiceRole.entities.LeadPurchase.create(purchaseData);
        await base44.asServiceRole.entities.Lead.update(leadId, { assignment_status: 'matched', status: 'contacted' });
        console.log('Lead ' + leadId + ' purchased by ' + driverEmail);
      }
    }

    // Ad space subscription checkout
    if (event.type === 'checkout.session.completed' && session?.metadata?.type === 'ad_space') {
      const meta = session.metadata || {};
      const advertiserEmail = meta.advertiser_email;
      if (advertiserEmail) {
        const stripe3 = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
        let subDetail2 = null;
        try { subDetail2 = await stripe3.subscriptions.retrieve(session.subscription); } catch (e) { console.error('Sub retrieve failed:', e.message); }
        const adData = {
          advertiser_name: meta.advertiser_name,
          advertiser_email: advertiserEmail,
          title: meta.title,
          description: meta.description || '',
          image_url: meta.image_url || '',
          target_url: meta.target_url || '',
          placement: meta.placement,
          audience: meta.audience || 'all',
          price_monthly: 99,
          stripe_subscription_id: session.subscription,
          stripe_customer_id: session.customer,
          status: 'active',
          starts_at: subDetail2 ? new Date(subDetail2.current_period_start * 1000).toISOString() : new Date().toISOString(),
          ends_at: subDetail2 ? new Date(subDetail2.current_period_end * 1000).toISOString() : null,
        };
        await base44.asServiceRole.entities.AdSlot.create(adData);
        console.log('Ad space activated for ' + advertiserEmail);
      }
    }

    // Business subscription lifecycle
    if (event.type === 'checkout.session.completed' && session?.mode === 'subscription') {
      const meta = session.metadata || {};
      const businessEmail = meta.business_email;
      if (businessEmail) {
        const subId = session.subscription;
        const customerId = session.customer;
        let subscription = null;
        try {
          const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
          subscription = await stripe.subscriptions.retrieve(subId);
        } catch (e) {
          console.error('Failed to retrieve subscription:', e.message);
        }

        const planTier = meta.plan_tier || 'starter';
        const planName = meta.plan_name || 'Business Plan';
        const subData = {
          business_email: businessEmail,
          business_name: meta.business_name || '',
          business_account_id: meta.business_account_id || null,
          plan_name: planName,
          plan_tier: planTier,
          stripe_subscription_id: subId,
          stripe_customer_id: customerId,
          status: 'active',
          current_period_start: subscription ? new Date(subscription.current_period_start * 1000).toISOString() : null,
          current_period_end: subscription ? new Date(subscription.current_period_end * 1000).toISOString() : null,
        };

        const existing = await base44.asServiceRole.entities.BusinessSubscription.filter({
          business_email: businessEmail,
          stripe_subscription_id: subId,
        });
        if (existing.length > 0) {
          await base44.asServiceRole.entities.BusinessSubscription.update(existing[0].id, subData);
        } else {
          await base44.asServiceRole.entities.BusinessSubscription.create(subData);
        }
        console.log('Business subscription activated for ' + businessEmail);
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const updateData = {
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      };
      if (sub.canceled_at) {
        updateData.cancelled_at = new Date(sub.canceled_at * 1000).toISOString();
      }

      // Business subscriptions
      const bizSubs = await base44.asServiceRole.entities.BusinessSubscription.filter({ stripe_subscription_id: sub.id });
      if (bizSubs.length > 0) {
        await base44.asServiceRole.entities.BusinessSubscription.update(bizSubs[0].id, updateData);
        console.log('Business subscription ' + sub.id + ' updated: ' + sub.status);
      }

      // Driver subscriptions
      const driverSubs = await base44.asServiceRole.entities.DriverSubscription.filter({ stripe_subscription_id: sub.id });
      if (driverSubs.length > 0) {
        const driverUpdate = { ...updateData };
        if (sub.status === 'canceled' || sub.status === 'deleted') {
          driverUpdate.tier = 'free';
          driverUpdate.jobs_limit = 3;
        }
        await base44.asServiceRole.entities.DriverSubscription.update(driverSubs[0].id, driverUpdate);
        console.log('Driver subscription ' + sub.id + ' updated: ' + sub.status);
      }

      // Ad slot subscriptions
      const adSubs = await base44.asServiceRole.entities.AdSlot.filter({ stripe_subscription_id: sub.id });
      if (adSubs.length > 0) {
        const adUpdate = { ...updateData };
        if (sub.status === 'canceled' || sub.status === 'deleted') {
          adUpdate.status = 'expired';
        }
        await base44.asServiceRole.entities.AdSlot.update(adSubs[0].id, adUpdate);
        console.log('Ad slot subscription ' + sub.id + ' updated: ' + sub.status);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});