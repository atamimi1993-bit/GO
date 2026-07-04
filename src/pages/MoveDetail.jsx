import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PriceBreakdown from '@/components/go/PriceBreakdown';
import { getCurrency } from '@/lib/pricing';
import PullToRefresh from '@/components/go/PullToRefresh';
import { ArrowLeft, MapPin, Calendar, Package, Truck, Loader2, Phone, Mail, CreditCard, CheckCircle2, Star } from 'lucide-react';
import RatingForm from '@/components/go/RatingForm';
import { useToast } from '@/components/ui/use-toast';
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
  const { toast } = useToast();

  const handlePay = async () => {
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the editor preview.');
      return;
    }
    try {
      setPaying(true);
      const res = await base44.functions.invoke('create-move-checkout', { move_request_id: id });
      window.location.href = res.data.url;
    } catch {
      toast({ title: 'Payment error', description: 'Could not start checkout. Please try again.', variant: 'destructive' });
      setPaying(false);
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
    const [m, it] = await Promise.all([
      base44.entities.MoveRequest.get(id),
      base44.entities.MoveItem.filter({ move_request_id: id }),
    ]);
    setMove(m);
    setItems(it);
  }, [id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  if (!move) return <div className="text-center py-20"><p className="text-muted-foreground">Move not found.</p></div>;

  const currencyCode = move.currency || 'USD';
  const curr = getCurrency(currencyCode);
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
      <button onClick={() => navigate(-1)} aria-label="Go back" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 min-h-[44px]">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Move Details</h1>
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
      <PriceBreakdown pricing={pricing} truckSize={move.truck_size_needed} currencyCode={currencyCode} />

      {!move.paid && move.status !== 'cancelled' && (
        <Button
          onClick={handlePay}
          disabled={paying}
          className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600"
        >
          {paying ? <><Loader2 size={16} className="animate-spin mr-1" /> Redirecting to checkout...</> : <><CreditCard size={16} className="mr-1" /> Pay {curr.symbol}{move.total_price?.toFixed(curr.decimals)}</>}
        </Button>
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

      {/* Customer rates driver on completed moves */}
      {move.status === 'completed' && move.assigned_driver_id && (
        <RatingSection move={move} />
      )}
    </div>
    </PullToRefresh>
  );
}