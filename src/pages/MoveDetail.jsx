import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PriceBreakdown from '@/components/go/PriceBreakdown';
import { getCurrency } from '@/lib/pricing';
import PullToRefresh from '@/components/go/PullToRefresh';
import { ArrowLeft, MapPin, Calendar, Package, Truck, Loader2, Phone, Mail, CreditCard, CheckCircle2, Star, ClipboardCheck, MailCheck, FileText, Shield, Wallet, CalendarClock } from 'lucide-react';
import RatingForm from '@/components/go/RatingForm';
import DamageReportForm from '@/components/go/DamageReportForm';
import PromoCodeInput from '@/components/go/PromoCodeInput';
import PriceConfirmation from '@/components/go/PriceConfirmation';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/go/PageHeader';
import { format, parseISO } from 'date-fns';

const MoveTracker = lazy(() => import('@/components/go/MoveTracker'));

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  quoted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  accepted: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  completed: 'bg-muted text-foreground',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

function RatingSection({ move }) {
  const [existingRating, setExistingRating] = useState(null);
  const [checked, setChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setCurrentUser(u);
        const existing = await base44.entities.Rating.filter({ move_request_id: move.id, direction: 'customer_to_driver', rater_id: u.id });
        if (existing.length > 0) setExistingRating(existing[0]);
      } catch {}
      setChecked(true);
    })();
  }, [move.id]);

  if (!checked || !currentUser) return null;
  if (existingRating) {
    return (
      <div className="bg-card border rounded-2xl p-5 mt-4">
        <h3 className="font-display font-bold text-sm mb-2">Your Rating</h3>
        <div className="flex items-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={16} className={n <= (existingRating.stars || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'} />
          ))}
        </div>
        {existingRating.comment && <p className="text-sm text-muted-foreground select-text">"{existingRating.comment}"</p>}
      </div>
    );
  }
  return (
    <div className="mt-4">
      <RatingForm
        move={move}
        direction="customer_to_driver"
        raterId={currentUser.id}
        raterName={move.customer_name || currentUser.full_name || currentUser.email}
        rateeId={move.assigned_driver_id}
        rateeName={move.assigned_driver_name || 'Driver'}
        onSubmitted={() => { setExistingRating({ stars: 5 }); window.location.reload(); }}
      />
    </div>
  );
}

