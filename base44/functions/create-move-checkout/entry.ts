import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

const ZERO_DECIMAL_CURRENCIES = [
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF',
  'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF', 'IDR', 'PHP', 'NGN', 'EGP',
  'MAD', 'GHS', 'HUF', 'ISK', 'TND', 'TZS', 'ARS', 'COP', 'SEK', 'NOK',
  'DKK', 'CZK', 'HUF', 'KES', 'TRY'
];

// Installment plan rate table — APR % (longer terms = higher rates, lower credit = higher rates)
const INSTALLMENT_RATES = {
  excellent: { 3: 0.00, 6: 1.99, 12: 3.99, 24: 5.99, 36: 6.99, 48: 8.00 },
  good:      { 3: 3.99, 6: 5.99, 12: 7.99, 24: 9.99, 36: 11.99, 48: 14.00 },
  fair:      { 3: 8.99, 6: 10.99, 12: 12.99, 24: 15.99, 36: 18.99, 48: 22.00 },
};

function getInstallmentAPR(termMonths, creditTier) {
  const rates = INSTALLMENT_RATES[creditTier] || INSTALLMENT_RATES.good;
  const breakpoints = [3, 6, 12, 24, 36, 48];
  if (termMonths <= 3) return rates[3];
  if (termMonths >= 48) return rates[48];
  let lower = 3, upper = 48;
  for (let i = 0; i < breakpoints.length - 1; i++) {
    if (termMonths >= breakpoints[i] && termMonths <= breakpoints[i + 1]) {
      lower = breakpoints[i];
      upper = breakpoints[i + 1];
      break;
    }
  }
  const t = (termMonths - lower) / (upper - lower);
  return Math.round((rates[lower] + t * (rates[upper] - rates[lower])) * 100) / 100;
}

