import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function CancelMoveButton({ move, onCancelled, onError }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fee only applies after a driver has accepted; before that, cancellation is free
  const requiresFee = ['accepted', 'in_progress'].includes(move.status);
  const fee = requiresFee ? (move.cancellation_fee || 250) : 0;

  const handleCancel = async () => {
    // If no fee required (pending/quoted), just mark cancelled directly
    if (!requiresFee) {
      setLoading(true);
      const prevStatus = move.status;
      // Optimistically notify parent before the API call
      onCancelled?.(prevStatus);
      try {
        await base44.entities.MoveRequest.update(move.id, { status: 'cancelled' });
        if (move.assigned_driver_id) {
          try {
            await base44.functions.invoke('notify-driver-cancellation', { move_request_id: move.id });
          } catch {}
        }
        toast({ title: 'Move cancelled', description: 'Your move has been cancelled.' });
        setOpen(false);
      } catch {
        // Revert the optimistic update via dedicated onError callback
        onError?.();
        toast({ title: 'Could not cancel', description: 'Please try again.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Fee required — redirect to Stripe checkout
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the editor preview.');
      return;
    }
    try {
      setLoading(true);
      const res = await base44.functions.invoke('create-cancellation-checkout', {
        move_request_id: move.id,
      });
      window.location.href = res.data.url;
    } catch {
      toast({ title: 'Could not start checkout', description: 'Please try again.', variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full text-red-600 border-red-300 hover:bg-red-500/5 dark:text-red-400 dark:border-red-900"
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        <AlertTriangle size={16} className="mr-1" /> Cancel Move
      </Button>

      <AlertDialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this move?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {requiresFee
                    ? `Since a driver has already accepted this move, a $${fee} cancellation fee applies. You'll be redirected to Stripe to complete the payment, and the move will be cancelled once the fee is paid.`
                    : 'This move has not yet been assigned to a driver, so cancellation is free. The move will be cancelled immediately.'}
                </p>
                <p className="text-xs">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Keep Move</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCancel(); }}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading
                ? <><Loader2 size={14} className="mr-1 animate-spin" /> Processing...</>
                : requiresFee
                  ? `Cancel & Pay $${fee}`
                  : 'Confirm Cancellation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}