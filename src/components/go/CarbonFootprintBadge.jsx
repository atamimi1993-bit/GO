import React from 'react';
import { Leaf, TreePine, Car } from 'lucide-react';
import { calculateCarbonFootprint, formatCO2, getEcoLabel } from '@/lib/carbon';

export default function CarbonFootprintBadge({ distanceMiles, fuelType, mpg, distanceUnit, roundTripMiles, compact = false }) {
  const carbon = calculateCarbonFootprint({ distanceMiles, fuelType, mpg, distanceUnit, roundTripMiles });
  const eco = getEcoLabel(fuelType);

  const colorClasses = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
    slate: 'bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-400',
  };

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colorClasses[eco.color]}`}>
        <Leaf size={12} />
        {formatCO2(carbon.co2Kg)}
      </span>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 ${colorClasses[eco.color]}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center shrink-0">
          <Leaf size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-display font-bold text-sm">Carbon Footprint</h4>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-background/50">
              {eco.label}
            </span>
          </div>
          <p className="text-lg font-display font-black">
            {formatCO2(carbon.co2Kg)}
          </p>
          {carbon.co2Kg > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs opacity-90">
              <span className="flex items-center gap-1">
                <Car size={12} /> ≈ {carbon.equivalenceMiles} mi in an avg car
              </span>
              <span className="flex items-center gap-1">
                <TreePine size={12} /> {carbon.treesToOffset} trees to offset
              </span>
            </div>
          ) : (
            <p className="text-xs mt-1 opacity-90">
              This move uses an electric vehicle — zero tailpipe emissions! 🌍
            </p>
          )}
        </div>
      </div>
    </div>
  );
}