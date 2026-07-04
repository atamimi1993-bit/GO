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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

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

    // Fetch move items for the summary
    const items = await base44.asServiceRole.entities.MoveItem.filter(
      { move_request_id: move.id },
      '-created_date',
      200
    );

    const currencyCode = move.currency || 'USD';
    const curr = CURRENCIES[currencyCode] || CURRENCIES.USD;

    const moveDate = move.move_date
      ? new Date(move.move_date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : 'N/A';

    const completedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const greeting = move.customer_name
      ? `Hi ${escapeHtml(move.customer_name.split(' ')[0])},`
      : 'Hello,';

    // Invoice line items
    const invoiceLines = [
      { label: 'Base Service', amount: move.base_cost },
      { label: 'Fuel Cost', amount: move.fuel_cost },
      move.tolls ? { label: 'Tolls', amount: move.tolls } : null,
      move.tax_amount ? { label: `Tax (${((move.tax_rate || 0) * 100).toFixed(1)}%)`, amount: move.tax_amount } : null,
      move.app_fee ? { label: 'Platform Fee', amount: move.app_fee } : null,
    ].filter(Boolean);

    const invoiceRowsHtml = invoiceLines
      .map(
        (line) =>
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
               ${items
                 .map(
                   (item) =>
                     `<tr style="border-bottom:1px solid #f3f4f6;">
                       <td style="padding:6px 0;color:#1f2937;">${escapeHtml(item.name)}${item.special_handling ? ' ⚠️' : ''}</td>
                       <td style="padding:6px 0;text-align:center;color:#4b5563;">${item.quantity || 1}</td>
                       <td style="padding:6px 0;text-align:right;color:#4b5563;">${item.weight_lbs || 0} lbs</td>
                     </tr>`
                 )
                 .join('')}
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
      ['Delivery Confirmed', completedDate],
    ].filter(Boolean);

    const summaryRowsHtml = summaryRows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 0;font-weight:600;color:#6b7280;width:160px;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#1f2937;">${value}</td></tr>`
      )
      .join('');

    const paymentBadge = move.paid
      ? '<span style="display:inline-block;background:#dcfce7;color:#166534;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;">PAID</span>'
      : '<span style="display:inline-block;background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;">PENDING</span>';

    const subject = `Your Move Invoice & Summary — ${escapeHtml(move.pickup_address || 'Move')} → ${escapeHtml(move.dropoff_address || 'Delivery')}`;

    const htmlBody = [
      `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">`,
      // Header
      `<div style="background:#16a34a;padding:24px 20px;border-radius:12px 12px 0 0;text-align:center;">`,
      `<h1 style="color:#fff;margin:0;font-size:22px;">Move Complete! 🎉</h1>`,
      `<p style="color:#dcfce7;margin:4px 0 0;font-size:13px;">Your move summary and final invoice</p>`,
      `</div>`,
      // Body
      `<div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px 20px;">`,
      `<p>${greeting}</p>`,
      `<p style="color:#4b5563;">Your move has been confirmed as complete. Below is your professional move summary and final invoice for your records. Please keep this email for your reference.</p>`,
      // Move Summary
      `<div style="margin:24px 0;">
        <h3 style="font-size:14px;font-weight:bold;color:#374151;margin-bottom:8px;">Move Summary</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">${summaryRowsHtml}</table>
      </div>`,
      // Items
      itemsHtml,
      // Invoice
      `<div style="margin:24px 0;">
        <h3 style="font-size:14px;font-weight:bold;color:#374151;margin-bottom:8px;">Final Invoice</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          ${invoiceRowsHtml}
          <tr style="border-top:2px solid #1f2937;">
            <td style="padding:10px 0;font-weight:bold;font-size:15px;color:#1f2937;">Total</td>
            <td style="padding:10px 0;text-align:right;font-weight:bold;font-size:15px;color:#1f2937;">${formatMoney(move.total_price, currencyCode)}</td>
          </tr>
        </table>
        <div style="margin-top:12px;">${paymentBadge}</div>
      </div>`,
      // Driver payout note
      move.assigned_driver_name
        ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#166534;">Your driver, <strong>${escapeHtml(move.assigned_driver_name)}</strong>, has been notified of the completion. Consider leaving a rating to help other customers!</p>
          </div>`
        : '',
      move.notes
        ? `<div style="margin:16px 0;">
            <h3 style="font-size:14px;font-weight:bold;color:#374151;margin-bottom:4px;">Notes</h3>
            <p style="font-size:13px;color:#4b5563;white-space:pre-wrap;">${escapeHtml(move.notes)}</p>
          </div>`
        : '',
      `<p style="margin-top:24px;font-size:12px;color:#6b7280;text-align:center;border-top:1px solid #e5e7eb;padding-top:16px;">This is an automated email. Please keep it for your records. If you have any questions, contact support through your app.</p>`,
      `</div>`,
      `</div>`,
    ].join('\n');

    const plainBody = `${greeting}\n\nYour move has been confirmed as complete. Here is your summary and final invoice.\n\nMove Summary:\n${summaryRows
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n')}\n\nFinal Invoice:\n${invoiceLines
      .map((line) => `${line.label}: ${formatMoney(line.amount, currencyCode)}`)
      .join('\n')}\nTotal: ${formatMoney(move.total_price, currencyCode)}\nPayment: ${move.paid ? 'PAID' : 'PENDING'}\n\nThank you for choosing us!`;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: move.customer_email,
        subject,
        body: htmlBody,
      });
    } catch (err) {
      console.error(`Failed to email invoice to ${move.customer_email}:`, err.message);
      return Response.json({ sent: false, error: err.message }, { status: 500 });
    }

    return Response.json({
      sent: true,
      to: move.customer_email,
      move_id: move.id,
      total_price: move.total_price,
      currency: currencyCode,
    });
  } catch (error) {
    console.error('send-move-invoice error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});