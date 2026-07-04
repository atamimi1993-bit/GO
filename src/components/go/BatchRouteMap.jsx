import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker, Tooltip } from 'react-leaflet';
import { Loader2, MapPin } from 'lucide-react';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const geocodeCache = new Map();

function getCachedGeocode(address) {
  if (geocodeCache.has(address)) return geocodeCache.get(address);
  try {
    const stored = sessionStorage.getItem('batch_geocode_' + address);
    if (stored !== null) {
      const coords = stored === 'null' ? null : JSON.parse(stored);
      geocodeCache.set(address, coords);
      return coords;
    }
  } catch {}
  return undefined;
}

function setCachedGeocode(address, coords) {
  geocodeCache.set(address, coords);
  try {
    sessionStorage.setItem('batch_geocode_' + address, coords ? JSON.stringify(coords) : 'null');
  } catch {}
}

async function geocodeAddress(address) {
  if (!address || address.trim().length < 3) return null;
  const cached = getCachedGeocode(address);
  if (cached !== undefined) return cached;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const coords = data.length > 0 ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
    setCachedGeocode(address, coords);
    return coords;
  } catch {
    setCachedGeocode(address, null);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeStopIcon(stopNumber, isPickup) {
  const bg = isPickup ? '#7c3aed' : '#10b981';
  return L.divIcon({
    html: `<div style="background:${bg};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${stopNumber}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const ROUTE_COLORS = {
  stop1: '#7c3aed',
  stop2: '#10b981',
  travel: '#94a3b8',
};

export default function BatchRouteMap({ jobs }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);

  const geocodeJobs = useCallback(async () => {
    const sorted = [...jobs].sort((a, b) => (a.batch_stop_order || 0) - (b.batch_stop_order || 0));
    const allStops = [];
    for (const job of sorted) {
      allStops.push({ job, address: job.pickup_address, type: 'pickup', stopOrder: job.batch_stop_order || 1 });
      allStops.push({ job, address: job.dropoff_address, type: 'dropoff', stopOrder: job.batch_stop_order || 1 });
    }

    const results = [];
    const BATCH_SIZE = 4;
    for (let i = 0; i < allStops.length; i += BATCH_SIZE) {
      const batch = allStops.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map((s) => geocodeAddress(s.address)));
      for (let j = 0; j < batch.length; j++) {
        results.push({ ...batch[j], coords: batchResults[j] });
      }
      if (i + BATCH_SIZE < allStops.length) await sleep(400);
    }
    setStops(results);
    setLoading(false);
  }, [jobs]);

  useEffect(() => {
    geocodeJobs();
  }, [geocodeJobs]);

  const geocodedStops = useMemo(() => stops.filter((s) => s.coords), [stops]);

  const routePath = useMemo(() => {
    const sorted = [...geocodedStops].sort((a, b) => {
      const stopDiff = (a.stopOrder || 1) - (b.stopOrder || 1);
      if (stopDiff !== 0) return stopDiff;
      // pickup before dropoff within same stop
      return a.type === 'pickup' ? -1 : 1;
    });
    return sorted.map((s) => s.coords);
  }, [geocodedStops]);

  const mapCenter = useMemo(() => {
    if (routePath.length > 0) return routePath[0];
    return [39.8283, -98.5795]; // US center
  }, [routePath]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted/30 rounded-2xl">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-violet-500" size={24} />
          <p className="text-xs text-muted-foreground">Optimizing route...</p>
        </div>
      </div>
    );
  }

  if (geocodedStops.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center bg-muted/30 rounded-2xl">
        <MapPin className="text-muted-foreground mb-2" size={24} />
        <p className="text-sm text-muted-foreground">Unable to map these addresses.</p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full rounded-2xl overflow-hidden border" role="region" aria-label="Optimized batch route map">
      <MapContainer
        center={mapCenter}
        zoom={11}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />

        {/* Route polyline connecting all stops in order */}
        {routePath.length > 1 && (
          <>
            <Polyline
              positions={routePath}
              pathOptions={{ color: ROUTE_COLORS.travel, weight: 4, opacity: 0.6, dashArray: '8 6' }}
            />
            <Polyline
              positions={routePath}
              pathOptions={{ color: ROUTE_COLORS.stop1, weight: 2, opacity: 0.9 }}
            />
          </>
        )}

        {/* Stop markers */}
        {geocodedStops.map((stop, idx) => {
          const stopNumber = stop.type === 'pickup' ? (stop.stopOrder || 1) * 2 - 1 : (stop.stopOrder || 1) * 2;
          const icon = makeStopIcon(stopNumber, stop.type === 'pickup');
          return (
            <Marker key={`${stop.job.id}-${stop.type}-${idx}`} position={stop.coords} icon={icon}>
              <Popup>
                <div style={{ minWidth: '150px' }}>
                  <p style={{ fontWeight: 700, margin: '0 0 4px', color: stop.type === 'pickup' ? ROUTE_COLORS.stop1 : ROUTE_COLORS.stop2 }}>
                    Stop {stop.stopOrder} — {stop.type === 'pickup' ? 'Pickup' : 'Drop-off'}
                  </p>
                  <p style={{ fontSize: '12px', margin: '0 0 4px', color: '#6b7280' }}>{stop.address}</p>
                  <p style={{ fontSize: '12px', margin: '0' }}>
                    {stop.job.move_date} at {stop.job.move_time || 'TBD'}
                  </p>
                </div>
              </Popup>
              <Tooltip>
                Stop {stop.stopOrder} {stop.type === 'pickup' ? 'Pickup' : 'Drop-off'}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}