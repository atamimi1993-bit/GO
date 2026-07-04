import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import DriverRateConfirmation from '@/components/go/DriverRateConfirmation';
import {
  Navigation,
  MapPin,
  PackageCheck,
  Truck,
  CheckCircle2,
  Loader2,
  Radio,
  Square,
} from 'lucide-react';
import { format } from 'date-fns';

const MILESTONES = [
  { key: 'arrived_at_pickup', label: 'Arrived at Pickup', icon: MapPin },
  { key: 'items_loaded', label: 'Items Loaded', icon: PackageCheck },
  { key: 'en_route_to_dropoff', label: 'En Route to Dropoff', icon: Truck },
  { key: 'arrived_at_dropoff', label: 'Arrived at Dropoff', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

export default function DriverTrackingControls({ driverProfile }) {
  const navigate = useNavigate();
  const [activeMove, setActiveMove] = useState(null);
  const [acceptedMove, setAcceptedMove] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [lastPing, setLastPing] = useState(null);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      // Check for accepted moves needing rate confirmation
      const accepted = await base44.entities.MoveRequest.filter({
        assigned_driver_id: driverProfile.id,
        status: 'accepted',
      }, '-created_date', 5);
      setAcceptedMove(accepted[0] || null);

      // Check for in_progress moves
      const inProgress = await base44.entities.MoveRequest.filter({
        assigned_driver_id: driverProfile.id,
        status: 'in_progress',
      });
      if (inProgress.length > 0) {
        setActiveMove(inProgress[0]);
        const pings = await base44.entities.LocationPing.filter(
          { move_request_id: inProgress[0].id },
          '-created_date',
          1
        );
        if (pings.length > 0) setLastPing(pings[0]);
      } else {
        setActiveMove(null);
      }
    } catch {}
    setLoading(false);
  }, [driverProfile.id]);

  useEffect(() => {
    load();
  }, [load]);

  const sendPing = (milestone = 'en_route_to_pickup') => {
    if (!activeMove) return;
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported on this device', variant: 'destructive' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const ping = await base44.entities.LocationPing.create({
            move_request_id: activeMove.id,
            driver_profile_id: driverProfile.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            milestone,
          });
          setLastPing(ping);
          if (milestone === 'delivered') {
            toast({ title: 'Move marked as delivered!' });
          }
        } catch {
          toast({ title: 'Failed to send location update', variant: 'destructive' });
        }
      },
      (err) => {
        toast({ title: 'Could not get location: ' + err.message, variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startTracking = async () => {
    // If there's an accepted move that hasn't transitioned yet, check confirmations
    const move = activeMove || acceptedMove;
    if (!move) return;

    if (!move.driver_rate_confirmed || !move.customer_price_confirmed) {
      toast({ title: 'Cannot start yet', description: 'Both you and the customer must confirm the pricing before tracking can begin.', variant: 'destructive' });
      return;
    }

    // Transition accepted → in_progress if needed
    if (move.status === 'accepted') {
      try {
        await base44.entities.MoveRequest.update(move.id, { status: 'in_progress' });
        setAcceptedMove(null);
        setActiveMove({ ...move, status: 'in_progress' });
      } catch (err) {
        toast({ title: 'Could not start move', description: err.message, variant: 'destructive' });
        return;
      }
    }

    setTracking(true);
    sendPing('en_route_to_pickup');
    intervalRef.current = setInterval(() => sendPing('en_route_to_pickup'), 30000);
  };

  const stopTracking = () => {
    setTracking(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => stopTracking(), []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!activeMove && !acceptedMove) return null;

  return (
    <div>
      {/* Rate confirmation for accepted moves */}
      {acceptedMove && (
        <>
          <DriverRateConfirmation move={acceptedMove} onConfirmed={load} />
          {/* Start move button when both parties confirmed */}
          {acceptedMove.driver_rate_confirmed && acceptedMove.customer_price_confirmed && (
            <div className="bg-card border rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={18} />
                <span className="font-medium text-sm">Both parties confirmed — ready to start!</span>
              </div>
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={startTracking}>
                <Navigation size={16} className="mr-1" /> Start Move & Tracking
              </Button>
            </div>
          )}
        </>
      )}

      {/* Tracking controls for in_progress moves */}
      {activeMove && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-muted border-b font-medium text-sm flex items-center gap-2">
            <Radio size={16} className={tracking ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'} />
            Active Move Tracking
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{activeMove.pickup_address}</p>
                <p className="text-xs text-muted-foreground truncate">→ {activeMove.dropoff_address}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate(`/move/${activeMove.id}`)}>
                View
              </Button>
            </div>

            {lastPing && (
              <p className="text-xs text-muted-foreground">
                Last update: {format(new Date(lastPing.created_date), 'MMM d, h:mm a')}
              </p>
            )}

            {!tracking ? (
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={startTracking}>
                <Navigation size={16} className="mr-1" /> Start Live Tracking
              </Button>
            ) : (
              <Button variant="outline" className="w-full" onClick={stopTracking}>
                <Square size={16} className="mr-1" /> Stop Tracking
              </Button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MILESTONES.map((m) => (
                <Button key={m.key} size="sm" variant="outline" onClick={() => sendPing(m.key)} aria-label={m.label}>
                  <m.icon size={14} className="mr-1" /> {m.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}