import React from 'react';
import { TRUCK_SIZE_LABELS, getCurrency } from '@/lib/pricing';
import { calculateCarbonFootprint, formatCO2 } from '@/lib/carbon';
import { Leaf, TrendingUp } from 'lucide-react';
import SurgeBadge from '@/components/go/SurgeBadge';

export default function PriceBreakdown({ pricing, truckSize, currencyCode, showInternalCosts = false }) {
  if (!pricing) return null;

  const curr = pricing.currency || getCurrency(currencyCode || 'USD');
  const sym = curr.symbol;
  const fmt = (v) => v < 0 ? `-${sym}${Math.abs(Number(v)).toFixed(curr.decimals)}` : sym + Number(v).toFixed(curr.decimals);

  const fuelLabel = pricing.displayFuel != null
    ? `Fuel (${pricing.displayFuel} ${pricing.displayFuelUnit} × ${pricing.displayDistance} ${pricing.displayDistanceUnit} round-trip)`
    : `Fuel (${pricing.gallonsNeeded || 0} gal × ${pricing.roundTripMiles || 0} mi round-trip)`;

  const surgeReasons = [...(pricing.surgeReasons || [])];
  if (pricing.peakDayMultiplier > 1) surgeReasons.push('Last weekend of month');
  if (pricing.sameDayMultiplier > 1) surgeReasons.push('Same-day service');
  const surgeLabel = surgeReasons.length > 1 ? surgeReasons.join(' + ') : (pricing.surgeLabel || 'Dynamic pricing');

  const lines = [
    { label: `Base cost (${TRUCK_SIZE_LABELS[truckSize] || truckSize})`, value: pricing.baseCost },
    ...(pricing.laborCost ? [{ label: `Labor (${pricing.laborHours} hrs)`, value: pricing.laborCost }] : []),
    { label: fuelLabel, value: pricing.fuelCost },
    ...(pricing.tolls ? [{ label: 'Tolls (reimbursed to driver)', value: pricing.tolls }] : []),
    ...(pricing.bulkyItemFee ? [{ label: 'Bulky item surcharge', value: pricing.bulkyItemFee }] : []),
    ...(pricing.materialsFee ? [{ label: 'Packing materials', value: pricing.materialsFee }] : []),
    ...(pricing.stairsFee ? [{ label: 'Stairs fee (no elevator)', value: pricing.stairsFee }] : []),
    ...(pricing.longCarryFee ? [{ label: 'Long carry fee (75ft+)', value: pricing.longCarryFee }] : []),
    ...(pricing.extraServiceFee ? [{ label: `Extra services${pricing.extraHelper ? ' (helper)' : ''}${pricing.elevatorService ? ' (elevator)' : ''}`, value: pricing.extraServiceFee }] : []),
    ...(pricing.surgeMultiplier > 1 ? [{ label: `Dynamic pricing (${surgeLabel}, ×${pricing.surgeMultiplier})`, value: pricing.surgeAdjustedSubtotal - pricing.operationalSubtotal }] : []),
    ...(pricing.loyaltyDiscount ? [{ label: 'Loyalty discount (returning customer)', value: -pricing.loyaltyDiscount, highlight: true }] : []),
    { label: 'Subtotal (pre-tax)', value: pricing.totalPrice - pricing.taxAmount, bold: true },
    { label: `Tax (${(pricing.taxRate * 100).toFixed(2)}%)`, value: pricing.taxAmount },
  ];

  const surge = { multiplier: pricing.surgeMultiplier || 1, label: pricing.surgeLabel || 'Normal Pricing', level: pricing.surgeLevel || 'normal' };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-bold text-lg">Price Breakdown</h3>
        {surge.level !== 'normal' && <SurgeBadge surge={surge} compact />}
      </div>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className={`flex justify-between text-sm ${line.bold ? "border-t pt-2 font-semibold" : ""}`}>
            <span className={line.highlight ? "text-emerald-600 dark:text-emerald-400 font-medium" : line.bold ? "font-semibold" : "text-muted-foreground"}>{line.label}</span>
            <span className={`font-medium ${line.highlight ? "text-emerald-600 dark:text-emerald-400" : line.bold ? "font-bold" : ""}`}>{fmt(line.value)}</span>
          </div>
        ))}
        {pricing.minimumJobFee ? (
          <div className="flex justify-between text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1">
            <span>Minimum job fee floor applied</span>
            <span className="font-medium">{fmt(pricing.minimumJobFee)}</span>
          </div>
        ) : null}
      </div>
      <div className="border-t pt-3 flex justify-between">
        <span className="font-display font-bold text-lg">Total</span>
        <span className="font-display font-black text-2xl text-emerald-600 dark:text-emerald-400">
          {fmt(pricing.totalPrice)}
        </span>
      </div>
      {pricing.marketRate > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Market rate (traditional mover)</span>
          <span className="line-through">{fmt(pricing.marketRate)}</span>
        </div>
      )}
      {showInternalCosts && (
        <div className="bg-emerald-500/10 rounded-lg p-3 text-sm text-emerald-600 dark:text-emerald-400 space-y-1">
          <div>Driver payout ({pricing.driverPayoutPercent || (pricing.totalPrice > 0 ? Math.round((pricing.driverPayout / pricing.totalPrice) * 100) : 0)}%): <span className="font-bold">{fmt(pricing.driverPayout)}</span></div>
          <div className="text-xs text-muted-foreground">Platform fee ({pricing.platformTakePercent || (pricing.totalPrice > 0 ? Math.round((pricing.appFee / pricing.totalPrice) * 100) : 0)}%): {fmt(pricing.appFee)}</div>
        </div>
      )}
      {(() => {
        const carbon = calculateCarbonFootprint({
          roundTripMiles: pricing.roundTripMiles || pricing.displayDistance || 0,
          fuelType: 'gasoline',
          mpg: pricing.gallonsNeeded ? (pricing.roundTripMiles / pricing.gallonsNeeded) : 14,
        });
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            <Leaf size={14} className="text-emerald-500" />
            <span>Carbon impact: <span className="font-medium">{formatCO2(carbon.co2Kg)}</span></span>
            {carbon.isGreen && <span className="text-emerald-600 dark:text-emerald-400 font-medium">🌱 Eco-friendly</span>}
          </div>
        );
      })()}
    </div>
  );
}