function calculateInstallmentPlan(principal, termMonths, creditTier) {
  const apr = getInstallmentAPR(termMonths, creditTier);
  const monthlyRate = apr / 100 / 12;
  let monthlyPayment;
  if (monthlyRate === 0) {
    monthlyPayment = principal / termMonths;
  } else {
    monthlyPayment = principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  }
  const totalCost = monthlyPayment * termMonths;
  return {
    apr,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalInterest: Math.round((totalCost - principal) * 100) / 100,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 🔒 Auth check — reject unauthenticated requests
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { move_request_id, promo_code, validate_only, payment_plan, pay_balance, pay_installment, payment_option, credit_tier, installment_term_months, add_insurance, insurance_tier } = body;

    if (!move_request_id) {
      return Response.json({ error: 'move_request_id is required' }, { status: 400 });
    }

    // Use user-scoped read to enforce row-level security — prevents IDOR
    let move;
    try {
      move = await base44.entities.MoveRequest.get(move_request_id);
    } catch {
      return Response.json({ error: 'Move not found' }, { status: 404 });
    }
    if (!move) {
      return Response.json({ error: 'Move not found' }, { status: 404 });
    }

    // Explicit ownership check: only the customer who created the move may checkout
    if (move.customer_email !== user.email && move.created_by_id !== user.id) {
      return Response.json({ error: 'You do not have access to this move' }, { status: 403 });
    }

    if (move.paid) {
      return Response.json({ error: 'This move has already been paid' }, { status: 400 });
    }

    if (!move.total_price || move.total_price <= 0) {
      return Response.json({ error: 'Invalid move price' }, { status: 400 });
    }

    // Insurance tiers — customer-selected damage protection (pure revenue for GO)
    const INSURANCE_TIERS = {
      basic:    { fee: 15, coverage: 1000 },
      premium:  { fee: 35, coverage: 5000 },
      platinum: { fee: 75, coverage: 10000 },
    };
    const selectedTier = INSURANCE_TIERS[insurance_tier];
    const INSURANCE_FEE = selectedTier ? selectedTier.fee : 0;
    const INSURANCE_COVERAGE = selectedTier ? selectedTier.coverage : 0;
    const hasInsurance = !!selectedTier;

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

      // First-time customer check — if promo is first-time-only, reject if customer
      // has any previously paid moves
      if (promo.first_time_customers_only) {
        const previousMoves = await base44.asServiceRole.entities.MoveRequest.filter({
          customer_email: move.customer_email,
          paid: true,
        });
        if (previousMoves.length > 0) {
          return Response.json({ error: 'This promo code is for first-time customers only' }, { status: 400 });
        }
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

    // Determine charge amount based on selected payment option
    let chargeAmount;
    let paymentType = 'full';
    const splitAmount = Math.round(discountedTotal / 2 * 100) / 100;
    const effectiveOption = move.payment_option || payment_option || 'split_50_50';

    if (pay_installment && move.monthly_payment > 0) {
      // Subsequent installment payment
      chargeAmount = move.monthly_payment;
      paymentType = 'installment';
    } else if (pay_balance && move.balance_due > 0) {
      // 50/50 split — delivery payment (remaining balance)
      chargeAmount = move.balance_due;
      paymentType = 'delivery';
    } else if (effectiveOption === 'full') {
      // Full one-time payment
      chargeAmount = discountedTotal;
      paymentType = 'full';
    } else if (effectiveOption === 'installment_plan') {
      // First installment payment — calculate plan details
      const term = Math.min(Math.max(parseInt(installment_term_months) || 3, 3), 48);
      const tier = ['excellent', 'good', 'fair'].includes(credit_tier) ? credit_tier : 'good';
      const plan = calculateInstallmentPlan(discountedTotal, term, tier);
      chargeAmount = plan.monthlyPayment;
      paymentType = 'installment';
    } else {
      // 50/50 split — pickup deposit (50%)
      chargeAmount = splitAmount;
      paymentType = 'pickup';
    }

    const unitAmount = isZeroDecimal
      ? Math.round(chargeAmount)
      : Math.round(chargeAmount * 100);

    const productLabels = {
      full: 'GO Move Service — Full Payment',
      pickup: 'GO Move Service — Pickup Deposit',
      delivery: 'GO Move Service — Delivery Payment',
      installment: 'GO Move Service — Installment Payment',
    };
    const productLabel = productLabels[paymentType] || productLabels.pickup;

    const sessionParams = {
      payment_method_types: ['card', 'link', 'cashapp', 'afterpay_clearpay', 'klarna'],
      payment_method_options: {
        afterpay_clearpay: { limit: 400000 },
        klarna: { preferred_locale: 'en-US' },
      },
      line_items: [
        {
          price_data: {
            currency: currencyCode.toLowerCase(),
            product_data: {
              name: productLabel,
              description: 'Move from ' + move.pickup_address + ' to ' + move.dropoff_address,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
        ...(hasInsurance ? [{
          price_data: {
            currency: currencyCode.toLowerCase(),
            product_data: {
              name: 'GO Move Insurance — ' + (insurance_tier.charAt(0).toUpperCase() + insurance_tier.slice(1)) + ' Protection',
              description: 'Covers up to $' + INSURANCE_COVERAGE.toLocaleString() + ' in damage to your belongings during the move',
            },
            unit_amount: isZeroDecimal ? INSURANCE_FEE : INSURANCE_FEE * 100,
          },
          quantity: 1,
        }] : []),
      ],
      mode: 'payment',
      success_url: origin + '/move/' + move.id + '?payment=success',
      cancel_url: origin + '/move/' + move.id + '?payment=failed',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        move_request_id: move.id,
        payment_type: paymentType,
        payment_option: effectiveOption,
      },
    };

    // Stripe Connect: if assigned driver has a connected account, split payment
    // automatically — platform keeps app fee, driver gets the rest
    if (move.assigned_driver_id) {
      try {
        const driver = await base44.asServiceRole.entities.DriverProfile.get(move.assigned_driver_id);
        if (driver?.stripe_account_id && driver?.stripe_payouts_enabled) {
          let appFeePortion;
          const ratio = chargeAmount / (move.total_price || chargeAmount);
          if (move.app_fee && move.app_fee > 0) {
            // Platform keeps: app_fee (net profit) + materials_fee + tax_amount + booking_fee
            //   + reserve_contribution + processing_fee (platform costs, not driver revenue)
            // Driver receives: driver_payout + fuel + tolls (passthrough hard costs)
            // Tax is collected by platform for remittance, NOT split as driver revenue
            // Materials fee is 100% platform profit (upsell, not split with driver)
            // Booking fee, reserve pool, and processing are 100% platform
            appFeePortion = (move.app_fee + (move.materials_fee || 0) + (move.tax_amount || 0)) * ratio;
          } else {
            // Fallback: platform keeps 35% of service portion + 100% of tax/materials
            appFeePortion = (chargeAmount * 0.35) + ((move.tax_amount || 0) + (move.materials_fee || 0)) * ratio;
          }
          // Insurance is 100% platform profit — added as separate line item, not proportional
          if (hasInsurance) {
            appFeePortion += INSURANCE_FEE;
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

    if (hasInsurance) {
      updateData.insurance_selected = true;
      updateData.insurance_fee = INSURANCE_FEE;
      updateData.insurance_tier = insurance_tier;
    }

    // Store payment plan details based on payment type
    if (paymentType === 'full') {
      updateData.payment_option = 'full';
      updateData.deposit_amount = chargeAmount;
      updateData.balance_due = 0;
    } else if (paymentType === 'pickup') {
      updateData.payment_option = 'split_50_50';
      updateData.payment_plan = true;
      updateData.deposit_amount = chargeAmount;
      updateData.balance_due = Math.round((discountedTotal - chargeAmount) * 100) / 100;
    } else if (paymentType === 'installment' && !pay_installment) {
      // First installment — store full plan details
      const term = Math.min(Math.max(parseInt(installment_term_months) || 3, 3), 48);
      const tier = ['excellent', 'good', 'fair'].includes(credit_tier) ? credit_tier : 'good';
      const plan = calculateInstallmentPlan(discountedTotal, term, tier);
      updateData.payment_option = 'installment_plan';
      updateData.payment_plan = true;
      updateData.credit_tier = tier;
      updateData.installment_term_months = term;
      updateData.interest_rate = plan.apr;
      updateData.installment_total = plan.totalCost;
      updateData.monthly_payment = plan.monthlyPayment;
      updateData.installment_amount = plan.monthlyPayment;
      updateData.installments_total_count = term;
      updateData.deposit_amount = chargeAmount;
      updateData.balance_due = Math.round((plan.totalCost - chargeAmount) * 100) / 100;
    }

    if (appliedPromoCode) {
      updateData.promo_code = appliedPromoCode.code;
      updateData.discount_amount = discountAmount;
      updateData.discounted_total = discountedTotal;

      // Atomically increment promo code usage count — prevents race condition
      // where two concurrent checkouts could exceed max_uses
      try {
        await base44.asServiceRole.entities.PromoCode.updateMany(
          { id: appliedPromoCode.promo_id, active: true },
          { $inc: { uses_count: 1 } }
        );
      } catch (e) {
        console.error('Failed to increment promo uses:', e.message);
      }
    }

    await base44.entities.MoveRequest.update(move.id, updateData);

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});