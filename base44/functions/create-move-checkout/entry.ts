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
    const { move_request_id } = body;

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

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || new URL(req.url).origin;

    const currencyCode = (move.currency || 'USD').toUpperCase();
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currencyCode);
    const unitAmount = isZeroDecimal
      ? Math.round(move.total_price)
      : Math.round(move.total_price * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currencyCode.toLowerCase(),
          product_data: {
            name: 'GO Move Service',
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
      },
    });

    await base44.asServiceRole.entities.MoveRequest.update(move.id, {
      stripe_session_id: session.id,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});