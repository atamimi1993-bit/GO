import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

const CANCELLATION_FEE = 250;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Reject unauthenticated callers — checkout endpoints must still require a session
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { move_request_id } = body;

    if (!move_request_id) {
      return Response.json({ error: 'move_request_id is required' }, { status: 400 });
    }

    const move = await base44.asServiceRole.entities.MoveRequest.get(move_request_id);
    if (!move) {
      return Response.json({ error: 'Move not found' }, { status: 404 });
    }

    // Can only cancel moves that haven't been completed or already cancelled
    if (['completed', 'cancelled'].includes(move.status)) {
      return Response.json({ error: 'Cannot cancel a completed or already cancelled move' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || new URL(req.url).origin;
    const currencyCode = (move.currency || 'USD').toLowerCase();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'link', 'cashapp', 'afterpay_clearpay', 'klarna'],
      payment_method_options: {
        afterpay_clearpay: { limit: 400000 },
        klarna: { preferred_locale: 'en-US' },
      },
      line_items: [{
        price_data: {
          currency: currencyCode,
          product_data: {
            name: 'GO Move — Cancellation Fee',
            description: 'Cancellation fee for move from ' + move.pickup_address + ' to ' + move.dropoff_address,
          },
          unit_amount: CANCELLATION_FEE * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: origin + '/move/' + move.id + '?cancellation=success',
      cancel_url: origin + '/move/' + move.id + '?cancellation=cancelled',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        move_request_id: move.id,
        payment_type: 'cancellation_fee',
      },
    });

    await base44.asServiceRole.entities.MoveRequest.update(move.id, {
      cancellation_session_id: session.id,
      cancellation_fee: CANCELLATION_FEE,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Cancellation checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});