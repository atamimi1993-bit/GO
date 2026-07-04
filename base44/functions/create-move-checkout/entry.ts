import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

const ZERO_DECIMAL_CURRENCIES = [
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF',
  'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF', 'IDR', 'PHP', 'NGN', 'EGP',
  'MAD', 'GHS', 'HUF', 'ISK', 'TND', 'TZS', 'ARS', 'COP', 'SEK', 'NOK',
  'DKK', 'CZK', 'HUF', 'KES', 'TRY'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { move_request_id, promo_code, validate_only, payment_plan, pay_balance } = body;

    if (!move_request_id) {
      return Response.json({ error: 'move_request_id is required' }, { status: 400 });
    }

    const move = await base44.asServiceRole.entities.MoveRequest.get(move_request_id);
    if (!move) {
      return Response.json({ error: 'Move not found' }, { status: 404 });
    }

    if (move.paid) {
      return Response.json({ error: 'This move has already been paid' }, { status: 400 });
    }

    if (!move.total_price || move.total_price <= 0) {
      return Response.json({ error: 'Invalid move price' }, { status: 400 });
    }

    // Validate promo code if provided
    let discountAmount = 0;
    let discountedTotal = move.total_price;
    let appliedPromoCode = null;

    if (promo_code && promo_code.trim()) {
      const normalizedCode = promo_code.trim().toUpperCase();
      const promos = await base44.asServiceRole.entities.PromoCode.filter({
        code: normalizedCode,
        active: true,
      });

      if (promos.length === 0) {
        return Response.json({ error: 'Invalid promo code' }, { status: 400 });
      }

      const promo = promos[0];

      // Check expiry
      if (promo.expires_at) {
        const expiry = new Date(promo.expires_at);
        if (expiry < new Date()) {
          return Response.json({ error: 'This promo code has expired' }, { status: 400 });
        }
      }

      // Check usage limit
      if (promo.max_uses > 0 && promo.uses_count >= promo.max_uses) {
        return Response.json({ error: 'This promo code has reached its usage limit' }, { status: 400 });
      }

      discountAmount = (move.total_price * promo.discount_percent) / 100;
      discountedTotal = Math.max(0, move.total_price - discountAmount);
      appliedPromoCode = {
        code: promo.code,
        discount_percent: promo.discount_percent,
        promo_id: promo.id,
        uses_count: promo.uses_count || 0,
      };
    }

    // If only validating, return the discount info without creating a checkout session
    if (validate_only) {
      return Response.json({
        valid: true,
        original_total: move.total_price,
        discount_amount: discountAmount,
        discounted_total: discountedTotal,
        promo: appliedPromoCode,
      });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || new URL(req.url).origin;

    const currencyCode = (move.currency || 'USD').toUpperCase();
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currencyCode);

    // Determine charge amount: full, installment (1/3), or next installment
    let chargeAmount;
    let paymentType = 'full';
    const installmentAmount = Math.round(discountedTotal / 3 * 100) / 100;

    if (pay_balance && move.installment_amount > 0) {
      // Next installment on an active payment plan
      chargeAmount = move.installment_amount;
      paymentType = 'installment';
    } else if (pay_balance && move.balance_due > 0) {
      // Legacy: pay remaining balance in one lump sum
      chargeAmount = move.balance_due;
      paymentType = 'balance';
    } else if (payment_plan) {
      // First installment (1/3 of total)
      chargeAmount = installmentAmount;
      paymentType = 'installment';
    } else {
      chargeAmount = discountedTotal;
    }

    const unitAmount = isZeroDecimal
      ? Math.round(chargeAmount)
      : Math.round(chargeAmount * 100);

    const productLabel = paymentType === 'installment'
      ? `GO Move Service — Installment ${(move.installments_paid || 0) + 1} of 3`
      : paymentType === 'balance'
        ? 'GO Move Service — Remaining Balance'
        : 'GO Move Service';

    const sessionParams = {
      payment_method_types: ['card', 'link', 'cashapp', 'afterpay_clearpay', 'klarna'],
      payment_method_options: {
        afterpay_clearpay: { limit: 400000 },
        klarna: { preferred_locale: 'en-US' },
      },
      line_items: [{
        price_data: {
          currency: currencyCode.toLowerCase(),
          product_data: {
            name: productLabel,
            description: 'Move from ' + move.pickup_address + ' to ' + move.dropoff_address,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: origin + '/move/' + move.id + '?payment=success',
      cancel_url: origin + '/move/' + move.id + '?payment=cancelled',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        move_request_id: move.id,
        payment_type: paymentType,
      },
    };

    // Stripe Connect: if assigned driver has a connected account, split payment
    // automatically — platform keeps app fee, driver gets the rest
    if (move.assigned_driver_id) {
      try {
        const driver = await base44.asServiceRole.entities.DriverProfile.get(move.assigned_driver_id);
        if (driver?.stripe_account_id && driver?.stripe_payouts_enabled) {
          let appFeePortion;
          if (move.app_fee && move.app_fee > 0) {
            appFeePortion = paymentType === 'installment' ? move.app_fee / 3 : move.app_fee;
          } else {
            appFeePortion = chargeAmount * 0.25;
          }
          const appFeeCents = isZeroDecimal
            ? Math.round(appFeePortion)
            : Math.round(appFeePortion * 100);

          sessionParams.transfer_data = { destination: driver.stripe_account_id };
          sessionParams.application_fee_amount = appFeeCents;
          console.log('Stripe Connect destination charge: driver=' + driver.stripe_account_id + ' fee=' + appFeeCents);
        }
      } catch (e) {
        console.error('Failed to check driver Stripe Connect status:', e.message);
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Update move with discount info and session ID
    const updateData = {
      stripe_session_id: session.id,
    };

    // Store payment plan details when the first installment is charged
    if (payment_plan && paymentType === 'installment') {
      updateData.payment_plan = true;
      updateData.deposit_amount = chargeAmount;
      updateData.installment_amount = installmentAmount;
      updateData.installments_paid = 0;
      updateData.balance_due = Math.round((discountedTotal - chargeAmount) * 100) / 100;
    }

    if (appliedPromoCode) {
      updateData.promo_code = appliedPromoCode.code;
      updateData.discount_amount = discountAmount;
      updateData.discounted_total = discountedTotal;

      // Increment promo code usage count
      try {
        await base44.asServiceRole.entities.PromoCode.update(appliedPromoCode.promo_id, {
          uses_count: (appliedPromoCode.uses_count || 0) + 1,
        });
      } catch (e) {
        console.error('Failed to increment promo uses:', e.message);
      }
    }

    await base44.asServiceRole.entities.MoveRequest.update(move.id, updateData);

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});