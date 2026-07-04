import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@2.5.2';

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

function escapeText(str) {
  if (str == null) return '';
  return String(str);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
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

    // Fetch move items
    const items = await base44.asServiceRole.entities.MoveItem.filter(
      { move_request_id: move.id },
      '-created_date',
      200
    );

    const currencyCode = move.currency || 'USD';
    const curr = CURRENCIES[currencyCode] || CURRENCIES.USD;
    const fmt = (v) => formatMoney(v, currencyCode);

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    // ── Header banner ──
    doc.setFillColor(22, 163, 74); // emerald-600
    doc.rect(0, 0, pageWidth, 80, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('GO', margin, 35);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Moving & Logistics', margin + 30, 35);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Receipt', pageWidth - margin, 35, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt #${move.id.slice(-8).toUpperCase()}`, pageWidth - margin, 52, { align: 'right' });

    y = 100;

    // ── Customer & Move Info ──
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Billed To:', margin, y);
    doc.text('Move Details:', pageWidth / 2, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    y += 15;

    const customerLines = [
      escapeText(move.customer_name || 'Customer'),
      escapeText(move.customer_email || ''),
      escapeText(move.customer_phone || ''),
    ].filter(Boolean);

    const moveDateStr = move.move_date
      ? new Date(move.move_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A';

    const completedDateStr = move.updated_date
      ? new Date(move.updated_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const moveLines = [
      `Date: ${moveDateStr}`,
      move.move_time ? `Time: ${escapeText(move.move_time)}` : null,
      `Distance: ${Number(move.distance_miles || 0).toFixed(1)} ${move.distance_unit || 'mi'}`,
      move.total_weight_lbs ? `Total Weight: ${move.total_weight_lbs.toLocaleString()} lbs` : null,
      move.truck_size_needed ? `Truck: ${escapeText(move.truck_size_needed.replace(/_/g, ' '))}` : null,
      move.assigned_driver_name ? `Driver: ${escapeText(move.assigned_driver_name)}` : null,
    ].filter(Boolean);

    const maxInfoLines = Math.max(customerLines.length, moveLines.length);
    for (let i = 0; i < maxInfoLines; i++) {
      if (customerLines[i]) doc.text(customerLines[i], margin, y + i * 14);
      if (moveLines[i]) doc.text(moveLines[i], pageWidth / 2, y + i * 14);
    }
    y += maxInfoLines * 14 + 10;

    // ── Addresses ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text('Pickup:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    const pickupLines = doc.splitTextToSize(escapeText(move.pickup_address || 'N/A'), contentWidth / 2 - 50);
    doc.text(pickupLines, margin + 45, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Drop-off:', pageWidth / 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    const dropoffLines = doc.splitTextToSize(escapeText(move.dropoff_address || 'N/A'), contentWidth / 2 - 50);
    doc.text(dropoffLines, pageWidth / 2 + 55, y);

    y += Math.max(pickupLines.length, dropoffLines.length) * 14 + 20;

    // ── Items table ──
    if (items.length > 0) {
      // Check page break
      if (y > pageHeight - 150) { doc.addPage(); y = margin; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text(`Items Moved (${items.length})`, margin, y);
      y += 10;

      // Table header
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.rect(margin, y, contentWidth, 22, 'F');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text('Item', margin + 8, y + 15);
      doc.text('Qty', margin + contentWidth - 120, y + 15, { align: 'right' });
      doc.text('Weight', margin + contentWidth - 8, y + 15, { align: 'right' });
      y += 22;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      items.forEach((item) => {
        if (y > pageHeight - 40) { doc.addPage(); y = margin; }
        doc.rect(margin, y, contentWidth, 20, 'D');
        const itemName = escapeText(item.name) + (item.special_handling ? ' ⚠' : '');
        doc.text(itemName.slice(0, 50), margin + 8, y + 14);
        doc.text(String(item.quantity || 1), margin + contentWidth - 120, y + 14, { align: 'right' });
        doc.text(`${item.weight_lbs || 0} lbs`, margin + contentWidth - 8, y + 14, { align: 'right' });
        y += 20;
      });
      y += 15;
    }

    // ── Invoice line items ──
    if (y > pageHeight - 180) { doc.addPage(); y = margin; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text('Invoice Summary', margin, y);
    y += 15;

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
    ].filter(Boolean);

    doc.setFontSize(10);
    invoiceLines.forEach((line) => {
      if (y > pageHeight - 60) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(line.label, margin, y);
      doc.setFont('helvetica', 'medium');
      doc.text(fmt(line.amount), pageWidth - margin, y, { align: 'right' });
      y += 18;
    });

    // ── Total ──
    y += 5;
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(1.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Total Paid', margin, y);
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(18);
    doc.text(fmt(move.total_price), pageWidth - margin, y, { align: 'right' });
    y += 15;

    // Payment status badge
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    if (move.paid) {
      doc.setFillColor(220, 252, 231); // emerald-100
      doc.roundedRect(margin, y - 8, 50, 16, 8, 8, 'F');
      doc.setTextColor(22, 101, 52);
      doc.text('PAID', margin + 25, y + 3, { align: 'center' });
    } else {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.roundedRect(margin, y - 8, 70, 16, 8, 8, 'F');
      doc.setTextColor(146, 64, 14);
      doc.text('PENDING', margin + 35, y + 3, { align: 'center' });
    }

    // Completed date
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(`Move completed: ${completedDateStr}`, pageWidth - margin, y + 3, { align: 'right' });
    y += 30;

    // ── Payment details (if split/installment) ──
    if (move.payment_option && move.payment_option !== 'full') {
      if (y > pageHeight - 80) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text('Payment Plan', margin, y);
      y += 15;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      const planLabel = move.payment_option === 'split_50_50' ? '50/50 Split Payment' : 'Installment Plan';
      doc.text(planLabel, margin, y);
      y += 14;

      if (move.deposit_amount) {
        doc.text(`Deposit: ${fmt(move.deposit_amount)}${move.deposit_paid ? ' (Paid)' : ' (Pending)'}`, margin, y);
        y += 14;
      }
      if (move.balance_due) {
        doc.text(`Balance Due: ${fmt(move.balance_due)}`, margin, y);
        y += 14;
      }
      if (move.payment_option === 'installment_plan' && move.monthly_payment) {
        doc.text(`Monthly: ${fmt(move.monthly_payment)} for ${move.installment_term_months || 0} months`, margin, y);
        y += 14;
      }
      y += 10;
    }

    // ── Discount ──
    if (move.discount_amount > 0) {
      if (y > pageHeight - 40) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(22, 163, 74);
      doc.text(`Promo "${escapeText(move.promo_code || '')}" discount: -${fmt(move.discount_amount)}`, margin, y);
      y += 18;
    }

    // ── Footer ──
    if (y > pageHeight - 60) { doc.addPage(); y = margin; }
    y = pageHeight - 50;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('This receipt was automatically generated upon completion of your move.', margin, y);
    doc.text('Thank you for choosing GO!', pageWidth - margin, y, { align: 'right' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${move.id.slice(-8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('generate-move-receipt error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});