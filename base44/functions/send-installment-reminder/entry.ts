import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find all moves on an active payment plan with a remaining balance
    const planMoves = await base44.asServiceRole.entities.MoveRequest.filter({
      payment_plan: true,
      paid: false,
    });

    let sent = 0;
    let skipped = 0;
    const errors = [];

    for (const move of planMoves) {
      if (!move.balance_due || move.balance_due <= 0) {
        skipped++;
        continue;
      }
      if (move.status === 'cancelled') {
        skipped++;
        continue;
      }
      if (!move.customer_email) {
        skipped++;
        continue;
      }

      const installmentNum = (move.installments_paid || 0) + 1;
      const totalInstallments = move.installments_total_count || 3;
      const greeting = move.customer_name ? `Hi ${move.customer_name.split(' ')[0]},` : 'Hello,';

      const htmlBody = [
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
        `<p>${greeting}</p>`,
        `<h2 style="margin:8px 0 4px;color:#2563eb;">Payment Reminder: Installment ${installmentNum} of ${totalInstallments}</h2>`,
        `<p style="color:#4b5563;">This is a friendly reminder that your next payment for your move from <strong>${move.pickup_address || 'pickup'}</strong> to <strong>${move.dropoff_address || 'drop-off'}</strong> is due.</p>`,
        `<table style="width:100%;border-collapse:collapse;margin:20px 0;">`,
        `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;width:160px;">Installment Amount</td><td style="padding:8px 0;">$${(move.installment_amount || 0).toFixed(2)}</td></tr>`,
        `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Remaining Balance</td><td style="padding:8px 0;">$${(move.balance_due || 0).toFixed(2)}</td></tr>`,
        `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;">Installments Paid</td><td style="padding:8px 0;">${move.installments_paid || 0} / ${totalInstallments}</td></tr>`,
        `</table>`,
        `<p style="margin-top:24px;color:#4b5563;">Log in to your account, open your move details, and tap "Pay Next Installment" to complete this payment.</p>`,
        `</div>`,
      ].join('\n');

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: move.customer_email,
          subject: `Payment Reminder: Installment ${installmentNum} of ${totalInstallments} — $${(move.installment_amount || 0).toFixed(2)} due`,
          body: htmlBody,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send reminder to ${move.customer_email}:`, err.message);
        errors.push({ move_id: move.id, error: err.message });
      }
    }

    return Response.json({ sent, skipped, total: planMoves.length, errors });
  } catch (error) {
    console.error('send-installment-reminder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});