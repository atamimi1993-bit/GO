import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Navigation, Crosshair, Pause, Play } from 'lucide-react';

// Continuous GPS tracker for drivers with active jobs.
// Uses navigator.geolocation.watchPosition to stream location updates,
// sending a LocationPing every 30 seconds while tracking is active.
export default function ContinuousTracker({ driverProfile, activeJobs }) {
  const [tracking, setTracking] = useState(false);
  const [currentPos, setCurrentPos] = useState(null);
  const [lastPing, setLastPing] = useState(null);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);
  const lastPingTimeRef = useRef(0);
  const currentJobRef = useRef(null);

  const activeJob = activeJobs?.[0];

  useEffect(() => {
    currentJobRef.current = activeJob;
  }, [activeJob]);

  const sendPing = async (lat, lng, milestone) => {
    const job = currentJobRef.current;
    if (!job || !driverProfile) return;
    const now = Date.now();
    if (now - lastPingTimeRef.current < 25000) return; // throttle to every 25s
    lastPingTimeRef.current = now;
    try {
      await base44.entities.LocationPing.create({
        move_request_id: job.id,
        driver_profile_id: driverProfile.id,
        lat,
        lng,
        milestone: milestone || 'en_route_to_pickup',
        note: '',
      });
      setLastPing(new Date());
    } catch (e) {
      console.error('Failed to send location ping:', e.message);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your device.');
      return;
    }
    setError(null);
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentPos({ lat: latitude, lng: longitude });
        sendPing(latitude, longitude);
      },
      (err) => {
        setError(err.message || 'Failed to get location.');
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (!activeJob) return null;

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tracking ? 'bg-emerald-500/10' : 'bg-muted'}`}>
          <Crosshair className={tracking ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm">Live GPS Tracking</h3>
          <p className="text-xs text-muted-foreground truncate">{activeJob.pickup_address} → {activeJob.dropoff_address}</p>
        </div>
        <Badge className={tracking ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}>
          {tracking ? 'Live' : 'Off'}
        </Badge>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 mb-3">
          {error}
        </div>
      )}

      {currentPos && (
        <div className="bg-muted/50 rounded-xl p-3 mb-3 flex items-center gap-2 text-sm">
          <MapPin size={14} className="text-muted-foreground shrink-0" />
          <span className="font-mono text-xs text-muted-foreground">
            {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
          </span>
          {lastPing && (
            <span className="text-xs text-muted-foreground ml-auto">
              Updated {lastPing.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-3">
        {tracking
          ? 'Your live location is being shared with the customer for this job. Keep this page open while driving.'
          : 'Start tracking to share your live location with the customer. They\'ll be able to see your position on the map in real-time.'}
      </p>

      <Button
        onClick={tracking ? stopTracking : startTracking}
        className={`w-full ${tracking ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
      >
        {tracking ? <><Pause size={16} className="mr-1" /> Stop Tracking</> : <><Play size={16} className="mr-1" /> Start Live Tracking</>}
      </Button>
    </div>
  );
}