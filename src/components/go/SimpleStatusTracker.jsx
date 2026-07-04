import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { PackageCheck, Truck, CheckCircle2, Loader2, Clock, Navigation } from 'lucide-react';
import { format } from 'date-fns';

// Simplified 3-phase tracking view for customers.
// Distills the 6 driver milestones into easy-to-understand phases:
//   Loading → In Transit → Delivered
const PHASES = [
  {
    key: 'loading',
    label: 'Loading',
    icon: PackageCheck,
    desc: 'Driver is at pickup and loading your items',
    milestones: ['en_route_to_pickup', 'arrived_at_pickup', 'items_loaded'],
  },
  {
    key: 'in_transit',
    label: 'In Transit',
    icon: Truck,
    desc: 'Your items are on the move',
    milestones: ['en_route_to_dropoff', 'arrived_at_dropoff'],
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: CheckCircle2,
    desc: 'Items have been delivered',
    milestones: ['delivered'],
  },
];

export default function SimpleStatusTracker({ move }) {
  const [pings, setPings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const prevPhaseRef = useRef(null);

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

  const computePhase = (reachedMilestones, moveStatus) => {
    if (reachedMilestones.has('delivered') || moveStatus === 'completed') return 2;
    if (reachedMilestones.has('en_route_to_dropoff') || reachedMilestones.has('arrived_at_dropoff')) return 1;
    return 0;
  };

  // Fire toast + app notification when phase changes
  useEffect(() => {
    if (loading || pings.length === 0) return;
    const reachedMilestones = new Set(pings.map((p) => p.milestone));
    const currentPhase = computePhase(reachedMilestones, move.status);

    if (prevPhaseRef.current !== null && prevPhaseRef.current !== currentPhase) {
      const phaseLabel = PHASES[currentPhase].label;
      toast({
        title: `Status: ${phaseLabel}`,
        description: PHASES[currentPhase].desc,
      });
      // Persist notification for the customer
      if (move.customer_email) {
        base44.entities.AppNotification.create({
          user_email: move.customer_email,
          title: `Your move is now: ${phaseLabel}`,
          body: PHASES[currentPhase].desc,
          type: 'job',
          link: `/move/${move.id}`,
          icon: 'truck',
        }).catch(() => {});
      }
    }
    prevPhaseRef.current = currentPhase;
  }, [pings, loading, move.status, move.id, move.customer_email, toast]);

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-4 flex justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  const reachedMilestones = new Set(pings.map((p) => p.milestone));
  const latestPing = pings[0];

  // If move is completed, force delivered phase
  const currentPhaseIdx = move.status === 'completed' ? 2 : computePhase(reachedMilestones, move.status);

  const currentPhase = PHASES[currentPhaseIdx];
  const PhaseIcon = currentPhase.icon;
  const isDelivered = currentPhaseIdx === 2;

  return (
    <div className="bg-card border rounded-2xl p-5 mb-4">
      {/* Current status header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
          isDelivered
            ? 'bg-emerald-500'
            : 'bg-emerald-100 dark:bg-emerald-900 ring-2 ring-emerald-500'
        }`}>
          {isDelivered
            ? <PhaseIcon size={24} className="text-white" />
            : <Loader2 size={20} className="text-emerald-600 dark:text-emerald-400 animate-spin" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Status</p>
          <h2 className="font-display font-bold text-xl text-emerald-600 dark:text-emerald-400">
            {currentPhase.label}
          </h2>
          <p className="text-xs text-muted-foreground">{currentPhase.desc}</p>
        </div>
        {latestPing && (
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
              <Clock size={10} />
              {format(new Date(latestPing.created_date), 'h:mm a')}
            </p>
          </div>
        )}
      </div>

      {/* Phase progress bar */}
      <div className="flex items-center gap-2">
        {PHASES.map((phase, i) => {
          const isReached = i <= currentPhaseIdx;
          const isActive = i === currentPhaseIdx;
          const Icon = phase.icon;
          return (
            <React.Fragment key={phase.key}>
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isReached
                      ? isDelivered && i === 2
                        ? 'bg-emerald-500 text-white'
                        : isActive
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <span className={`text-xs font-medium ${isReached ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {phase.label}
                </span>
              </div>
              {i < PHASES.length - 1 && (
                <div className={`h-1 flex-1 rounded-full ${i < currentPhaseIdx ? 'bg-emerald-500' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Latest update line */}
      {latestPing && !isDelivered && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
          <Navigation size={12} className="text-emerald-500 shrink-0" />
          <span>
            {currentPhaseIdx === 0 && latestPing.milestone === 'en_route_to_pickup' && 'Driver is heading to your pickup location'}
            {currentPhaseIdx === 0 && latestPing.milestone === 'arrived_at_pickup' && 'Driver has arrived at pickup'}
            {currentPhaseIdx === 0 && latestPing.milestone === 'items_loaded' && 'All items have been loaded'}
            {currentPhaseIdx === 1 && latestPing.milestone === 'en_route_to_dropoff' && 'Driver is on the way to your drop-off'}
            {currentPhaseIdx === 1 && latestPing.milestone === 'arrived_at_dropoff' && 'Driver has arrived at drop-off'}
          </span>
        </div>
      )}
    </div>
  );
}