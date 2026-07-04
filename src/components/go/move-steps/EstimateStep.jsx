import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Package, Truck, Star, Check, ScanSearch } from 'lucide-react';
import { calculateMovePrice, recommendTruckSize, formatCurrency, TRUCK_SIZE_LABELS } from '@/lib/pricing';

const SERVICE_TIERS = [
  { key: 'self_service', name: 'Self-Service', multiplier: 0.85, icon: Package, description: 'You load and unload. Driver transports only.' },
  { key: 'standard', name: 'Standard', multiplier: 1.0, icon: Truck, description: 'Driver assists with loading and unloading.', recommended: true },
  { key: 'full_service', name: 'Full-Service', multiplier: 1.25, icon: Star, description: 'Driver packs, loads, transports, and unpacks everything.' },
];

const round2 = (v) => Math.round(v * 100) / 100;

export default function EstimateStep({ form, totalWeight, selectedTier, onSelectTier, onConfirm, mediaAnalysis }) {
  const truckSize = recommendTruckSize(totalWeight);

  const tierPricing = useMemo(() => {
    const base = calculateMovePrice({
      totalWeightLbs: totalWeight,
      distanceMiles: Number(form.distance_miles),
      truckSize,
      stateCode: form.pickup_state,
      countryCode: form.country_code,
      currency: form.currency,
      distanceUnit: form.distance_unit,
      jobType: form.job_type,
      tolls: Number(form.tolls) || 0,
    });

    const diffMult = mediaAnalysis?.difficulty_multiplier || 1;

    return SERVICE_TIERS.map(tier => {
      const m = tier.multiplier * diffMult;
      const adjustedPricing = {
        ...base,
        baseCost: round2(base.baseCost * m),
        fuelCost: round2(base.fuelCost * m),
        taxAmount: round2(base.taxAmount * m),
        appFee: round2(base.appFee * m),
        driverPayout: round2(base.driverPayout * m),
        totalPrice: round2(base.totalPrice * m),
      };
      return { ...tier, pricing: adjustedPricing, truckSize };
    });
  }, [totalWeight, form.distance_miles, form.pickup_state, form.country_code,
      form.currency, form.distance_unit, form.job_type, form.tolls, truckSize, mediaAnalysis]);

  const selected = tierPricing?.find(t => t.key === selectedTier);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Choose Your Service</h2>
        <p className="text-muted-foreground text-sm">Select the service level that works best for you.</p>
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-3">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Distance</span><span className="font-medium">{form.distance_miles} {form.distance_unit}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Weight</span><span className="font-medium">{totalWeight.toLocaleString()} lbs</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Recommended Truck</span><span className="font-medium">{TRUCK_SIZE_LABELS[truckSize]?.split('(')[0]?.trim()}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Service Type</span><span className="font-medium">{form.needs_storage ? 'Storage Needed' : 'Straight Delivery'}</span></div>
      </div>

      {mediaAnalysis && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <ScanSearch size={16} /> Media Analysis Applied
          </div>
          <p className="text-xs text-muted-foreground select-text">{mediaAnalysis.summary}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
              {mediaAnalysis.difficulty_multiplier >= 1 ? '+' : ''}{Math.round((mediaAnalysis.difficulty_multiplier - 1) * 100)}% complexity
            </span>
            {mediaAnalysis.specialty_items?.length > 0 && (
              <span className="text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                {mediaAnalysis.specialty_items.length} specialty item{mediaAnalysis.specialty_items.length > 1 ? 's' : ''}
              </span>
            )}
            {mediaAnalysis.fragile_items_count > 0 && (
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                {mediaAnalysis.fragile_items_count} fragile
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tierPricing.map(tier => {
          const Icon = tier.icon;
          const isSelected = selectedTier === tier.key;
          return (
            <button
              type="button"
              key={tier.key}
              onClick={() => onSelectTier(tier.key)}
              className={`cursor-pointer border-2 rounded-2xl p-5 transition-all text-left w-full ${
                isSelected ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-emerald-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl p-2 ${isSelected ? 'bg-emerald-500 text-white' : 'bg-muted'}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold">{tier.name}</h3>
                      {tier.recommended && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-display font-black text-emerald-600">
                    {formatCurrency(tier.pricing.totalPrice, form.currency)}
                  </p>
                  {isSelected && <Check size={16} className="text-emerald-500 ml-auto mt-1" />}
                </div>
                </div>
                </button>
                );
                })}
                </div>

      {selected && (
        <Button onClick={() => onConfirm(selected.pricing, selected.key, selected.truckSize)} size="lg" className="w-full bg-emerald-500 hover:bg-emerald-600">
          Continue to Agreement <Check size={16} className="ml-2" />
        </Button>
      )}
    </div>
  );
}