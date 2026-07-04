import React from 'react';
import { TRUCK_SIZE_LABELS, getCurrency } from '@/lib/pricing';

export default function PriceBreakdown({ pricing, truckSize, currencyCode }) {
  if (!pricing) return null;

  const curr = pricing.currency || getCurrency(currencyCode || 'USD');
  const sym = curr.symbol;
  const fmt = (v) => sym + Number(v).toFixed(curr.decimals);

  const fuelLabel = pricing.displayFuel != null
    ? `Fuel (${pricing.displayFuel} ${pricing.displayFuelUnit} × ${pricing.displayDistance} ${pricing.displayDistanceUnit} round-trip)`
    : `Fuel (${pricing.gallonsNeeded || 0} gal × ${pricing.roundTripMiles || 0} mi round-trip)`;

  const lines = [
    { label: `Base cost (${TRUCK_SIZE_LABELS[truckSize] || truckSize})`, value: pricing.baseCost },
    { label: fuelLabel, value: pricing.fuelCost },
    { label: `Tax (${(pricing.taxRate * 100).toFixed(2)}%)`, value: pricing.taxAmount },
    { label: 'GO App Fee (25%)', value: pricing.appFee },
    { label: 'Driver Fee (5%)', value: pricing.driverFee },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
      <h3 className="font-display font-bold text-lg mb-1">Price Breakdown</h3>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{line.label}</span>
            <span className="font-medium">{fmt(line.value)}</span>
          </div>
        ))}
      </div>
      <div className="border-t pt-3 flex justify-between">
        <span className="font-display font-bold text-lg">Total</span>
        <span className="font-display font-black text-2xl text-emerald-600 dark:text-emerald-400">
          {fmt(pricing.totalPrice)}
        </span>
      </div>
      <div className="bg-emerald-500/10 rounded-lg p-3 text-sm text-emerald-600 dark:text-emerald-400">
        Driver payout for this job: <span className="font-bold">{fmt(pricing.driverPayout)}</span>
      </div>
    </div>
  );
}