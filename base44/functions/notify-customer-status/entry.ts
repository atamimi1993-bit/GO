import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { move_request_id } = body;
    if (!move_request_id) {
      return Response.json({ error: 'move_request_id is required' }, { status: 400 });
    }

    const move = await base44.asServiceRole.entities.MoveRequest.get(move_request_id);
    if (!move) {
      return Response.json({ error: 'Move request not found' }, { status: 404 });
    }

    if (!move.customer_email) {
      return Response.json({ skipped: true, reason: 'No customer email on file' });
    }

    const STATUS_INFO = {
      quoted: {
        subject: `Your move quote is ready: ${move.pickup_address || 'Pickup'}`,
        headline: 'Your quote is ready!',
        message: 'Your moving quote has been generated. Log in to review the price and confirm your booking.',
      },
      accepted: {
        subject: `Your move has been booked: ${move.pickup_address || 'Pickup'}`,
        headline: 'Your move is confirmed!',
        message: 'A driver has been assigned to your move. You can track their progress in real time from your dashboard.',
      },
      in_progress: {
        subject: `Your move is underway: ${move.pickup_address || 'Pickup'}`,
        headline: 'Your move is in progress!',
        message: 'Your items are being handled and your driver is on the way. Track the live location from your dashboard.',
      },
      completed: {
        subject: `Your move is complete: ${move.dropoff_address || 'Delivery'}`,
        headline: 'Your move is complete!',
        message: 'Your items have been delivered. Thank you for choosing us — we hope everything went smoothly!',
      },
      cancelled: {
        subject: `Your move has been cancelled: ${move.pickup_address || 'Pickup'}`,
        headline: 'Move cancelled',
        message: 'Your move request has been cancelled. If you believe this is an error, please contact support.',
      },
    };

    const info = STATUS_INFO[move.status];
    if (!info) {
      return Response.json({ skipped: true, reason: `No notification template for status: ${move.status}` });
    }

    const moveDate = move.move_date
      ? new Date(move.move_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : null;

    const greeting = move.customer_name ? `Hi ${move.customer_name.split(' ')[0]},` : 'Hello,';

    const detailRows = [
      moveDate ? ['Move Date', moveDate] : null,
      move.move_time ? ['Move Time', move.move_time] : null,
      move.pickup_address ? ['Pickup', move.pickup_address] : null,
      move.dropoff_address ? ['Drop-off', move.dropoff_address] : null,
      move.assigned_driver_name ? ['Driver', move.assigned_driver_name] : null,
    ].filter(Boolean);

    const htmlBody = [
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
      `<p>${greeting}</p>`,
      `<h2 style="margin:8px 0 4px;color:#16a34a;">${info.headline}</h2>`,
      `<p style="color:#4b5563;">${info.message}</p>`,
      detailRows.length > 0
        ? `<table style="width:100%;border-collapse:collapse;margin:20px 0;">${detailRows
            .map(
              ([label, value]) =>
                `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;width:120px;">${label}</td><td style="padding:8px 0;">${value}</td></tr>`
            )
            .join('')}</table>`
        : '',
      `<p style="margin-top:24px;color:#4b5563;">Log in to your account to view full details and track your move.</p>`,
      `</div>`,
    ].join('\n');

    const plainBody = `${greeting}\n\n${info.headline}\n${info.message}\n\n${detailRows
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n')}\n\nLog in to your account to view full details.`;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: move.customer_email,
        subject: info.subject,
        body: htmlBody,
      });
    } catch (err) {
      console.error(`Failed to email customer ${move.customer_email}:`, err.message);
      return Response.json({ sent: false, error: err.message }, { status: 500 });
    }

    return Response.json({ sent: true, to: move.customer_email, status: move.status });
  } catch (error) {
    console.error('notify-customer-status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});