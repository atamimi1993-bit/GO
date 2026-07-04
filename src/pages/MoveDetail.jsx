import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PriceBreakdown from '@/components/go/PriceBreakdown';
import { getCurrency } from '@/lib/pricing';
import PullToRefresh from '@/components/go/PullToRefresh';
import { ArrowLeft, MapPin, Calendar, Package, Truck, Loader2, Phone, Mail, CreditCard, CheckCircle2, Star, ClipboardCheck, MailCheck, FileText, Shield, Wallet, CalendarClock, Video, AlertTriangle } from 'lucide-react';
import RatingForm from '@/components/go/RatingForm';
import DamageReportForm from '@/components/go/DamageReportForm';
import ReceiptDownload from '@/components/go/ReceiptDownload';
import RouteLogForm from '@/components/go/RouteLogForm';
import PromoCodeInput from '@/components/go/PromoCodeInput';
import AssignedDriverCard from '@/components/go/AssignedDriverCard';
import PriceConfirmation from '@/components/go/PriceConfirmation';
import PaymentMethods from '@/components/go/PaymentMethods';
import PaymentOptions from '@/components/go/PaymentOptions';
import InstallmentProgress from '@/components/go/InstallmentProgress';
import OnSiteChecklist from '@/components/go/OnSiteChecklist';
import CancelMoveButton from '@/components/go/CancelMoveButton';
import MoveChat from '@/components/go/MoveChat';
import RescheduleButton from '@/components/go/RescheduleButton';
import TipButton from '@/components/go/TipButton';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/go/PageHeader';
import TemperatureBadge, { SignatureBadge } from '@/components/go/TemperatureBadge';
import CarbonFootprintBadge from '@/components/go/CarbonFootprintBadge';
import { format, parseISO } from 'date-fns';

