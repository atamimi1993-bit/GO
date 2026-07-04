import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const body = await req.json();
    const moveRequestId = body.move_request_id;
    const tipAmount = parseFloat(body.tip_amount);

    if (!moveRequestId || !tipAmount || tipAmount <= 0) {
      return Response.json({ error: 'move_request_id and a positive tip_amount are required' }, { status: 400 });
    }

    const move = await base44.asServiceRole.entities.MoveRequest.get(moveRequestId);
    if (!move) {
      return Response.json({ error: 'Move not found' }, { status: 404 });
    }
    if (move.status !== 'completed') {
      return Response.json({ error: 'Tips can only be given for completed moves' }, { status: 400 });
    }

    // Derive origin from the request's own headers — never trust user-supplied body.origin
    // to prevent open-redirect attacks via crafted success_url/cancel_url.
    const headerOrigin = req.headers.get('origin') || req.headers.get('referer');
    let origin = 'https://go.base44.com';
    if (headerOrigin) {
      try {
        const url = new URL(headerOrigin);
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          origin = url.origin;
        }
      } catch {
        // Invalid URL — fall back to default
      }
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: (move.currency || 'USD').toLowerCase(),
          product_data: { name: 'Driver Gratuity' },
          unit_amount: Math.round(tipAmount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/move/${moveRequestId}?tip=success`,
      cancel_url: `${origin}/move/${moveRequestId}?tip=cancelled`,
      metadata: {
        move_request_id: moveRequestId,
        payment_type: 'tip',
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
      },
    });

    await base44.asServiceRole.entities.MoveRequest.update(moveRequestId, {
      tip_session_id: session.id,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Tip checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});