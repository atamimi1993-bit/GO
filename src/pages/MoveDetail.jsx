import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PriceBreakdown from '@/components/go/PriceBreakdown';
import MoveTracker from '@/components/go/MoveTracker';
import { ArrowLeft, MapPin, Calendar, Package, Truck, Loader2, Phone, Mail } from 'lucide-react';
import moment from 'moment';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  quoted: 'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-muted text-foreground',
  cancelled: 'bg-red-100 text-red-700',
};

export default function MoveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [move, setMove] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.MoveRequest.get(id),
      base44.entities.MoveItem.filter({ move_request_id: id }),
    ]).then(([m, it]) => { setMove(m); setItems(it); }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  if (!move) return <div className="text-center py-20"><p className="text-muted-foreground">Move not found.</p></div>;

  const pricing = {
    baseCost: move.base_cost, fuelCost: move.fuel_cost, taxRate: move.tax_rate,
    taxAmount: move.tax_amount, appFee: move.app_fee, driverFee: move.driver_fee,
    totalPrice: move.total_price, driverPayout: move.driver_payout,
    roundTripMiles: move.distance_miles * 2, gallonsNeeded: 0,
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
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
            <p className="font-medium text-sm">{moment(move.move_date).format('MMMM D, YYYY')}{move.move_time && ` at ${move.move_time}`}</p>
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
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-4">
          <h3 className="font-display font-bold text-sm mb-2 text-emerald-800">Assigned Driver</h3>
          <p className="font-medium">{move.assigned_driver_name}</p>
        </div>
      )}

      {/* Live Tracking */}
      {move.assigned_driver_id && ['accepted', 'in_progress', 'completed'].includes(move.status) && (
        <div className="mb-4">
          <MoveTracker moveId={move.id} />
        </div>
      )}

      {/* Price */}
      <PriceBreakdown pricing={pricing} truckSize={move.truck_size_needed} />

      {move.notes && (
        <div className="bg-card border rounded-2xl p-5 mt-4">
          <h3 className="font-display font-bold text-sm mb-1">Notes</h3>
          <p className="text-sm text-muted-foreground">{move.notes}</p>
        </div>
      )}
    </div>
  );
}