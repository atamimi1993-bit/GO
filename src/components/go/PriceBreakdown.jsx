import React from 'react';
import { TRUCK_SIZE_LABELS } from '@/lib/pricing';

export default function PriceBreakdown({ pricing, truckSize }) {
  if (!pricing) return null;

  const lines = [
    { label: `Base cost (${TRUCK_SIZE_LABELS[truckSize] || truckSize})`, value: pricing.baseCost },
    { label: `Fuel (${pricing.gallonsNeeded} gal × ${pricing.roundTripMiles} mi round-trip)`, value: pricing.fuelCost },
    { label: `Tax (${(pricing.taxRate * 100).toFixed(2)}%)`, value: pricing.taxAmount },
    { label: 'GO App Fee (10%)', value: pricing.appFee },
    { label: 'Driver Fee (5%)', value: pricing.driverFee },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
      <h3 className="font-display font-bold text-lg mb-1">Price Breakdown</h3>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{line.label}</span>
            <span className="font-medium">${line.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="border-t pt-3 flex justify-between">
        <span className="font-display font-bold text-lg">Total</span>
        <span className="font-display font-black text-2xl text-emerald-600 dark:text-emerald-400">
          ${pricing.totalPrice.toFixed(2)}
        </span>
      </div>
      <div className="bg-emerald-500/10 rounded-lg p-3 text-sm text-emerald-600 dark:text-emerald-400">
        Driver payout for this job: <span className="font-bold">${pricing.driverPayout.toFixed(2)}</span>
      </div>
    </div>
  );
}