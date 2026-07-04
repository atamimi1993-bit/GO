import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2, Loader2, Clock, DollarSign, Truck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getCurrency } from '@/lib/pricing';

export default function DriverRateConfirmation({ move, onConfirmed }) {
  const [confirming, setConfirming] = useState(false);
  const [localDriverConfirmed, setLocalDriverConfirmed] = useState(move.driver_rate_confirmed);
  const { toast } = useToast();

  const curr = getCurrency(move.currency || 'USD');
  const driverConfirmed = localDriverConfirmed;
  const customerConfirmed = move.customer_price_confirmed;
  const bothConfirmed = driverConfirmed && customerConfirmed;

  const handleConfirm = async () => {
    setConfirming(true);
    // Optimistic: update local state, revert on error
    setLocalDriverConfirmed(true);
    try {
      await base44.entities.MoveRequest.update(move.id, { driver_rate_confirmed: true });
      toast({ title: 'Rate confirmed!' });
      onConfirmed();
    } catch (err) {
      setLocalDriverConfirmed(false);
      toast({ title: 'Could not confirm', description: err.message, variant: 'destructive' });
    }
    setConfirming(false);
  };

  return (
    <div className="bg-card border rounded-2xl overflow-hidden mb-6">
      <div className="px-5 py-3 bg-muted border-b font-medium text-sm flex items-center gap-2">
        <Truck size={16} className="text-primary" /> Accepted Job — Rate Confirmation
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-sm font-medium truncate">{move.pickup_address}</p>
          <p className="text-xs text-muted-foreground truncate">→ {move.dropoff_address}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(parseISO(move.move_date), 'MMM d, yyyy')}{move.move_time && ` at ${move.move_time}`}
          </p>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">Your Payout</p>
              <p className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">
                {curr.symbol}{move.driver_payout?.toFixed(curr.decimals)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Customer Total</p>
              <p className="text-sm font-medium">{curr.symbol}{(move.discounted_total || move.total_price)?.toFixed(curr.decimals)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Your approval</span>
            {driverConfirmed ? (
              <Badge className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} className="mr-1" /> Confirmed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <Clock size={12} className="mr-1" /> Pending
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Customer's approval</span>
            {customerConfirmed ? (
              <Badge className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} className="mr-1" /> Approved
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <Clock size={12} className="mr-1" /> Pending
              </Badge>
            )}
          </div>
        </div>

        {!driverConfirmed && (
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full bg-emerald-500 hover:bg-emerald-600"
          >
            {confirming
              ? <><Loader2 size={16} className="animate-spin mr-1" /> Confirming...</>
              : <><DollarSign size={16} className="mr-1" /> Accept Payout Rate</>}
          </Button>
        )}

        {driverConfirmed && !customerConfirmed && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
            <Clock size={14} /> Waiting for the customer to approve the final price.
          </div>
        )}

        {bothConfirmed && !move.paid && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/5 rounded-xl p-3">
            <Clock size={14} /> Waiting for customer payment before you can start tracking.
          </div>
        )}

        {bothConfirmed && move.paid && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 rounded-xl p-3">
            <CheckCircle2 size={14} /> Both parties confirmed and payment received. You can start tracking below!
          </div>
        )}
      </div>
    </div>
  );
}