import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, MapPin, Clock, Truck, DollarSign, Zap, Crown, Route } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/pricing';

const DISPATCH_TIMEOUT = 60;

export default function BatchRouteOffer({ driverProfile, onResponded }) {
  const [pendingOffer, setPendingOffer] = useState(null);
  const [batchJobs, setBatchJobs] = useState([]);
  const [remaining, setRemaining] = useState(DISPATCH_TIMEOUT);
  const [responding, setResponding] = useState(false);
  const { toast } = useToast();

  const loadOffer = useCallback(async () => {
    if (!driverProfile?.id) return;
    try {
      const moves = await base44.entities.MoveRequest.filter({
        assigned_driver_id: driverProfile.id,
        driver_rate_confirmed: false,
        status: 'accepted',
        batch_id: { $exists: true },
      }, '-created_date', 10).catch(() => []);

      if (moves && moves.length > 0) {
        const firstMove = moves[0];
        setPendingOffer(firstMove);
        setBatchJobs(moves.sort((a, b) => (a.batch_stop_order || 0) - (b.batch_stop_order || 0)));
        if (firstMove.dispatched_at) {
          const elapsed = Math.floor((Date.now() - new Date(firstMove.dispatched_at).getTime()) / 1000);
          setRemaining(Math.max(0, DISPATCH_TIMEOUT - elapsed));
        } else {
          setRemaining(DISPATCH_TIMEOUT);
        }
      } else {
        setPendingOffer(null);
        setBatchJobs([]);
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

  useEffect(() => {
    if (pendingOffer && remaining === 0 && !responding) {
      handleRespond('decline', true);
    }
  }, [remaining, pendingOffer, responding]);

  const handleRespond = async (response, isTimeout = false) => {
    if (!pendingOffer) return;
    setResponding(true);
    try {
      await base44.functions.invoke('respond-to-dispatch', {
        move_request_id: pendingOffer.id,
        response,
      });

      if (response === 'accept') {
        toast({ title: '2-stop route accepted!', description: `${batchJobs.length} jobs assigned to you.` });
      } else if (isTimeout) {
        toast({ title: 'Route offer expired', description: 'Jobs have been re-dispatched.' });
      } else {
        toast({ title: 'Route declined', description: 'Jobs have been re-dispatched individually.' });
      }

      setPendingOffer(null);
      setBatchJobs([]);
      setRemaining(DISPATCH_TIMEOUT);
      if (onResponded) onResponded();
    } catch (err) {
      toast({ title: 'Failed to respond', description: err.message, variant: 'destructive' });
    }
    setResponding(false);
  };

  if (!pendingOffer || batchJobs.length === 0) return null;

  const isExpired = remaining === 0;
  const progressPercent = (remaining / DISPATCH_TIMEOUT) * 100;
  const totalPayout = batchJobs.reduce((sum, j) => sum + (j.driver_payout || 0), 0);
  const batchBonus = 15;

  return (
    <div className="fixed inset-x-0 top-0 z-50 p-3 safe-top" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}>
      <div role="dialog" aria-modal="true" aria-label="2-Stop Route Dispatched" className="max-w-md mx-auto bg-card border-2 border-violet-500/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-violet-600 text-white px-4 py-2.5 flex items-center gap-2">
          <Route size={18} className="shrink-0" />
          <span className="font-bold text-sm">2-Stop Route Dispatched!</span>
          <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-300 text-violet-950">
            Batch
          </span>
          {!isExpired && (
            <div className="ml-auto flex items-center gap-1.5">
              <Clock size={14} className="shrink-0" />
              <span aria-live="assertive" aria-atomic="true" className="font-mono font-bold text-lg tabular-nums">{remaining}s</span>
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
                backgroundColor: remaining <= 10 ? '#ef4444' : '#7c3aed',
              }}
            />
          </div>
        )}

        {/* Stops */}
        <div className="p-4 space-y-3">
          {batchJobs.map((job, idx) => (
            <div key={job.id} className="space-y-2">
              {idx > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground pl-1">
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                  <span className="px-2">travel</span>
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                </div>
              )}
              <div className={`rounded-xl p-3 ${idx === 0 ? 'bg-violet-500/5' : 'bg-emerald-500/5'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    idx === 0 ? 'bg-violet-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-sm">
                    {job.move_date ? new Date(job.move_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''} at {job.move_time || 'TBD'}
                  </span>
                  {job.customer_tier === 'premier' && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-300 text-amber-950">
                      <Crown size={8} strokeWidth={2.5} /> Premier
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-2 mb-1">
                  <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Pickup</p>
                    <p className="text-xs font-medium truncate">{job.pickup_address || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 mb-1">
                  <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Drop-off</p>
                    <p className="text-xs font-medium truncate">{job.dropoff_address || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs mt-1">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Truck size={12} /> {job.truck_size_needed?.replace('_', ' ') || 'Any'}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <DollarSign size={12} /> {formatCurrency(job.driver_payout || 0, job.currency)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Total payout + bonus */}
          <div className="flex items-center justify-between bg-violet-500/10 rounded-xl p-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Payout</p>
              <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{formatCurrency(totalPayout, pendingOffer.currency)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Batch Bonus</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(batchBonus, pendingOffer.currency)}</p>
            </div>
          </div>

          {/* Actions */}
          {driverProfile && !driverProfile.stripe_payouts_enabled && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Zap size={14} className="shrink-0" />
              <span>Connect your bank in the Driver Hub to accept jobs.</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1 bg-violet-600 hover:bg-violet-700 min-h-[44px]"
              disabled={responding || isExpired || (driverProfile ? !driverProfile.stripe_payouts_enabled : false)}
              onClick={() => handleRespond('accept')}
            >
              {responding ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} className="mr-1" />}
              Accept Route
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
            <p className="text-center text-xs text-red-500 font-medium">Offer expired — re-dispatching individually...</p>
          )}
        </div>
      </div>
    </div>
  );
}