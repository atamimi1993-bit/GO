import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

// Generates a clean PDF summary for a vehicle rental listing.
// Includes vehicle specs, pricing breakdown, features, owner info,
// and a liability acknowledgment section for the renter to sign.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { rental_id } = body;
    if (!rental_id) {
      return Response.json({ error: 'rental_id is required' }, { status: 400 });
    }

    let rental;
    try {
      rental = await base44.asServiceRole.entities.VehicleRental.get(rental_id);
    } catch {
      return Response.json({ error: 'Rental not found' }, { status: 404 });
    }
    if (!rental) {
      return Response.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Verify the caller is authorized to view this rental
    if (rental.owner_email !== user.email && user.role !== 'admin') {
      if (!(rental.status === 'active' && rental.available)) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 20;

    // === Header ===
    doc.setFillColor(22, 163, 74); // emerald-600
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('GO — Vehicle Rental Summary', margin, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 21);
    doc.text(`Reference: #${rental.id.slice(-8).toUpperCase()}`, pageWidth - margin, 21, { align: 'right' });
    y = 38;

    // === Vehicle Title ===
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`${rental.make} ${rental.model}`, margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    const typeLabel = (rental.vehicle_type || 'vehicle').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    doc.text(`${typeLabel}${rental.year ? ' · ' + rental.year : ''}`, margin, y);
    y += 8;

    // === Section: Vehicle Specifications ===
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('VEHICLE SPECIFICATIONS', margin, y);
    y += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    const specs = [
      ['Vehicle Type', typeLabel],
      ['Make', rental.make || 'N/A'],
      ['Model', rental.model || 'N/A'],
      ['Year', rental.year ? String(rental.year) : 'N/A'],
      ['License Plate', rental.license_plate || 'N/A'],
      ['Transmission', rental.transmission ? (rental.transmission.charAt(0).toUpperCase() + rental.transmission.slice(1)) : 'N/A'],
      ['Fuel Type', rental.fuel_type ? (rental.fuel_type.charAt(0).toUpperCase() + rental.fuel_type.slice(1)) : 'N/A'],
      ['Capacity', rental.capacity_lbs > 0 ? `${rental.capacity_lbs.toLocaleString()} lbs` : 'N/A'],
      ['Seats', rental.seats > 0 ? String(rental.seats) : 'N/A'],
    ];

    doc.setFontSize(9);
    const specColW = (pageWidth - margin * 2) / 2;
    for (let i = 0; i < specs.length; i += 2) {
      const left = specs[i];
      const right = specs[i + 1];
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(left[0] + ':', margin, y);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text(String(left[1]), margin + 55, y);

      if (right) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(right[0] + ':', margin + specColW, y);
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.text(String(right[1]), margin + specColW + 55, y);
      }
      y += 5;
    }
    y += 4;

    // === Section: Pricing Breakdown ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text('PRICING BREAKDOWN', margin, y);
    y += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    const dailyRate = Number(rental.daily_rate || 0);
    const weeklyRate = Math.round(dailyRate * 7 * 0.9 * 100) / 100; // 10% weekly discount
    const monthlyRate = Math.round(dailyRate * 30 * 0.8 * 100) / 100; // 20% monthly discount

    const priceLines = [
      ['Daily Rate', `$${dailyRate.toFixed(2)}`],
      ['Weekly Rate (7 days, 10% off)', `$${weeklyRate.toFixed(2)}`],
      ['Monthly Rate (30 days, 20% off)', `$${monthlyRate.toFixed(2)}`],
    ];

    doc.setFontSize(9);
    for (const [label, value] of priceLines) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(value, pageWidth - margin, y, { align: 'right' });
      y += 5;
    }
    y += 3;

    // === Section: Description ===
    if (rental.description) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text('DESCRIPTION', margin, y);
      y += 2;
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      const descLines = doc.splitTextToSize(rental.description, pageWidth - margin * 2);
      for (const line of descLines) {
        if (y > pageHeight - 30) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 5;
      }
      y += 4;
    }

    // === Section: Features ===
    if (rental.features) {
      if (y > pageHeight - 40) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text('FEATURES', margin, y);
      y += 2;
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      const features = rental.features.split(',').map(f => f.trim()).filter(Boolean);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      let featureX = margin;
      for (const feature of features) {
        const text = `• ${feature}`;
        const textW = doc.getTextWidth(text);
        if (featureX + textW > pageWidth - margin) {
          y += 5;
          featureX = margin;
        }
        if (y > pageHeight - 30) { doc.addPage(); y = 20; }
        doc.text(text, featureX, y);
        featureX += textW + 8;
      }
      y += 8;
    }

    // === Section: Location & Owner ===
    if (y > pageHeight - 50) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text('LOCATION & OWNER', margin, y);
    y += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(9);
    const locationLines = [
      ['Location', `${rental.city || 'N/A'}${rental.state ? ', ' + rental.state : ''}`],
      ['Listed By', rental.owner_name || 'N/A'],
      ['Owner Type', rental.owner_type ? (rental.owner_type.charAt(0).toUpperCase() + rental.owner_type.slice(1)) : 'N/A'],
      ['Status', rental.status ? (rental.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) : 'N/A'],
    ];
    for (const [label, value] of locationLines) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(label + ':', margin, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(String(value), margin + 60, y);
      y += 5;
    }
    y += 6;

    // === Section: Liability Acknowledgment ===
    if (y > pageHeight - 80) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text('LIABILITY ACKNOWLEDGMENT', margin, y);
    y += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    const liabilityText = [
      'By renting this vehicle, the renter acknowledges that they have reviewed the vehicle',
      'specifications and pricing outlined above. The renter agrees to return the vehicle in the',
      'same condition it was received, and accepts financial responsibility for any damage, theft,',
      'or loss that occurs during the rental period. The renter confirms they hold a valid',
      'driver\'s license and insurance coverage as required by local law.',
      '',
      'This document serves as a summary of the rental listing terms and does not constitute a',
      'binding rental agreement until payment is processed and confirmed by the vehicle owner.',
    ];
    for (const line of liabilityText) {
      if (y > pageHeight - 40) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 10;

    // Signature lines
    if (y > pageHeight - 40) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.setDrawColor(31, 41, 55);

    // Renter signature
    doc.text('Renter Signature:', margin, y);
    doc.line(margin + 45, y, margin + 45 + 70, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    doc.text('Date:', margin + 45 + 75, y - 2);
    doc.line(margin + 45 + 75 + 12, y, pageWidth - margin, y);
    doc.setFontSize(9);
    y += 10;

    // Owner signature
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    doc.text('Owner Signature:', margin, y);
    doc.line(margin + 45, y, margin + 45 + 70, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    doc.text('Date:', margin + 45 + 75, y - 2);
    doc.line(margin + 45 + 75 + 12, y, pageWidth - margin, y);

    // === Footer ===
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('This summary was generated by the GO platform. For questions or support, contact us through the app.', margin, pageHeight - 10);
    doc.text(`Rental ID: ${rental.id}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rental-summary-${rental.id.slice(-8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('generate-rental-pdf error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});