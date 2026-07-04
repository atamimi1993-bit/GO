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
    const { move_request_id, tip_amount, stage } = body;

    if (!move_request_id || !tip_amount || tip_amount <= 0) {
      return Response.json({ error: 'move_request_id and a positive tip_amount are required' }, { status: 400 });
    }

    if (stage !== 'pickup' && stage !== 'delivery') {
      return Response.json({ error: 'stage must be "pickup" or "delivery"' }, { status: 400 });
    }

    const move = await base44.asServiceRole.entities.MoveRequest.get(move_request_id);
    if (!move) {
      return Response.json({ error: 'Move not found' }, { status: 404 });
    }

    const tipField = stage === 'pickup' ? 'pickup_tip_paid' : 'delivery_tip_paid';
    if (move[tipField]) {
      return Response.json({ error: 'This tip has already been paid' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || new URL(req.url).origin;

    const currencyCode = (move.currency || 'USD').toUpperCase();
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currencyCode);
    const unitAmount = isZeroDecimal
      ? Math.round(tip_amount)
      : Math.round(tip_amount * 100);

    const label = stage === 'pickup' ? 'Pickup Tip' : 'Delivery Tip';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currencyCode.toLowerCase(),
          product_data: {
            name: 'GO Driver Tip — ' + label,
            description: 'Tip for ' + (move.assigned_driver_name || 'your driver'),
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: origin + '/move/' + move.id + '?tip=' + stage + '&status=success',
      cancel_url: origin + '/move/' + move.id + '?tip=' + stage + '&status=cancelled',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        move_request_id: move.id,
        tip_stage: stage,
        tip_amount: String(tip_amount),
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Tip checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});