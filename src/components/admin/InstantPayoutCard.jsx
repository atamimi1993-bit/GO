import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Wallet, Loader2, Zap, RefreshCw, AlertCircle } from 'lucide-react';

const fmt = (cents, currency) => {
  const value = (cents || 0) / 100;
  const symbol = currency?.toUpperCase() === 'USD' ? '$' : '';
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function InstantPayoutCard() {
  const { toast } = useToast();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('create-instant-payout', { action: 'check' });
      setBalance(res.data);
    } catch (err) {
      toast({ title: 'Failed to load balance', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePayout = async () => {
    setPaying(true);
    try {
      const res = await base44.functions.invoke('create-instant-payout', { action: 'payout' });
      toast({
        title: 'Payout initiated',
        description: `${fmt(res.data.amount, res.data.currency)} is on its way to your bank account.`,
      });
      await load();
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      toast({ title: 'Payout failed', description: msg, variant: 'destructive' });
    } finally {
      setPaying(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-emerald-600" />
          <h2 className="font-display font-bold text-lg">Instant Payout</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading} aria-label="Refresh balance">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : balance ? (
        <>
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
            <p className="text-3xl font-display font-bold text-emerald-600 dark:text-emerald-400">
              {fmt(balance.available_amount, balance.available_currency)}
            </p>
            {balance.pending_amount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {fmt(balance.pending_amount, balance.available_currency)} pending settlement
              </p>
            )}
          </div>

          <Button
            className="w-full"
            disabled={!balance.can_payout || paying}
            onClick={() => setConfirmOpen(true)}
          >
            <Zap size={16} />
            {balance.can_payout ? 'Pay Out Now' : 'No Available Balance'}
          </Button>

          {balance.can_payout && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Funds are deposited instantly to your linked bank account.
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <AlertCircle size={16} />
          Unable to load balance.
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Instant Payout</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately transfer your full available balance ({balance ? fmt(balance.available_amount, balance.available_currency) : '...'}) to your linked bank account via instant payout.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handlePayout(); }}
              disabled={paying}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {paying ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {paying ? 'Processing...' : 'Confirm Payout'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}