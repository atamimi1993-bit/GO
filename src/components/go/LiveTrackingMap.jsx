import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const MILESTONE_LABELS = {
  en_route_to_pickup: 'En route to pickup',
  arrived_at_pickup: 'Arrived at pickup',
  items_loaded: 'Items loaded',
  en_route_to_dropoff: 'En route to dropoff',
  arrived_at_dropoff: 'Arrived at dropoff',
  delivered: 'Delivered',
};

export default function LiveTrackingMap({ move }) {
  const [pings, setPings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.LocationPing.filter({ move_request_id: move.id }, '-created_date', 100)
      .then(setPings)
      .finally(() => setLoading(false));

    const unsub = base44.entities.LocationPing.subscribe((event) => {
      if (event.type === 'create' && event.data.move_request_id === move.id) {
        setPings((prev) => [event.data, ...prev].slice(0, 100));
      }
    });
    return unsub;
  }, [move.id]);

  const latestPing = pings[0];
  const path = useMemo(
    () => pings.filter((p) => p.lat && p.lng).reverse().map((p) => [p.lat, p.lng]),
    [pings]
  );

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between">
        <span className="font-medium text-sm flex items-center gap-2">
          <Navigation size={16} className="text-emerald-500" />
          Live Driver Location
        </span>
        {latestPing && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={12} />
            {format(new Date(latestPing.created_date), 'MMM d, h:mm a')}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : latestPing && latestPing.lat ? (
        <>
          <div className="h-56 w-full" role="region" aria-label="Live driver tracking map">
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
                <Popup>
                  Driver — {MILESTONE_LABELS[latestPing.milestone] || latestPing.milestone}
                </Popup>
              </CircleMarker>
            </MapContainer>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {move.assigned_driver_name || 'Driver assigned'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {MILESTONE_LABELS[latestPing.milestone] || latestPing.milestone}
              </p>
            </div>
            <a
              href={`https://www.google.com/maps?q=${latestPing.lat},${latestPing.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 min-h-[44px]"
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

      <div className="px-5 pb-4">
        <Link
          to={`/move/${move.id}`}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View full move details →
        </Link>
      </div>
    </div>
  );
}