const MoveTracker = lazy(() => import('@/components/go/MoveTracker'));
const SimpleStatusTracker = lazy(() => import('@/components/go/SimpleStatusTracker'));
const ProofOfDeliveryCapture = lazy(() => import('@/components/go/ProofOfDeliveryCapture'));

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
    const reviewPhotos = (() => {
      try { return JSON.parse(existingRating.photo_urls || '[]'); } catch { return []; }
    })();
    return (
      <div className="bg-card border rounded-2xl p-5 mt-4">
        <h3 className="font-display font-bold text-sm mb-2">Your Rating</h3>
        <div className="flex items-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={16} className={n <= (existingRating.stars || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'} />
          ))}
        </div>
        {existingRating.comment && <p className="text-sm text-muted-foreground select-text mb-3">"{existingRating.comment}"</p>}
        {reviewPhotos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {reviewPhotos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border">
                <img src={url} alt={`Review photo ${i + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        )}
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
        onSubmitted={() => setExistingRating({ stars: 5 })}
        onError={() => setExistingRating(null)}
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
  const [payingBalance, setPayingBalance] = useState(false);
  const [driverProfile, setDriverProfile] = useState(null);
  const [sendingCert, setSendingCert] = useState(false);
  const { toast } = useToast();
  const mountedRef = useRef(true);

  const handleSendCertificate = async () => {
    setSendingCert(true);
    try {
      const res = await base44.functions.invoke('send-insurance-certificate', { move_request_id: move.id });
      toast({ title: 'Certificate sent!', description: `Insurance certificate emailed to ${move.customer_email || 'customer'}.` });
    } catch (err) {
      toast({ title: 'Could not send certificate', description: err.message, variant: 'destructive' });
    }
    setSendingCert(false);
  };

  const handleConfirmDelivery = async () => {
    try {
      setConfirming(true);
      setMove(prev => ({ ...prev, status: 'completed' }));
      await base44.entities.MoveRequest.update(move.id, { status: 'completed' });
      try {
        await base44.functions.invoke('send-move-invoice', { move_request_id: move.id });
        setInvoiceSent(true);
      } catch (err) {
        console.error('Invoice email failed:', err);
      }
      toast({ title: 'Delivery confirmed!', description: 'Your move summary and invoice have been emailed to you.' });
      try {
        await base44.functions.invoke('award-driver-bonuses', { move_request_id: move.id });
      } catch (err) {
        console.error('Driver bonus award failed:', err);
      }
      await load();
    } catch (err) {
      setMove(prev => ({ ...prev, status: 'in_progress' }));
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
    if (params.get('cancellation') === 'success') {
      toast({ title: 'Move cancelled', description: 'The $250 cancellation fee has been paid.' });
    } else if (params.get('cancellation') === 'cancelled') {
      toast({ title: 'Cancellation incomplete', description: 'The move was not cancelled.' });
    }
    if (params.get('tip') === 'success') {
      toast({ title: 'Tip sent!', description: 'Thank you for your generosity.' });
    } else if (params.get('tip') === 'cancelled') {
      toast({ title: 'Tip cancelled', description: 'No charge was made.' });
    }
  }, [toast]);

  const load = useCallback(async () => {
    const [m, it, u, contracts] = await Promise.all([
      base44.entities.MoveRequest.get(id),
      base44.entities.MoveItem.filter({ move_request_id: id }),
      base44.auth.me().catch(() => null),
      base44.entities.Contract.filter({ move_request_id: id, contract_type: 'customer_service' }).catch(() => []),
    ]);
    if (!mountedRef.current) return;
    setMove(m);
    setItems(it);
    setCurrentUser(u);
    setContract(contracts?.[0] || null);
    if (u?.email) {
      try {
        const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
        if (!mountedRef.current) return;
        setDriverProfile(profiles[0] || null);
      } catch {
        if (!mountedRef.current) return;
        setDriverProfile(null);
      }
    }
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    load().finally(() => { if (mountedRef.current) setLoading(false); });
    return () => { mountedRef.current = false; };
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
    bulkyItemFee: move.bulky_item_fee, materialsFee: move.materials_fee, carryingFee: move.carrying_fee,
    extraServiceFee: move.extra_service_fee, extraHelper: move.extra_helper, elevatorService: move.elevator_service,
    tolls: move.tolls,
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
        {(() => {
          try {
            const stops = JSON.parse(move.intermediate_stops || '[]');
            return stops.map((stop, idx) => (
              <div key={`is-${idx}`} className="flex items-start gap-3">
                <div className="w-[18px] h-[18px] rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  {idx + 1}
                </div>
                <div><p className="text-xs text-muted-foreground">Stop {idx + 1}</p><p className="font-medium text-sm">{stop}</p></div>
              </div>
            ));
          } catch { return null; }
        })()}
        {(() => {
          try {
            const stops = JSON.parse(move.multi_stop_addresses || '[]');
            return stops.map((stop, idx) => (
              <div key={`ms-${idx}`} className="flex items-start gap-3">
                <div className="w-[18px] h-[18px] rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  {idx + 2}
                </div>
                <div><p className="text-xs text-muted-foreground">Stop {idx + 2}</p><p className="font-medium text-sm">{stop}</p></div>
              </div>
            ));
          } catch { return null; }
        })()}
        <div className="flex items-start gap-3">
          <MapPin className="text-red-400 mt-0.5" size={18} />
          <div><p className="text-xs text-muted-foreground">Drop-off</p><p className="font-medium text-sm">{move.dropoff_address}</p></div>
        </div>
        {(move.temperature_controlled || move.requires_signature) && (
          <div className="flex gap-2 pt-1">
            <TemperatureBadge show={move.temperature_controlled} small />
            <SignatureBadge show={move.requires_signature} small />
          </div>
        )}
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

      {/* Carbon footprint */}
      <div className="mb-4">
        <CarbonFootprintBadge
          distanceMiles={move.distance_miles || 0}
          distanceUnit={move.distance_unit || 'mi'}
          fuelType={move.truck_size_needed === 'small' ? 'gasoline' : 'diesel'}
          mpg={move.truck_size_needed === 'small' ? 18 : move.truck_size_needed === 'medium' ? 14 : move.truck_size_needed === 'large' ? 10 : 8}
        />
      </div>

      {/* On-site verification badge */}
      {move.onsite_verified && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">On-site verified</p>
            <p className="text-xs text-muted-foreground">Driver confirmed items, access, and finalized the office price.</p>
          </div>
          {move.onsite_photo_url && (
            <img src={move.onsite_photo_url} alt="Site photo" className="ml-auto w-16 h-16 rounded-lg object-cover border" />
          )}
        </div>
      )}

      {/* Access media — front area / loading photos */}
      {(() => {
        const accessMedia = (() => {
          try { return JSON.parse(move.access_media_urls || '[]'); } catch { return []; }
        })();
        if (!accessMedia.length) return null;
        return (
          <div className="bg-card border rounded-2xl overflow-hidden mb-4">
            <div className="px-5 py-3 bg-muted border-b font-medium text-sm flex items-center gap-2">
              <MapPin size={14} className="text-emerald-600" /> Access & Loading Area
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-3">Photos and videos of the front area, parking, and loading path provided by the customer.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {accessMedia.map((m, i) => (
                  <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-lg overflow-hidden border bg-muted block">
                    {m.type === 'video' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                        <Video size={20} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground mt-1">Video</span>
                      </div>
                    ) : (
                      <img src={m.url} alt={`Access ${i + 1}`} className="w-full h-full object-cover" />
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

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
        <AssignedDriverCard move={move} />
      )}

      {/* Simplified status tracker — quick Loading / In Transit / Delivered view */}
      {move.assigned_driver_id && ['accepted', 'in_progress', 'completed'].includes(move.status) && (
        <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>}>
          <SimpleStatusTracker move={move} />
        </Suspense>
      )}

      {/* Live Tracking */}
      {move.assigned_driver_id && ['accepted', 'in_progress', 'completed'].includes(move.status) && (
        <div className="mb-4">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>}>
            <MoveTracker moveId={move.id} />
          </Suspense>
        </div>
      )}

      {/* Route mileage & time log — driver fills out, admin can view */}
      {move.assigned_driver_id && driverProfile?.id === move.assigned_driver_id && ['in_progress', 'completed'].includes(move.status) && (
        <RouteLogForm move={move} driverProfile={driverProfile} onSaved={load} />
      )}

      {/* On-site checklist — driver verifies items, records access, finalizes price */}
      {move.assigned_driver_id && driverProfile?.id === move.assigned_driver_id && move.status === 'in_progress' && !move.onsite_verified && (
        <OnSiteChecklist move={move} driverProfile={driverProfile} onComplete={load} />
      )}

      {/* Price — only visible when ready to pay or admin */}
      {(showInternalCosts || ['quoted', 'accepted', 'in_progress', 'completed'].includes(move.status)) && (
        <PriceBreakdown pricing={pricing} truckSize={move.truck_size_needed} currencyCode={currencyCode} showInternalCosts={showInternalCosts} />
      )}

      {/* Price confirmation — both parties must confirm after driver acceptance */}
      {move.status === 'accepted' && (
        <PriceConfirmation move={move} onConfirmed={load} />
      )}

      {/* Delivery payment — second half due upon delivery (50/50 split only) */}
      {!move.paid && move.deposit_paid && move.balance_due > 0 && move.payment_option !== 'installment_plan' && move.status !== 'cancelled' && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 mt-2 space-y-3">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <Wallet size={16} /> Pickup paid — delivery payment due
          </div>
          {/* Progress bar */}
          <div className="flex gap-1.5">
            <div className="flex-1 h-2 rounded-full bg-blue-500" />
            <div className="flex-1 h-2 rounded-full bg-muted" />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pickup Payment</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{curr.symbol}{(move.deposit_amount || 0).toFixed(curr.decimals)} ✓</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-blue-500/20">
            <span>Delivery Payment Due</span>
            <span className="text-blue-600 dark:text-blue-400">{curr.symbol}{(move.balance_due || 0).toFixed(curr.decimals)}</span>
          </div>
          <Button
            onClick={handlePayBalance}
            disabled={payingBalance}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {payingBalance
              ? <><Loader2 size={16} className="animate-spin mr-1" /> Redirecting...</>
              : <><CreditCard size={16} className="mr-1" /> Pay at Delivery — {curr.symbol}{(move.balance_due || 0).toFixed(curr.decimals)}</>}
          </Button>
          <PaymentMethods />
        </div>
      )}

      {/* Payment options — full, 50/50 split, or installment plan */}
      {!move.paid && !move.deposit_paid && move.status !== 'cancelled' && (
        <PaymentOptions move={move} onPromoApplied={setPromoData} />
      )}

      {/* Installment plan progress — track and pay monthly installments */}
      {!move.paid && move.deposit_paid && move.payment_option === 'installment_plan' && move.status !== 'cancelled' && (
        <InstallmentProgress move={move} />
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

      {/* Driver proof of delivery — for courier jobs requiring signature/photo */}
      {move.status === 'in_progress' && driverProfile && move.assigned_driver_id && move.job_type === 'courier' && (
        <div className="bg-card border rounded-2xl p-5 mt-4">
          <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
            <ClipboardCheck size={16} className="text-emerald-600" /> Proof of Delivery
          </h3>
          <ProofOfDeliveryCapture move={move} onComplete={() => load()} />
        </div>
      )}

      {/* Customer confirms delivery — transitions in_progress to completed */}
      {move.status === 'in_progress' && (!driverProfile || move.job_type !== 'courier' || !move.requires_signature) && (
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
          {['accepted', 'in_progress', 'completed'].includes(move.status) && currentUser?.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 min-h-[44px]"
              onClick={handleSendCertificate}
              disabled={sendingCert}
              aria-label="Send insurance certificate to customer"
            >
              {sendingCert
                ? <><Loader2 size={14} className="animate-spin mr-1" /> Sending...</>
                : <><Shield size={14} className="mr-1" /> Resend Insurance Certificate</>}
            </Button>
          )}
        </div>
      )}

      {/* Invoice sent confirmation on completed moves */}
      {move.status === 'completed' && invoiceSent && (
        <div className="flex items-center gap-2 mt-4 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          <MailCheck size={16} /> Move summary and invoice emailed to {move.customer_email || 'your email'}
        </div>
      )}

      {/* Download PDF receipt — available on completed moves */}
      {move.status === 'completed' && (
        <div className="mt-4">
          <ReceiptDownload move={move} />
        </div>
      )}

      {/* Customer rates driver on completed moves */}
      {move.status === 'completed' && move.assigned_driver_id && (
        <RatingSection move={move} />
      )}

      {/* Reschedule request — either party can propose a new date/time */}
      {move.assigned_driver_id && !['completed', 'cancelled'].includes(move.status) && currentUser && (
        <RescheduleButton move={move} currentUser={currentUser} driverProfile={driverProfile} onRescheduled={load} />
      )}

      {/* Tip driver — only on completed moves with an assigned driver */}
      {move.status === 'completed' && move.assigned_driver_id && !move.tip_paid && (
        <TipButton move={move} />
      )}

      {/* Cancel move — free before driver acceptance, $250 fee after */}
      {!['completed', 'cancelled'].includes(move.status) && (
        <div className="mt-4">
          <CancelMoveButton move={move} onCancelled={load} />
        </div>
      )}

      {/* Cancelled status banner */}
      {move.status === 'cancelled' && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 mt-4 flex items-center gap-3">
          <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Move Cancelled</p>
            <p className="text-xs text-muted-foreground">
              {move.cancellation_fee_paid
                ? `A $${move.cancellation_fee || 250} cancellation fee was charged.`
                : 'This move has been cancelled.'}
            </p>
          </div>
        </div>
      )}

      {/* In-app messaging — available once a driver is assigned */}
      {move.assigned_driver_id && move.status !== 'cancelled' && currentUser && (
        <MoveChat move={move} currentUser={currentUser} driverProfile={driverProfile} />
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