export default function MoveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { scrollRef } = useOutletContext();
  const [move, setMove] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [invoiceSent, setInvoiceSent] = useState(false);
  const [contract, setContract] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [promoData, setPromoData] = useState(null);
  const [usePaymentPlan, setUsePaymentPlan] = useState(false);
  const [payingBalance, setPayingBalance] = useState(false);
  const [driverProfile, setDriverProfile] = useState(null);
  const { toast } = useToast();

  const handleConfirmDelivery = async () => {
    try {
      setConfirming(true);
      await base44.entities.MoveRequest.update(move.id, { status: 'completed' });
      try {
        await base44.functions.invoke('send-move-invoice', { move_request_id: move.id });
        setInvoiceSent(true);
      } catch (err) {
        console.error('Invoice email failed:', err);
      }
      toast({ title: 'Delivery confirmed!', description: 'Your move summary and invoice have been emailed to you.' });
      await load();
    } catch (err) {
      toast({ title: 'Could not confirm delivery', description: err.message || 'Please try again.', variant: 'destructive' });
    }
    setConfirming(false);
  };

  const handlePay = async () => {
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the editor preview.');
      return;
    }
    try {
      setPaying(true);
      const res = await base44.functions.invoke('create-move-checkout', {
        move_request_id: id,
        promo_code: promoData?.promo?.code || undefined,
        payment_plan: usePaymentPlan,
      });
      window.location.href = res.data.url;
    } catch {
      toast({ title: 'Payment error', description: 'Could not start checkout. Please try again.', variant: 'destructive' });
      setPaying(false);
    }
  };

  const handlePayBalance = async () => {
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the editor preview.');
      return;
    }
    try {
      setPayingBalance(true);
      const res = await base44.functions.invoke('create-move-checkout', {
        move_request_id: id,
        pay_balance: true,
      });
      window.location.href = res.data.url;
    } catch {
      toast({ title: 'Payment error', description: 'Could not start checkout. Please try again.', variant: 'destructive' });
      setPayingBalance(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      toast({ title: 'Payment successful!', description: 'Your move has been paid.' });
    } else if (params.get('payment') === 'cancelled') {
      toast({ title: 'Payment cancelled', description: 'You can pay later from this page.' });
    }
  }, [toast]);

  const load = useCallback(async () => {
    const [m, it, u, contracts] = await Promise.all([
      base44.entities.MoveRequest.get(id),
      base44.entities.MoveItem.filter({ move_request_id: id }),
      base44.auth.me().catch(() => null),
      base44.entities.Contract.filter({ move_request_id: id, contract_type: 'customer_service' }).catch(() => []),
    ]);
    setMove(m);
    setItems(it);
    setCurrentUser(u);
    setContract(contracts?.[0] || null);
    if (u?.email) {
      try {
        const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
        setDriverProfile(profiles[0] || null);
      } catch { setDriverProfile(null); }
    }
  }, [id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  if (!move) return <div className="text-center py-20"><p className="text-muted-foreground">Move not found.</p></div>;

  const currencyCode = move.currency || 'USD';
  const curr = getCurrency(currencyCode);
  const showInternalCosts = currentUser?.role === 'admin' || (driverProfile?.id && driverProfile.id === move.assigned_driver_id);
  const distUnit = move.distance_unit || 'mi';
  const pricing = {
    baseCost: move.base_cost, fuelCost: move.fuel_cost, taxRate: move.tax_rate,
    taxAmount: move.tax_amount, appFee: move.app_fee, driverFee: move.driver_fee,
    totalPrice: move.total_price, driverPayout: move.driver_payout,
    currency: curr,
    displayDistance: (move.distance_miles || 0) * 2,
    displayDistanceUnit: distUnit,
    displayFuel: 0,
    displayFuelUnit: distUnit === 'km' ? 'L' : 'gal',
  };

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Move Details" isRoot={false} />
        <Badge className={STATUS_COLORS[move.status]}>{move.status?.replace('_', ' ')}</Badge>
      </div>

      {/* Addresses */}
      <div className="bg-card border rounded-2xl p-5 mb-4 space-y-3">
        <div className="flex items-start gap-3">
          <MapPin className="text-emerald-500 mt-0.5" size={18} />
          <div><p className="text-xs text-muted-foreground">Pickup</p><p className="font-medium text-sm">{move.pickup_address}</p></div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="text-red-400 mt-0.5" size={18} />
          <div><p className="text-xs text-muted-foreground">Drop-off</p><p className="font-medium text-sm">{move.dropoff_address}</p></div>
        </div>
        <div className="flex items-start gap-3">
          <Calendar className="text-muted-foreground mt-0.5" size={18} />
          <div>
            <p className="text-xs text-muted-foreground">Date & Time</p>
            <p className="font-medium text-sm">{format(parseISO(move.move_date), 'MMMM d, yyyy')}{move.move_time && ` at ${move.move_time}`}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Truck className="text-muted-foreground mt-0.5" size={18} />
          <div><p className="text-xs text-muted-foreground">Truck Size</p><p className="font-medium text-sm capitalize">{move.truck_size_needed?.replace('_', ' ')}</p></div>
        </div>
        <div className="flex items-start gap-3">
          <Package className="text-muted-foreground mt-0.5" size={18} />
          <div><p className="text-xs text-muted-foreground">Total Weight</p><p className="font-medium text-sm">{move.total_weight_lbs?.toLocaleString()} lbs</p></div>
        </div>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div className="bg-card border rounded-2xl overflow-hidden mb-4">
          <div className="px-5 py-3 bg-muted border-b font-medium text-sm">Items ({items.length})</div>
          <div className="divide-y">
            {items.map(item => (
              <div key={item.id} className="px-5 py-3 flex justify-between text-sm">
                <span>{item.quantity}x {item.name}{item.special_handling ? ' ⚠️' : ''}</span>
                <span className="text-muted-foreground">{item.weight_lbs} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned driver */}
      {move.assigned_driver_name && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-4">
          <h3 className="font-display font-bold text-sm mb-2 text-emerald-800 dark:text-emerald-200">Assigned Driver</h3>
          <p className="font-medium">{move.assigned_driver_name}</p>
        </div>
      )}

      {/* Live Tracking */}
      {move.assigned_driver_id && ['accepted', 'in_progress', 'completed'].includes(move.status) && (
        <div className="mb-4">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>}>
            <MoveTracker moveId={move.id} />
          </Suspense>
        </div>
      )}

      {/* Price */}
      <PriceBreakdown pricing={pricing} truckSize={move.truck_size_needed} currencyCode={currencyCode} showInternalCosts={showInternalCosts} />

      {/* Price confirmation — both parties must confirm after driver acceptance */}
      {move.status === 'accepted' && (
        <PriceConfirmation move={move} onConfirmed={load} />
      )}

      {/* Payment plan — installments tracked, show next installment due */}
      {!move.paid && move.deposit_paid && move.balance_due > 0 && move.status !== 'cancelled' && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 mt-2 space-y-3">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <CalendarClock size={16} /> Payment Plan — {move.installments_paid || 0} of 3 installments paid
          </div>
          {/* Progress bar */}
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`flex-1 h-2 rounded-full ${(move.installments_paid || 0) >= n ? 'bg-blue-500' : 'bg-muted'}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Installment Amount</span>
            <span className="font-medium">{curr.symbol}{(move.installment_amount || move.deposit_amount || 0).toFixed(curr.decimals)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-blue-500/20">
            <span>Remaining Balance</span>
            <span className="text-blue-600 dark:text-blue-400">{curr.symbol}{(move.balance_due || 0).toFixed(curr.decimals)}</span>
          </div>
          <Button
            onClick={handlePayBalance}
            disabled={payingBalance}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {payingBalance
              ? <><Loader2 size={16} className="animate-spin mr-1" /> Redirecting...</>
              : <><CreditCard size={16} className="mr-1" /> Pay Installment {((move.installments_paid || 0) + 1)} of 3 — {curr.symbol}{(move.installment_amount || move.deposit_amount || 0).toFixed(curr.decimals)}</>}
          </Button>
        </div>
      )}

      {/* Standard checkout — not yet paid and no deposit outstanding */}
      {!move.paid && !move.deposit_paid && move.status !== 'cancelled' && (
        <>
          <PromoCodeInput move={move} onApplied={setPromoData} />
          {promoData && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Original Total</span>
                <span className="line-through text-muted-foreground">{curr.symbol}{promoData.original_total.toFixed(curr.decimals)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">Discount ({promoData.promo.discount_percent}%)</span>
                <span className="text-emerald-600 dark:text-emerald-400">−{curr.symbol}{promoData.discount_amount.toFixed(curr.decimals)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-emerald-500/20">
                <span>New Total</span>
                <span className="text-emerald-600 dark:text-emerald-400">{curr.symbol}{promoData.discounted_total.toFixed(curr.decimals)}</span>
              </div>
            </div>
          )}

          {/* Payment plan toggle */}
          {(() => {
            const chargeTotal = promoData?.discounted_total || move.total_price || 0;
            return (
              <button
                type="button"
                onClick={() => setUsePaymentPlan(!usePaymentPlan)}
                className={`w-full mt-2 flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${usePaymentPlan ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:bg-muted'}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${usePaymentPlan ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                  <Wallet size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Pay in 3 installments</p>
                  <p className="text-xs text-muted-foreground">
                    {curr.symbol}{(chargeTotal / 3).toFixed(curr.decimals)} now · {curr.symbol}{(chargeTotal / 3).toFixed(curr.decimals)} × 2 later
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${usePaymentPlan ? 'border-blue-500' : 'border-muted-foreground/30'}`}>
                  {usePaymentPlan && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                </div>
              </button>
            );
          })()}

          <Button
            onClick={handlePay}
            disabled={paying}
            className={`w-full mt-2 ${usePaymentPlan ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
          >
            {paying
              ? <><Loader2 size={16} className="animate-spin mr-1" /> Redirecting to checkout...</>
              : usePaymentPlan
                ? <><Wallet size={16} className="mr-1" /> Pay Installment 1 of 3 — {curr.symbol}{((promoData?.discounted_total || move.total_price || 0) / 3).toFixed(curr.decimals)}</>
                : <><CreditCard size={16} className="mr-1" /> Pay {curr.symbol}{(promoData?.discounted_total || move.total_price || 0).toFixed(curr.decimals)}</>}
          </Button>
        </>
      )}

      {move.paid && (
        <div className="flex items-center gap-2 mt-4 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          <CheckCircle2 size={16} /> Payment complete
        </div>
      )}

      {move.notes && (
        <div className="bg-card border rounded-2xl p-5 mt-4">
          <h3 className="font-display font-bold text-sm mb-1">Notes</h3>
          <p className="text-sm text-muted-foreground select-text">{move.notes}</p>
        </div>
      )}

      {/* Customer confirms delivery — transitions in_progress to completed */}
      {move.status === 'in_progress' && (
        <div className="mt-4">
          {invoiceSent && (
            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
              <MailCheck size={16} /> Invoice emailed to {move.customer_email || 'your email'}
            </div>
          )}
          <Button
            onClick={handleConfirmDelivery}
            disabled={confirming}
            className="w-full bg-emerald-500 hover:bg-emerald-600"
          >
            {confirming
              ? <><Loader2 size={16} className="animate-spin mr-1" /> Confirming...</>
              : <><ClipboardCheck size={16} className="mr-1" /> Confirm Delivery Complete</>}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Confirm that your items have been delivered. We'll email you a summary and final invoice.
          </p>
        </div>
      )}

      {/* Signed contract */}
      {contract && (
        <div className="bg-card border rounded-2xl p-5 mt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="text-primary" size={18} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm">Signed Service Agreement</h3>
              <p className="text-xs text-muted-foreground">Contract on file</p>
            </div>
          </div>
          <div className="bg-muted rounded-xl p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Signed by</span><span className="font-medium">{contract.signature_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{contract.party_email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{format(parseISO(contract.signed_at), 'MMM d, yyyy')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-medium">{contract.terms_version}</span></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-primary">
            <Shield size={14} /> Insurance coverage included for this move
          </div>
        </div>
      )}

      {/* Invoice sent confirmation on completed moves */}
      {move.status === 'completed' && invoiceSent && (
        <div className="flex items-center gap-2 mt-4 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          <MailCheck size={16} /> Move summary and invoice emailed to {move.customer_email || 'your email'}
        </div>
      )}

      {/* Customer rates driver on completed moves */}
      {move.status === 'completed' && move.assigned_driver_id && (
        <RatingSection move={move} />
      )}

      {/* Report damaged or lost item */}
      {move.status !== 'cancelled' && currentUser && (
        <div className="mt-4">
          <DamageReportForm move={move} user={currentUser} onSubmitted={load} />
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}