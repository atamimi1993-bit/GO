import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, PackageCheck, Truck, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const MILESTONES = [
  { key: 'en_route_to_pickup', label: 'En route to pickup', icon: Navigation },
  { key: 'arrived_at_pickup', label: 'Arrived at pickup', icon: MapPin },
  { key: 'items_loaded', label: 'Items loaded', icon: PackageCheck },
  { key: 'en_route_to_dropoff', label: 'En route to dropoff', icon: Truck },
  { key: 'arrived_at_dropoff', label: 'Arrived at dropoff', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

export default function MoveTracker({ moveId }) {
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
  const path = pings.filter((p) => p.lat && p.lng).reverse().map((p) => [p.lat, p.lng]);
  const reachedMilestones = new Set(pings.map((p) => p.milestone));

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 bg-muted border-b font-medium text-sm flex items-center gap-2">
        <Navigation size={16} className="text-emerald-500" /> Live Tracking
      </div>

      {latestPing && latestPing.lat ? (
        <div className="h-64 w-full">
          <MapContainer
            center={[latestPing.lat, latestPing.lng]}
            zoom={13}
            className="h-full w-full"
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />
            {path.length > 1 && (
              <Polyline positions={path} pathOptions={{ color: '#10b981', weight: 3 }} />
            )}
            <CircleMarker
              center={[latestPing.lat, latestPing.lng]}
              radius={10}
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.8 }}
            >
              <Popup>Driver's current location</Popup>
            </CircleMarker>
          </MapContainer>
        </div>
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
                    reached ? 'bg-emerald-100' : 'bg-muted'
                  }`}
                >
                  <m.icon size={16} className={reached ? 'text-emerald-600' : 'text-muted-foreground'} />
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