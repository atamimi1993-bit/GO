import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, CalendarClock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getCurrency } from '@/lib/pricing';
import { useToast } from '@/components/ui/use-toast';
import PaymentMethods from '@/components/go/PaymentMethods';

export default function InstallmentProgress({ move }) {
  const [paying, setPaying] = useState(false);
  const { toast } = useToast();

  const curr = getCurrency(move.currency || 'USD');
  const sym = curr.symbol;
  const fmt = (v) => sym + Number(v || 0).toFixed(curr.decimals);

  const totalInstallments = move.installments_total_count || 3;
  const paidCount = move.installments_paid || 0;
  const nextInstallment = paidCount + 1;
  const monthlyPayment = move.monthly_payment || move.installment_amount || 0;

  const handlePayInstallment = async () => {
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the editor preview.');
      return;
    }
    try {
      setPaying(true);
      const res = await base44.functions.invoke('create-move-checkout', {
        move_request_id: move.id,
        pay_installment: true,
      });
      window.location.href = res.data.url;
    } catch (err) {
      toast({ title: 'Payment error', description: err.message || 'Could not start checkout. Please try again.', variant: 'destructive' });
      setPaying(false);
    }
  };

  const progressPct = (paidCount / totalInstallments) * 100;

  return (
    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
        <CalendarClock size={16} /> Installment Plan — {paidCount} of {totalInstallments} paid
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {Array.from({ length: totalInstallments }).slice(0, Math.min(totalInstallments, 12)).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full ${i < paidCount ? 'bg-blue-500' : 'bg-muted'}`}
          />
        ))}
        {totalInstallments > 12 && (
          <span className="text-xs text-muted-foreground ml-1 self-center">+{totalInstallments - 12}</span>
        )}
      </div>

      {/* Plan details */}
      <div className="bg-card rounded-xl p-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Monthly Payment</span>
          <span className="font-medium">{fmt(monthlyPayment)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">APR</span>
          <span className="font-medium">{(move.interest_rate || 0).toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Term</span>
          <span className="font-medium">{move.installment_term_months || totalInstallments} months</span>
        </div>
        <div className="flex justify-between font-bold pt-1 border-t">
          <span>Remaining Balance</span>
          <span className="text-blue-600 dark:text-blue-400">{fmt(move.balance_due || 0)}</span>
        </div>
      </div>

      {/* Pay next installment button */}
      {!move.paid && move.balance_due > 0 && (
        <>
          <Button
            onClick={handlePayInstallment}
            disabled={paying}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {paying
              ? <><Loader2 size={16} className="animate-spin mr-1" /> Redirecting...</>
              : <><CreditCard size={16} className="mr-1" /> Pay Installment {nextInstallment} of {totalInstallments} — {fmt(monthlyPayment)}</>}
          </Button>
          <PaymentMethods />
        </>
      )}
    </div>
  );
}