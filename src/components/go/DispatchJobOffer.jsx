import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, MapPin, Package, DollarSign, Clock, Truck, Zap, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/pricing';

const DISPATCH_TIMEOUT = 60; // seconds

export default function DispatchJobOffer({ driverProfile, onResponded }) {
  const [pendingOffer, setPendingOffer] = useState(null);
  const [remaining, setRemaining] = useState(DISPATCH_TIMEOUT);
  const [responding, setResponding] = useState(false);
  const { toast } = useToast();

  const loadOffer = useCallback(async () => {
    if (!driverProfile?.id) return;
    try {
      // Find moves dispatched to this driver but not yet confirmed
      const moves = await base44.entities.MoveRequest.filter({
        assigned_driver_id: driverProfile.id,
        driver_rate_confirmed: false,
        status: 'accepted',
      }, '-created_date', 5).catch(() => []);

      if (moves && moves.length > 0) {
        const offer = moves[0];
        setPendingOffer(offer);
        // Calculate remaining time from dispatched_at
        if (offer.dispatched_at) {
          const elapsed = Math.floor((Date.now() - new Date(offer.dispatched_at).getTime()) / 1000);
          setRemaining(Math.max(0, DISPATCH_TIMEOUT - elapsed));
        } else {
          setRemaining(DISPATCH_TIMEOUT);
        }
      } else {
        setPendingOffer(null);
      }
    } catch {
      // silent
    }
  }, [driverProfile?.id]);

  useEffect(() => {
    loadOffer();
    const pollInterval = setInterval(loadOffer, 5000);
    return () => clearInterval(pollInterval);
  }, [loadOffer]);

  // Countdown timer
  useEffect(() => {
    if (!pendingOffer || remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pendingOffer, remaining]);

  // Auto-decline on timeout
  useEffect(() => {
    if (pendingOffer && remaining === 0 && !responding) {
      handleRespond('decline', true);
    }
  }, [remaining, pendingOffer, responding]);

  const handleRespond = async (response, isTimeout = false) => {
    if (!pendingOffer) return;
    setResponding(true);
    try {
      const res = await base44.functions.invoke('respond-to-dispatch', {
        move_request_id: pendingOffer.id,
        response,
      });

      if (response === 'accept') {
        toast({ title: 'Job accepted!', description: 'The move is now assigned to you.' });
      } else if (isTimeout) {
        toast({ title: 'Offer expired', description: 'The job has been offered to another driver.' });
      } else {
        toast({ title: 'Job declined', description: 'The job has been re-dispatched to another driver.' });
      }

      setPendingOffer(null);
      setRemaining(DISPATCH_TIMEOUT);
      if (onResponded) onResponded();
    } catch (err) {
      toast({ title: 'Failed to respond', description: err.message, variant: 'destructive' });
    }
    setResponding(false);
  };

  if (!pendingOffer) return null;

  const isExpired = remaining === 0;
  const progressPercent = (remaining / DISPATCH_TIMEOUT) * 100;
  const payout = pendingOffer.driver_payout || pendingOffer.driver_fee || 0;

  return (
    <div className="fixed inset-x-0 top-0 z-50 p-3 safe-top">
      <div className="max-w-md mx-auto bg-card border-2 border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Pulsing header bar */}
        <div className="bg-emerald-500 text-white px-4 py-2.5 flex items-center gap-2">
          <Zap size={18} className="shrink-0" />
          <span className="font-bold text-sm">New Job Dispatched!</span>
          {!isExpired && (
            <div className="ml-auto flex items-center gap-1.5">
              <Clock size={14} className="shrink-0" />
              <span className="font-mono font-bold text-lg tabular-nums">{remaining}s</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!isExpired && (
          <div className="h-1 bg-muted">
            <div
              className="h-full transition-all duration-1000 ease-linear"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: remaining <= 10 ? '#ef4444' : '#10b981',
              }}
            />
          </div>
        )}

        {/* Job details */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm font-medium truncate">{pendingOffer.pickup_address || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Drop-off</p>
              <p className="text-sm font-medium truncate">{pendingOffer.dropoff_address || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <Clock size={14} className="mx-auto text-muted-foreground mb-0.5" />
              <p className="text-xs font-medium truncate">{pendingOffer.move_time || 'TBD'}</p>
              <p className="text-[10px] text-muted-foreground">{pendingOffer.move_date ? new Date(pendingOffer.move_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <Truck size={14} className="mx-auto text-muted-foreground mb-0.5" />
              <p className="text-xs font-medium capitalize">{pendingOffer.truck_size_needed?.replace('_', ' ') || 'Any'}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{pendingOffer.job_type?.replace('_', ' ')}</p>
            </div>
            {payout > 0 && (
              <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                <DollarSign size={14} className="mx-auto text-emerald-600 dark:text-emerald-400 mb-0.5" />
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(payout, pendingOffer.currency)}</p>
                <p className="text-[10px] text-muted-foreground">payout</p>
              </div>
            )}
          </div>

          {pendingOffer.total_weight_lbs > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package size={12} /> {pendingOffer.total_weight_lbs.toLocaleString()} lbs
            </div>
          )}

          {/* Action buttons */}
          {driverProfile && !driverProfile.stripe_payouts_enabled && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Connect your bank in the Driver Hub to accept jobs and receive payouts.</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 min-h-[44px]"
              disabled={responding || isExpired || (driverProfile ? !driverProfile.stripe_payouts_enabled : false)}
              onClick={() => handleRespond('accept')}
            >
              {responding ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} className="mr-1" />}
              Accept Job
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px]"
              disabled={responding || isExpired}
              onClick={() => handleRespond('decline')}
            >
              {responding ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} className="mr-1" />}
              Decline
            </Button>
          </div>

          {isExpired && (
            <p className="text-center text-xs text-red-500 font-medium">Offer expired — re-dispatching to another driver...</p>
          )}
        </div>
      </div>
    </div>
  );
}