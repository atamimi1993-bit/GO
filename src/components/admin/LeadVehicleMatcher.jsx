import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Loader2, X, MapPin, User, Star, Award, CheckCircle2, Car } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/pricing';

const VEHICLE_LABELS = {
  car: 'Car', suv: 'SUV', pickup: 'Pickup', van: 'Van', truck: 'Truck',
  box_truck: 'Box Truck', flatbed: 'Flatbed', semi: 'Semi', trailer: 'Trailer',
  rv: 'RV', motorcycle: 'Motorcycle', bus: 'Bus',
};

export default function LeadVehicleMatcher({ lead, onAssigned }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pairings, setPairings] = useState([]);
  const [assigningId, setAssigningId] = useState(null);
  const { toast } = useToast();

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('match-lead-vehicles', { lead_id: lead.id });
      setPairings(res.data.pairings || []);
    } catch (err) {
      toast({ title: 'Failed to find matches', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  }, [lead.id, toast]);

  const handleOpen = () => {
    setOpen(true);
    loadMatches();
  };

  const handleAssign = async (vehicleId, driverId) => {
    const key = `${vehicleId}-${driverId}`;
    setAssigningId(key);
    try {
      await base44.functions.invoke('match-lead-vehicles', {
        action: 'assign',
        lead_id: lead.id,
        vehicle_rental_id: vehicleId,
        driver_id: driverId,
      });
      toast({ title: 'Vehicle & driver assigned!', description: 'The certified driver has been matched to this lead.' });
      setOpen(false);
      if (onAssigned) onAssigned();
    } catch (err) {
      toast({ title: 'Assignment failed', description: err.message, variant: 'destructive' });
    }
    setAssigningId(null);
  };

  if (lead.assignment_status === 'assigned') {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
        <CheckCircle2 size={14} className="shrink-0" />
        <span className="truncate">
          Assigned: <strong>{lead.matched_vehicle_title}</strong> → {lead.matched_driver_name}
        </span>
        <Button size="sm" variant="ghost" className="ml-auto min-h-[36px] h-7 px-2 text-xs" onClick={handleOpen}>
          Reassign
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        size="sm"
        className="min-h-[44px] mt-2 w-full sm:w-auto"
        onClick={handleOpen}
      >
        <Truck size={14} className="mr-1" /> Match Vehicle & Certified Driver
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="bg-card w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card border-b px-5 py-4 flex items-center justify-between z-10">
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm truncate">Match Vehicle & Driver</h3>
                <p className="text-xs text-muted-foreground truncate">{lead.lead_name} · {lead.location}</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted shrink-0" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                </div>
              ) : pairings.length === 0 ? (
                <div className="text-center py-12">
                  <Car className="mx-auto text-muted-foreground mb-3" size={32} />
                  <p className="text-sm font-medium mb-1">No matching vehicles found</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    No available vehicles with certified drivers were found in this lead's location.
                    Try adding more vehicles or expanding your service areas.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pairings.map((pairing) => (
                    <div key={pairing.vehicle.id} className="border rounded-xl overflow-hidden">
                      {/* Vehicle header */}
                      <div className="bg-muted/50 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate flex items-center gap-1.5">
                              <Truck size={14} className="text-muted-foreground shrink-0" />
                              {pairing.vehicle.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {VEHICLE_LABELS[pairing.vehicle.vehicle_type] || pairing.vehicle.vehicle_type}
                              </Badge>
                              {pairing.vehicle.capacity_lbs > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {pairing.vehicle.capacity_lbs.toLocaleString()} lbs
                                </span>
                              )}
                              {pairing.vehicle.requires_cdl && (
                                <Badge className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                  <Award size={10} className="mr-0.5" /> CDL Required
                                </Badge>
                              )}
                            </div>
                          </div>
                          {pairing.vehicle.daily_rate > 0 && (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                              {formatCurrency(pairing.vehicle.daily_rate, 'USD')}/day
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin size={10} className="shrink-0" />
                          {pairing.vehicle.city}{pairing.vehicle.state ? `, ${pairing.vehicle.state}` : ''}
                        </p>
                      </div>

                      {/* Eligible drivers */}
                      <div className="p-3 space-y-2">
                        {pairing.drivers.map((driver) => {
                          const key = `${pairing.vehicle.id}-${driver.id}`;
                          return (
                            <div key={driver.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate flex items-center gap-1">
                                  <User size={12} className="text-muted-foreground shrink-0" />
                                  {driver.full_name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-muted-foreground">
                                  {driver.cdl_certified && (
                                    <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                      <Award size={10} /> {driver.cdl_class}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-0.5">
                                    <Star size={10} className="text-amber-500" />
                                    {driver.rating?.toFixed(1)}
                                  </span>
                                  <span>{driver.total_jobs} jobs</span>
                                  {driver.company_name && (
                                    <span className="truncate">· {driver.company_name}</span>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="min-h-[36px] h-8 shrink-0"
                                disabled={assigningId === key}
                                onClick={() => handleAssign(pairing.vehicle.id, driver.id)}
                              >
                                {assigningId === key ? <Loader2 size={12} className="animate-spin" /> : 'Assign'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}