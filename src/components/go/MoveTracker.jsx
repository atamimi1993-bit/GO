import React, { useState, useEffect } from 'react';
import { useLeafletCss } from '@/hooks/useLeafletCss';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import { Navigation, MapPin, PackageCheck, Truck, CheckCircle2, Loader2, Flag } from 'lucide-react';
import { format } from 'date-fns';

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

const MILESTONES = [
  { key: 'en_route_to_pickup', label: 'En route to pickup', icon: Navigation },
  { key: 'arrived_at_pickup', label: 'Arrived at pickup', icon: MapPin },
  { key: 'items_loaded', label: 'Items loaded', icon: PackageCheck },
  { key: 'en_route_to_dropoff', label: 'En route to dropoff', icon: Truck },
  { key: 'arrived_at_dropoff', label: 'Arrived at dropoff', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

export default function MoveTracker({ moveId }) {
  useLeafletCss();
  const [pings, setPings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.LocationPing.filter({ move_request_id: moveId }, '-created_date', 100)
      .then(setPings)
      .finally(() => setLoading(false));

    const unsub = base44.entities.LocationPing.subscribe((event) => {
      if (event.type === 'create') {
        setPings((prev) => [event.data, ...prev].slice(0, 100));
      }
    });
    return unsub;
  }, [moveId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  const latestPing = pings[0];
  const validPings = pings.filter((p) => p.lat && p.lng);
  const path = validPings.slice().reverse().map((p) => [p.lat, p.lng]);
  const startPing = path[0];
  const endPing = path[path.length - 1];
  const reachedMilestones = new Set(pings.map((p) => p.milestone));
  const isDelivered = reachedMilestones.has('delivered');

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 bg-muted border-b font-medium text-sm flex items-center gap-2">
        <Navigation size={16} className="text-emerald-500" /> Live Tracking
      </div>

      <div aria-live="polite" aria-atomic="false" className="sr-only">
        {latestPing
          ? `Driver milestone: ${MILESTONES.find(m => m.key === latestPing.milestone)?.label || latestPing.milestone}. Driver coordinates: ${latestPing.lat.toFixed(2)}, ${latestPing.lng.toFixed(2)}. Last updated ${format(new Date(latestPing.created_date), 'MMM d, h:mm a')}.`
          : 'No driver location available yet.'}
      </div>

      {latestPing && latestPing.lat ? (
        <>
        <div role="region" aria-label="Live driver tracking map" tabIndex={0} className="h-64 w-full">
          <MapContainer
            center={[latestPing.lat, latestPing.lng]}
            zoom={13}
            className="h-full w-full"
            scrollWheelZoom={false}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={false}
            aria-hidden={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />
            <FitBounds positions={path} />
            {path.length > 1 && (
              <Polyline positions={path} pathOptions={{ color: '#10b981', weight: 3 }} />
            )}
            {startPing && (
              <CircleMarker
                center={startPing}
                radius={8}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.8 }}
              >
                <Popup>Driver started here — after accepting the request</Popup>
              </CircleMarker>
            )}
            {endPing && endPing !== startPing && (
              <CircleMarker
                center={endPing}
                radius={isDelivered ? 10 : 8}
                pathOptions={{
                  color: isDelivered ? '#10b981' : '#f59e0b',
                  fillColor: isDelivered ? '#10b981' : '#f59e0b',
                  fillOpacity: 0.8,
                }}
              >
                <Popup>{isDelivered ? 'Job completed — final location' : "Driver's current location"}</Popup>
              </CircleMarker>
            )}
          </MapContainer>
        </div>
        <div aria-live="polite" className="sr-only">
          {latestPing ? `Driver is at coordinates ${latestPing.lat.toFixed(4)}, ${latestPing.lng.toFixed(4)}. Last updated ${format(new Date(latestPing.created_date), 'MMM d, h:mm a')}.` : 'No driver location available yet.'}
        </div>
        <div className="px-5 pt-3">
          <a
            href={"https://www.google.com/maps?q=" + latestPing.lat + "," + latestPing.lng}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            <MapPin size={14} /> Open in Maps
          </a>
        </div>
        </>
      ) : (
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          Tracking will appear here once the driver starts the move.
        </div>
      )}

      <div className="p-5">
        <div className="space-y-3">
          {MILESTONES.map((m) => {
            const reached = reachedMilestones.has(m.key);
            const ping = pings.find((p) => p.milestone === m.key);
            return (
              <div key={m.key} className={`flex items-center gap-3 ${reached ? '' : 'opacity-40'}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    reached ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-muted'
                  }`}
                >
                  <m.icon size={16} className={reached ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.label}</p>
                  {ping && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ping.created_date), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}