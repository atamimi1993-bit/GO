import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CURRENCIES = {
  USD: { symbol: '$', decimals: 2 },
  EUR: { symbol: '€', decimals: 2 },
  GBP: { symbol: '£', decimals: 2 },
  CAD: { symbol: 'C$', decimals: 2 },
  AUD: { symbol: 'A$', decimals: 2 },
  JPY: { symbol: '¥', decimals: 0 },
  INR: { symbol: '₹', decimals: 2 },
};

function formatMoney(amount, currencyCode) {
  const curr = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return curr.symbol + Number(amount || 0).toFixed(curr.decimals);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PAYMENT_LABELS = {
  full: 'Full Payment',
  deposit: 'Deposit Payment',
  pickup: 'Pickup Payment',
  delivery: 'Delivery Payment',
  installment: 'Installment Payment',
  tip: 'Driver Gratuity',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { move_request_id, payment_type, stripe_session_id, amount_paid } = body;
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

    const items = await base44.asServiceRole.entities.MoveItem.filter(
      { move_request_id: move.id },
      '-created_date',
      200
    );

    const currencyCode = move.currency || 'USD';
    const curr = CURRENCIES[currencyCode] || CURRENCIES.USD;
    const fmt = (v) => formatMoney(v, currencyCode);

    const paymentLabel = PAYMENT_LABELS[payment_type] || 'Payment';
    const paymentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const moveDate = move.move_date
      ? new Date(move.move_date).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
      : 'N/A';

    const greeting = move.customer_name
      ? `Hi ${escapeHtml(move.customer_name.split(' ')[0])},`
      : 'Hello,';

    // Build invoice line items
    const invoiceLines = [
      { label: 'Base Service', amount: move.base_cost },
      { label: 'Fuel Cost', amount: move.fuel_cost },
      move.tolls ? { label: 'Tolls', amount: move.tolls } : null,
      move.bulky_item_fee ? { label: 'Bulky Item Surcharge', amount: move.bulky_item_fee } : null,
      move.materials_fee ? { label: 'Packing Materials', amount: move.materials_fee } : null,
      move.carrying_fee ? { label: 'Carrying Surcharge', amount: move.carrying_fee } : null,
      move.extra_service_fee ? { label: 'Extra Services', amount: move.extra_service_fee } : null,
      move.tax_amount ? { label: `Tax (${((move.tax_rate || 0) * 100).toFixed(1)}%)`, amount: move.tax_amount } : null,
      move.app_fee ? { label: 'Platform Fee', amount: move.app_fee } : null,
      move.tip_paid && move.tip_amount ? { label: 'Driver Gratuity', amount: move.tip_amount } : null,
    ].filter(Boolean);

    const invoiceRowsHtml = invoiceLines
      .map((line) =>
        `<tr><td style="padding:6px 0;color:#4b5563;">${escapeHtml(line.label)}</td><td style="padding:6px 0;text-align:right;font-weight:500;">${formatMoney(line.amount, currencyCode)}</td></tr>`
      )
      .join('');

    // Items table
    const itemsHtml = items.length > 0
      ? `<div style="margin:24px 0;">
           <h3 style="font-size:14px;font-weight:bold;color:#374151;margin-bottom:8px;">Items Moved (${items.length})</h3>
           <table style="width:100%;border-collapse:collapse;font-size:13px;">
             <thead>
               <tr style="border-bottom:1px solid #e5e7eb;">
                 <th style="text-align:left;padding:6px 0;color:#6b7280;font-weight:600;">Item</th>
                 <th style="text-align:center;padding:6px 0;color:#6b7280;font-weight:600;">Qty</th>
                 <th style="text-align:right;padding:6px 0;color:#6b7280;font-weight:600;">Weight</th>
               </tr>
             </thead>
             <tbody>
               ${items.map((item) =>
                 `<tr style="border-bottom:1px solid #f3f4f6;">
                   <td style="padding:6px 0;color:#1f2937;">${escapeHtml(item.name)}${item.special_handling ? ' ⚠️' : ''}</td>
                   <td style="padding:6px 0;text-align:center;color:#4b5563;">${item.quantity || 1}</td>
                   <td style="padding:6px 0;text-align:right;color:#4b5563;">${item.weight_lbs || 0} lbs</td>
                 </tr>`
               ).join('')}
             </tbody>
           </table>
         </div>`
      : '';

    // Move summary rows
    const summaryRows = [
      ['Move Date', moveDate],
      move.move_time ? ['Scheduled Time', escapeHtml(move.move_time)] : null,
      ['Pickup Address', escapeHtml(move.pickup_address)],
      ['Drop-off Address', escapeHtml(move.dropoff_address)],
      move.assigned_driver_name ? ['Assigned Driver', escapeHtml(move.assigned_driver_name)] : null,
      move.distance_miles ? ['Distance', `${Number(move.distance_miles).toFixed(1)} ${move.distance_unit || 'mi'}`] : null,
      move.total_weight_lbs ? ['Total Weight', `${move.total_weight_lbs.toLocaleString()} lbs`] : null,
      move.truck_size_needed ? ['Truck Size', escapeHtml(move.truck_size_needed.replace(/_/g, ' '))] : null,
      ['Payment Date', paymentDate],
    ].filter(Boolean);

    const summaryRowsHtml = summaryRows
      .map(([label, value]) =>
        `<tr><td style="padding:6px 0;font-weight:600;color:#6b7280;width:160px;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#1f2937;">${value}</td></tr>`
      )
      .join('');

    // Payment-specific receipt info
    const receiptId = stripe_session_id ? stripe_session_id.slice(-8).toUpperCase() : move.id.slice(-8).toUpperCase();

    // Determine remaining balance for partial payments
    let balanceHtml = '';
    if (move.payment_option && move.payment_option !== 'full' && move.balance_due > 0) {
      const planLabel = move.payment_option === 'split_50_50' ? '50/50 Split Payment' : 'Installment Plan';
      let balanceRows = `<tr><td style="padding:6px 0;font-weight:600;color:#6b7280;width:160px;">Payment Plan</td><td style="padding:6px 0;color:#1f2937;">${escapeHtml(planLabel)}</td></tr>`;
      if (move.deposit_amount) {
        balanceRows += `<tr><td style="padding:6px 0;font-weight:600;color:#6b7280;">Deposit</td><td style="padding:6px 0;color:#1f2937;">${fmt(move.deposit_amount)} ${move.deposit_paid ? '✅ Paid' : '⏳ Pending'}</td></tr>`;
      }
      balanceRows += `<tr><td style="padding:6px 0;font-weight:600;color:#6b7280;">Remaining Balance</td><td style="padding:6px 0;color:#dc2626;font-weight:bold;">${fmt(move.balance_due)}</td></tr>`;
      balanceHtml = `<div style="margin:16px 0;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px;"><table style="width:100%;font-size:13px;border-collapse:collapse;">${balanceRows}</table></div>`;
    }

    const paymentBadge = move.paid
      ? '<span style="display:inline-block;background:#dcfce7;color:#166534;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;">FULLY PAID ✅</span>'
      : '<span style="display:inline-block;background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;">PARTIAL PAYMENT</span>';

    // Discount line
    const discountHtml = move.discount_amount > 0
      ? `<tr><td style="padding:6px 0;color:#16a34a;">Promo "${escapeHtml(move.promo_code || '')}" Discount</td><td style="padding:6px 0;text-align:right;color:#16a34a;font-weight:500;">-${fmt(move.discount_amount)}</td></tr>`
      : '';

    const subject = `Payment Receipt — ${escapeHtml(paymentLabel)} for Your Move (${receiptId})`;

    const htmlBody = [
      `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">`,
      // Header
      `<div style="background:#16a34a;padding:24px 20px;border-radius:12px 12px 0 0;text-align:center;">`,
      `<div style="color:#fff;font-size:28px;font-weight:bold;letter-spacing:1px;">GO</div>`,
      `<h1 style="color:#fff;margin:8px 0 4px;font-size:20px;">Payment Receipt</h1>`,
      `<p style="color:#dcfce7;margin:0;font-size:13px;">${escapeHtml(paymentLabel)} · Receipt #${receiptId}</p>`,
      `</div>`,
      // Body
      `<div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px 20px;">`,
      `<p>${greeting}</p>`,
      `<p style="color:#4b5563;">We've received your <strong>${escapeHtml(paymentLabel.toLowerCase())}</strong> for your upcoming move. Below is your detailed receipt and move summary for your records.</p>`,
      // Payment confirmation box
      `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin:16px 0;display:flex;align-items:center;justify-content:space-between;">`,
      `<div><p style="margin:0;font-size:13px;color:#166534;font-weight:600;">Payment Received on ${paymentDate}</p>${amount_paid ? `<p style="margin:2px 0 0;font-size:12px;color:#16a34a;">Amount: ${fmt(amount_paid)}</p>` : ''}</div>`,
      `${paymentBadge}`,
      `</div>`,
      // Move Summary
      `<div style="margin:24px 0;">
        <h3 style="font-size:14px;font-weight:bold;color:#374151;margin-bottom:8px;">Move Summary</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">${summaryRowsHtml}</table>
      </div>`,
      // Items
      itemsHtml,
      // Balance / payment plan info
      balanceHtml,
      // Invoice
      `<div style="margin:24px 0;">
        <h3 style="font-size:14px;font-weight:bold;color:#374151;margin-bottom:8px;">Invoice Breakdown</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          ${invoiceRowsHtml}
          ${discountHtml}
          <tr style="border-top:2px solid #1f2937;">
            <td style="padding:10px 0;font-weight:bold;font-size:15px;color:#1f2937;">Total</td>
            <td style="padding:10px 0;text-align:right;font-weight:bold;font-size:15px;color:#1f2937;">${fmt(move.total_price)}</td>
          </tr>
        </table>
      </div>`,
      // Driver note
      move.assigned_driver_name
        ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#166534;">Your assigned driver is <strong>${escapeHtml(move.assigned_driver_name)}</strong>. You'll receive updates as your move progresses.</p>
          </div>`
        : '',
      move.notes
        ? `<div style="margin:16px 0;">
            <h3 style="font-size:14px;font-weight:bold;color:#374151;margin-bottom:4px;">Notes</h3>
            <p style="font-size:13px;color:#4b5563;white-space:pre-wrap;">${escapeHtml(move.notes)}</p>
          </div>`
        : '',
      `<p style="margin-top:24px;font-size:12px;color:#6b7280;text-align:center;border-top:1px solid #e5e7eb;padding-top:16px;">This is an automated receipt generated upon payment processing. Please keep it for your records. For questions, contact support through your GO app.</p>`,
      `</div>`,
      `</div>`,
    ].join('\n');

    const plainBody = `${greeting}\n\nWe've received your ${paymentLabel} for your move.\n\nReceipt #${receiptId}\nPayment Date: ${paymentDate}\n\nMove Summary:\n${summaryRows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nInvoice Breakdown:\n${invoiceLines.map((line) => `${line.label}: ${formatMoney(line.amount, currencyCode)}`).join('\n')}\nTotal: ${fmt(move.total_price)}\nPayment Status: ${move.paid ? 'FULLY PAID' : 'PARTIAL PAYMENT'}${move.balance_due > 0 ? `\nRemaining Balance: ${fmt(move.balance_due)}` : ''}\n\nThank you for choosing GO!`;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: move.customer_email,
        subject,
        body: htmlBody,
      });
    } catch (err) {
      console.error(`Failed to send payment receipt to ${move.customer_email}:`, err.message);
      return Response.json({ sent: false, error: err.message }, { status: 500 });
    }

    // Create in-app notification too
    try {
      await base44.asServiceRole.entities.AppNotification.create({
        user_email: move.customer_email,
        title: `${paymentLabel} Received`,
        body: `Your payment of ${amount_paid ? fmt(amount_paid) : fmt(move.total_price)} has been processed. Receipt #${receiptId} sent to your email.`,
        type: 'success',
        link: `/move/${move.id}`,
      });
    } catch (notifErr) {
      console.error('Failed to create payment notification:', notifErr.message);
    }

    return Response.json({
      sent: true,
      to: move.customer_email,
      move_id: move.id,
      payment_type: paymentLabel,
      receipt_id: receiptId,
    });
  } catch (error) {
    console.error('send-payment-receipt error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});