import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Truck } from 'lucide-react';
import { TRUCK_SIZE_LABELS } from '@/lib/pricing';

export default function AssignedDriverCard({ move }) {
  const [trucks, setTrucks] = useState([]);

  useEffect(() => {
    if (!move.assigned_driver_id) return;
    base44.entities.Truck.filter({ driver_profile_id: move.assigned_driver_id })
      .then(setTrucks)
      .catch(() => {});
  }, [move.assigned_driver_id]);

  const truck = trucks.find(t => t.size_category === move.truck_size_needed) || trucks[0];

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-4">
      <h3 className="font-display font-bold text-sm mb-2 text-emerald-800 dark:text-emerald-200">Assigned Driver</h3>
      <p className="font-medium">{move.assigned_driver_name}</p>
      {truck && (
        <div className="flex items-center gap-2 mt-2 text-sm text-emerald-700 dark:text-emerald-300">
          <Truck size={16} />
          <span>
            {truck.year ? `${truck.year} ` : ''}{truck.make} {truck.model}
            {truck.size_category && <span className="text-emerald-600/70 dark:text-emerald-400/70"> · {TRUCK_SIZE_LABELS[truck.size_category] || truck.size_category}</span>}
          </span>
        </div>
      )}
    </div>
  );
}