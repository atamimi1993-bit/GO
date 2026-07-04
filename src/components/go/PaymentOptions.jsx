import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, Wallet, Zap, CalendarClock, TrendingUp, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { calculateInstallmentPlan, getInstallmentAPR, CREDIT_TIERS, INSTALLMENT_TERM_OPTIONS, formatCurrency, getCurrency } from '@/lib/pricing';
import { useToast } from '@/components/ui/use-toast';
import PromoCodeInput from '@/components/go/PromoCodeInput';
import PaymentMethods from '@/components/go/PaymentMethods';

const round2 = (v) => Math.round(v * 100) / 100;

export default function PaymentOptions({ move, onPaid, onPromoApplied }) {
  const [selectedOption, setSelectedOption] = useState(move.payment_option && move.payment_option !== 'split_50_50' ? move.payment_option : 'split_50_50');
  const [creditTier, setCreditTier] = useState(move.credit_tier || 'good');
  const [termMonths, setTermMonths] = useState(move.installment_term_months || 12);
  const [paying, setPaying] = useState(false);
  const [promoData, setPromoData] = useState(null);
  const { toast } = useToast();

  const curr = getCurrency(move.currency || 'USD');
  const sym = curr.symbol;
  const fmt = (v) => sym + Number(v || 0).toFixed(curr.decimals);

  const baseTotal = promoData?.discounted_total || move.discounted_total || move.total_price || 0;

  const installmentPlan = useMemo(() => {
    if (selectedOption !== 'installment_plan') return null;
    return calculateInstallmentPlan(baseTotal, termMonths, creditTier);
  }, [selectedOption, baseTotal, termMonths, creditTier]);

  const handlePay = async () => {
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the editor preview.');
      return;
    }
    try {
      setPaying(true);
      const payload = {
        move_request_id: move.id,
        promo_code: promoData?.promo?.code || undefined,
        payment_option: selectedOption,
      };
      if (selectedOption === 'installment_plan') {
        payload.credit_tier = creditTier;
        payload.installment_term_months = termMonths;
      }
      const res = await base44.functions.invoke('create-move-checkout', payload);
      window.location.href = res.data.url;
    } catch (err) {
      toast({ title: 'Payment error', description: err.message || 'Could not start checkout. Please try again.', variant: 'destructive' });
      setPaying(false);
    }
  };

  const halfAmount = round2(baseTotal / 2);

  const OPTIONS = [
    {
      key: 'full',
      label: 'Pay in Full',
      icon: Zap,
      description: 'Pay the entire amount now',
      amount: baseTotal,
      amountLabel: fmt(baseTotal),
    },
    {
      key: 'split_50_50',
      label: '50/50 Split',
      icon: Wallet,
      description: 'Half at pickup, half at delivery',
      amount: halfAmount,
      amountLabel: `${fmt(halfAmount)} now`,
    },
    {
      key: 'installment_plan',
      label: 'Monthly Plan',
      icon: CalendarClock,
      description: '3-48 months with credit-based rates',
      amount: installmentPlan?.monthlyPayment || 0,
      amountLabel: installmentPlan ? `${fmt(installmentPlan.monthlyPayment)}/mo` : 'From ' + fmt(calculateInstallmentPlan(baseTotal, 48, 'excellent').monthlyPayment) + '/mo',
    },
  ];

  const handlePromoApplied = (data) => {
    setPromoData(data);
    if (onPromoApplied) onPromoApplied(data);
  };

  return (
    <div className="space-y-3">
      <PromoCodeInput move={move} onApplied={handlePromoApplied} />

      {promoData && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Original Total</span>
            <span className="line-through text-muted-foreground">{fmt(promoData.original_total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">Discount ({promoData.promo.discount_percent}%)</span>
            <span className="text-emerald-600 dark:text-emerald-400">−{fmt(promoData.discount_amount)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-emerald-500/20">
            <span>New Total</span>
            <span className="text-emerald-600 dark:text-emerald-400">{fmt(promoData.discounted_total)}</span>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-display font-bold text-sm mb-2">Choose Payment Option</h3>
        <div className="space-y-2">
          {OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isSelected = selectedOption === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelectedOption(opt.key)}
                className={`w-full text-left border-2 rounded-2xl p-4 transition-all ${
                  isSelected ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`rounded-xl p-2 shrink-0 ${isSelected ? 'bg-emerald-500 text-white' : 'bg-muted'}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-emerald-600 dark:text-emerald-400 text-sm">{opt.amountLabel}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Installment plan configuration */}
      {selectedOption === 'installment_plan' && installmentPlan && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 space-y-4">
          {/* Credit tier selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Credit Tier (self-reported)</label>
            <div className="grid grid-cols-3 gap-2">
              {CREDIT_TIERS.map(tier => (
                <button
                  key={tier.key}
                  type="button"
                  onClick={() => setCreditTier(tier.key)}
                  className={`text-center border-2 rounded-xl p-2 transition-all ${
                    creditTier === tier.key ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-blue-300'
                  }`}
                >
                  <p className="font-medium text-sm">{tier.label}</p>
                  <p className="text-[10px] text-muted-foreground">{tier.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Term selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Repayment Term</label>
            <div className="grid grid-cols-6 gap-1.5">
              {INSTALLMENT_TERM_OPTIONS.map(term => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setTermMonths(term)}
                  className={`text-center border-2 rounded-lg py-1.5 text-xs font-medium transition-all ${
                    termMonths === term ? 'border-blue-500 bg-blue-500/5 text-blue-600' : 'border-border hover:border-blue-300'
                  }`}
                >
                  {term}mo
                </button>
              ))}
            </div>
          </div>

          {/* Plan summary */}
          <div className="bg-card rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1"><TrendingUp size={12} /> APR</span>
              <span className="font-medium">{installmentPlan.apr}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Payment</span>
              <span className="font-medium">{fmt(installmentPlan.monthlyPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Interest</span>
              <span className="font-medium">{fmt(installmentPlan.totalInterest)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t">
              <span>Total Cost ({termMonths} payments)</span>
              <span className="text-blue-600 dark:text-blue-400">{fmt(installmentPlan.totalCost)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p>First installment charged now. Remaining payments are due monthly — you'll get email reminders and can pay each installment from this page.</p>
          </div>
        </div>
      )}

      {/* Summary + pay button */}
      <div className="bg-card border rounded-2xl p-4 space-y-2">
        {selectedOption === 'full' && (
          <div className="flex justify-between font-bold">
            <span>Due Now</span>
            <span className="text-emerald-600 dark:text-emerald-400">{fmt(baseTotal)}</span>
          </div>
        )}
        {selectedOption === 'split_50_50' && (
          <>
            <div className="flex justify-between font-bold">
              <span>Due at Pickup</span>
              <span className="text-emerald-600 dark:text-emerald-400">{fmt(halfAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Due at Delivery</span>
              <span>{fmt(halfAmount)}</span>
            </div>
          </>
        )}
        {selectedOption === 'installment_plan' && installmentPlan && (
          <div className="flex justify-between font-bold">
            <span>First Installment Due Now</span>
            <span className="text-blue-600 dark:text-blue-400">{fmt(installmentPlan.monthlyPayment)}</span>
          </div>
        )}
      </div>

      <Button
        onClick={handlePay}
        disabled={paying}
        className={`w-full ${selectedOption === 'installment_plan' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
      >
        {paying
          ? <><Loader2 size={16} className="animate-spin mr-1" /> Redirecting to checkout...</>
          : selectedOption === 'installment_plan'
            ? <><CreditCard size={16} className="mr-1" /> Pay First Installment — {installmentPlan ? fmt(installmentPlan.monthlyPayment) : ''}</>
            : selectedOption === 'full'
              ? <><CreditCard size={16} className="mr-1" /> Pay in Full — {fmt(baseTotal)}</>
              : <><CreditCard size={16} className="mr-1" /> Pay at Pickup — {fmt(halfAmount)}</>}
      </Button>
      <PaymentMethods />
    </div>
  );
}