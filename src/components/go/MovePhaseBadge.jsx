import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { PackageCheck, Truck, CheckCircle2, Loader2 } from 'lucide-react';

// Compact 3-phase badge for move list cards.
// Uses move.status to derive the phase without extra API calls:
//   accepted → Loading, in_progress → In Transit, completed → Delivered
const STATUS_PHASES = {
  accepted: { phase: 0, label: 'Loading', icon: PackageCheck },
  in_progress: { phase: 1, label: 'In Transit', icon: Truck },
  completed: { phase: 2, label: 'Delivered', icon: CheckCircle2 },
};

export default function MovePhaseBadge({ move }) {
  const [latestPing, setLatestPing] = useState(null);

  // Subscribe to location pings for real-time phase updates on active moves
  useEffect(() => {
    if (!['accepted', 'in_progress', 'completed'].includes(move.status)) return;

    base44.entities.LocationPing.filter({ move_request_id: move.id }, '-created_date', 1)
      .then((pings) => setLatestPing(pings[0] || null))
      .catch(() => {});

    const unsub = base44.entities.LocationPing.subscribe((event) => {
      if (event.type === 'create' && event.data.move_request_id === move.id) {
        setLatestPing(event.data);
      }
    });
    return unsub;
  }, [move.id, move.status]);

  // Derive phase from ping milestone if available, otherwise from status
  let phase;
  if (latestPing?.milestone === 'delivered' || move.status === 'completed') {
    phase = STATUS_PHASES.completed;
  } else if (
    latestPing?.milestone === 'en_route_to_dropoff' ||
    latestPing?.milestone === 'arrived_at_dropoff' ||
    move.status === 'in_progress'
  ) {
    phase = STATUS_PHASES.in_progress;
  } else {
    phase = STATUS_PHASES.accepted;
  }

  if (!phase) return null;

  const Icon = phase.icon;
  const isDelivered = phase.phase === 2;

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        isDelivered
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
      }`}>
        {!isDelivered && <Loader2 size={11} className="animate-spin" />}
        {isDelivered && <Icon size={12} />}
        <span>{phase.label}</span>
      </div>
      {/* Mini progress dots */}
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i <= phase.phase ? 'bg-emerald-500' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}