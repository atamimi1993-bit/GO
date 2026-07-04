import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
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
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [lastPing, setLastPing] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const moves = await base44.entities.MoveRequest.filter({
          assigned_driver_id: driverProfile.id,
          status: 'in_progress',
        });
        if (moves.length > 0) {
          setActiveMove(moves[0]);
          const pings = await base44.entities.LocationPing.filter(
            { move_request_id: moves[0].id },
            '-created_date',
            1
          );
          if (pings.length > 0) setLastPing(pings[0]);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [driverProfile.id]);

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

  const startTracking = () => {
    if (!activeMove) return;
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

  if (!activeMove) return null;

  return (
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
  );
}