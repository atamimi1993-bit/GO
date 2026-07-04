import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Navigation, MapPin, PackageCheck, Truck, CheckCircle2, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const MILESTONES = [
  { key: 'en_route_to_pickup', label: 'En route', icon: Navigation },
  { key: 'arrived_at_pickup', label: 'At pickup', icon: MapPin },
  { key: 'items_loaded', label: 'Loaded', icon: PackageCheck },
  { key: 'en_route_to_dropoff', label: 'En route', icon: Truck },
  { key: 'arrived_at_dropoff', label: 'Arrived', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

export default function TrackingCard({ move }) {
  const [pings, setPings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.LocationPing.filter({ move_request_id: move.id }, '-created_date', 50)
      .then(setPings)
      .finally(() => setLoading(false));

    const unsub = base44.entities.LocationPing.subscribe((event) => {
      if (event.type === 'create' && event.data.move_request_id === move.id) {
        setPings((prev) => [event.data, ...prev].slice(0, 50));
      }
    });
    return unsub;
  }, [move.id]);

  const latestPing = pings[0];
  const reachedMilestones = new Set(pings.map((p) => p.milestone));
  const currentStep = MILESTONES.findIndex((m) => !reachedMilestones.has(m.key));
  const activeStep = currentStep === -1 ? MILESTONES.length : currentStep;

  return (
    <Link
      to={`/move/${move.id}`}
      className="block bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow select-none"
      aria-label={`Track move from ${move.pickup_address} to ${move.dropoff_address}, status ${move.status}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-bold text-sm">
              {format(new Date(move.move_date), 'MMM d, yyyy')}
            </span>
            {move.move_time && (
              <span className="text-xs text-muted-foreground">{move.move_time}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {move.assigned_driver_name ? `Driver: ${move.assigned_driver_name}` : 'Awaiting driver assignment'}
          </p>
        </div>
        <ChevronRight size={18} className="text-muted-foreground shrink-0" aria-hidden="true" />
      </div>

      {/* Addresses */}
      <div className="space-y-1 text-sm mb-4">
        <p className="flex items-center gap-2">
          <MapPin size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />
          <span className="truncate">{move.pickup_address}</span>
        </p>
        <p className="flex items-center gap-2">
          <MapPin size={14} className="text-red-400 shrink-0" aria-hidden="true" />
          <span className="truncate">{move.dropoff_address}</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {MILESTONES.map((m, i) => {
          const reached = reachedMilestones.has(m.key);
          const isActive = i === activeStep && move.status !== 'completed';
          return (
            <React.Fragment key={m.key}>
              <div
                className={`flex flex-col items-center gap-1 flex-1 ${reached || isActive ? '' : 'opacity-30'}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    reached
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <m.icon size={13} aria-hidden="true" />
                </div>
              </div>
              {i < MILESTONES.length - 1 && (
                <div className={`h-0.5 flex-1 ${reached ? 'bg-emerald-500' : 'bg-border'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Latest update */}
      <div className="mt-3 flex items-center justify-between text-xs">
        {loading ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading tracking...
          </span>
        ) : latestPing ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock size={12} />
            Updated {format(new Date(latestPing.created_date), 'MMM d, h:mm a')}
          </span>
        ) : (
          <span className="text-muted-foreground">No location updates yet</span>
        )}
        <Badge className={move.status === 'in_progress' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'}>
          {move.status?.replace('_', ' ')}
        </Badge>
      </div>
    </Link>
  );
}