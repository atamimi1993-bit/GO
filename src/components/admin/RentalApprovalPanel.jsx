import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, FileText, Car, Truck, Bus, Bike, Caravan } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const VEHICLE_ICONS = {
  car: Car, suv: Car, pickup: Truck, van: Truck, truck: Truck,
  box_truck: Truck, flatbed: Truck, semi: Truck, trailer: Caravan,
  rv: Caravan, motorcycle: Bike, bus: Bus,
};

const VEHICLE_LABELS = {
  car: 'Car', suv: 'SUV', pickup: 'Pickup', van: 'Van', truck: 'Truck',
  box_truck: 'Box Truck', flatbed: 'Flatbed', semi: 'Semi', trailer: 'Trailer',
  rv: 'RV', motorcycle: 'Motorcycle', bus: 'Bus',
};

const REQUIRES_REGISTRATION = ['van', 'truck', 'box_truck', 'flatbed', 'semi', 'trailer', 'bus'];

export default function RentalApprovalPanel({ scrollRef }) {
  const { toast } = useToast();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.VehicleRental.filter({ status: 'pending_review' }, '-created_date', 50);
      setPending(data);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (rentalId, action) => {
    setProcessingId(rentalId);
    const prevPending = [...pending];
    setPending(prev => prev.filter(r => r.id !== rentalId));
    try {
      const newStatus = action === 'approve' ? 'active' : 'inactive';
      await base44.entities.VehicleRental.update(rentalId, { status: newStatus });
      toast({ title: action === 'approve' ? 'Listing approved' : 'Listing rejected' });
    } catch (err) {
      setPending(prevPending);
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={20} className="text-amber-500" />
          <h2 className="font-display font-bold text-lg">Pending Vehicle Listings</h2>
        </div>
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
      </div>
    );
  }

  if (pending.length === 0) return null;

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={20} className="text-amber-500" />
        <h2 className="font-display font-bold text-lg">Pending Vehicle Listings</h2>
        <Badge className="ml-1 bg-amber-500/10 text-amber-700 dark:text-amber-300">{pending.length}</Badge>
      </div>
      <div className="space-y-3">
        {pending.map((r) => {
          const Icon = VEHICLE_ICONS[r.vehicle_type] || Truck;
          const needsReg = REQUIRES_REGISTRATION.includes(r.vehicle_type);
          const photos = r.photo_urls ? JSON.parse(r.photo_urls) : [];
          const photo = photos[0]?.url || photos[0] || null;
          return (
            <div key={r.id} className="flex flex-col sm:flex-row gap-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              {/* Thumbnail */}
              <div className="w-full sm:w-32 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                {photo ? (
                  <img src={photo} alt={`${r.make} ${r.model}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon className="text-muted-foreground" size={32} />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} className="text-muted-foreground shrink-0" />
                  <p className="font-medium truncate">{r.make} {r.model} ({r.year || 'N/A'})</p>
                  <Badge variant="secondary" className="shrink-0">{VEHICLE_LABELS[r.vehicle_type] || r.vehicle_type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{r.owner_name} · {r.owner_email}</p>
                <p className="text-xs text-muted-foreground">{r.city}{r.state ? `, ${r.state}` : ''} · ${r.daily_rate}/day</p>
                {r.license_plate && <p className="text-xs text-muted-foreground">Plate: {r.license_plate}</p>}

                {/* Document links */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {r.registration_doc_url && (
                    <a href={r.registration_doc_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <FileText size={12} /> Registration
                      </Badge>
                    </a>
                  )}
                  {r.insurance_doc_url && (
                    <a href={r.insurance_doc_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <FileText size={12} /> Insurance
                      </Badge>
                    </a>
                  )}
                  {needsReg && !r.registration_doc_url && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle size={12} /> No registration uploaded
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600"
                  disabled={processingId === r.id}
                  onClick={() => handleAction(r.id, 'approve')}
                >
                  {processingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processingId === r.id}
                  onClick={() => handleAction(r.id, 'reject')}
                >
                  <XCircle size={14} />
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}