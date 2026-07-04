import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2, Loader2, ShieldCheck, Clock, DollarSign } from 'lucide-react';
import { getCurrency } from '@/lib/pricing';

export default function PriceConfirmation({ move, onConfirmed }) {
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();

  const curr = getCurrency(move.currency || 'USD');
  const effectiveTotal = move.discounted_total || move.total_price;
  const customerConfirmed = move.customer_price_confirmed;
  const driverConfirmed = move.driver_rate_confirmed;

  const handleConfirm = async () => {
    setConfirming(true);
    // Optimistic: update local move state immediately, revert on error
    onConfirmed();
    const prevConfirmed = move.customer_price_confirmed;
    move.customer_price_confirmed = true;
    try {
      await base44.entities.MoveRequest.update(move.id, { customer_price_confirmed: true });
      toast({ title: 'Price approved!' });
    } catch (err) {
      move.customer_price_confirmed = prevConfirmed;
      onConfirmed();
      toast({ title: 'Could not confirm', description: err.message, variant: 'destructive' });
    }
    setConfirming(false);
  };

  return (
    <div className="bg-card border rounded-2xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="text-primary" size={18} />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm">Price Confirmation</h3>
          <p className="text-xs text-muted-foreground">Review and approve the final price</p>
        </div>
      </div>

      <div className="bg-muted rounded-xl p-4 space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Move Price</span>
          <span className="font-medium">{curr.symbol}{effectiveTotal?.toFixed(curr.decimals)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Driver Payout</span>
          <span className="font-medium">{curr.symbol}{move.driver_payout?.toFixed(curr.decimals)}</span>
        </div>
      </div>

      {/* Confirmation status badges */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Your approval</span>
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
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Driver's approval</span>
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
      </div>

      {!customerConfirmed && (
        <Button
          onClick={handleConfirm}
          disabled={confirming}
          className="w-full bg-emerald-500 hover:bg-emerald-600"
        >
          {confirming
            ? <><Loader2 size={16} className="animate-spin mr-1" /> Confirming...</>
            : <><DollarSign size={16} className="mr-1" /> Approve Final Price</>}
        </Button>
      )}

      {customerConfirmed && !driverConfirmed && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
          <Clock size={14} /> Waiting for the driver to confirm their payout rate.
        </div>
      )}

      {customerConfirmed && driverConfirmed && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 rounded-xl p-3">
          <CheckCircle2 size={14} /> Both parties have confirmed the pricing. The move can proceed!
        </div>
      )}
    </div>
  );
}