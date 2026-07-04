import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { calculateMovePrice, recommendTruckSize, formatCurrency, getCurrency, TRUCK_SIZE_LABELS } from '@/lib/pricing';

export default function OfficePriceStep({ move, items, totalWeight, bulkyCount, pickupSteps, pickupDistance, saving, onBack, onFinalize }) {
  const curr = getCurrency(move.currency || 'USD');
  const truckSize = recommendTruckSize(totalWeight);
  const pricing = calculateMovePrice({
    totalWeightLbs: totalWeight,
    distanceMiles: Number(move.distance_miles),
    truckSize,
    stateCode: move.pickup_state,
    countryCode: move.country_code,
    currency: move.currency,
    distanceUnit: move.distance_unit,
    jobType: move.job_type,
    tolls: Number(move.tolls) || 0,
    bulkyItemCount: bulkyCount,
    materialsFee: Number(move.materials_fee) || 0,
    pickupSteps,
    dropoffSteps: move.dropoff_steps || 0,
    pickupDistanceFromStreet: pickupDistance,
    dropoffDistanceFromStreet: move.dropoff_distance_from_street || 0,
  });

  const originalPrice = move.total_price || 0;
  const priceDiff = pricing.totalPrice - originalPrice;

  const lines = [
    { label: `Base cost (${TRUCK_SIZE_LABELS[truckSize]?.split('(')[0]?.trim() || truckSize})`, value: pricing.baseCost },
    { label: 'Fuel', value: pricing.fuelCost },
    ...(pricing.tolls ? [{ label: 'Tolls', value: pricing.tolls }] : []),
    ...(pricing.bulkyItemFee ? [{ label: `Bulky items (${bulkyCount})`, value: pricing.bulkyItemFee }] : []),
    ...(pricing.materialsFee ? [{ label: 'Packing materials', value: pricing.materialsFee }] : []),
    ...(pricing.carryingFee ? [{ label: 'Carrying (steps + distance)', value: pricing.carryingFee }] : []),
    { label: `Tax (${(pricing.taxRate * 100).toFixed(2)}%)`, value: pricing.taxAmount },
    { label: 'GO fee (25%)', value: pricing.appFee },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1 flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Finalize Office Price</p>
        <p className="text-xs text-muted-foreground">Price recalculated based on verified items and on-site access. This becomes the final customer price.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted rounded-lg p-2">
          <p className="text-xs text-muted-foreground">Items</p>
          <p className="text-sm font-bold">{items.length}</p>
        </div>
        <div className="bg-muted rounded-lg p-2">
          <p className="text-xs text-muted-foreground">Weight</p>
          <p className="text-sm font-bold">{totalWeight.toLocaleString()} lbs</p>
        </div>
        <div className="bg-muted rounded-lg p-2">
          <p className="text-xs text-muted-foreground">Truck</p>
          <p className="text-sm font-bold capitalize">{truckSize.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="border rounded-xl p-4 space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{line.label}</span>
            <span className="font-medium">{formatCurrency(line.value, move.currency)}</span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between">
          <span className="font-display font-bold">Final Total</span>
          <span className="font-display font-black text-xl text-emerald-600 dark:text-emerald-400">{formatCurrency(pricing.totalPrice, move.currency)}</span>
        </div>
      </div>

      {/* Price comparison */}
      {priceDiff !== 0 && originalPrice > 0 && (
        <div className={`rounded-xl p-3 text-sm ${priceDiff > 0 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}`}>
          {priceDiff > 0
            ? `Original quote was ${formatCurrency(originalPrice, move.currency)}. Adjusted price is ${formatCurrency(Math.abs(priceDiff), move.currency)} higher due to on-site findings.`
            : `Original quote was ${formatCurrency(originalPrice, move.currency)}. Adjusted price is ${formatCurrency(Math.abs(priceDiff), move.currency)} lower based on actual items.`}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="outline" onClick={onBack}><ArrowLeft size={16} className="mr-1" /> Back</Button>
        <Button onClick={onFinalize} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
          {saving ? <><Loader2 size={16} className="mr-1 animate-spin" /> Finalizing...</> : <><CheckCircle2 size={16} className="mr-1" /> Finalize Office Price</>}
        </Button>
      </div>
    </div>
  );
}