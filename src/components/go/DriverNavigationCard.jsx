import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Navigation, MapPin, Flag, Loader2, ExternalLink, Smartphone } from 'lucide-react';

const GEOCACHE_PREFIX = 'go_geocode_';

async function geocodeWithCache(address) {
  if (!address || address.trim().length < 3) return null;
  const key = GEOCACHE_PREFIX + address;
  try {
    const cached = sessionStorage.getItem(key);
    if (cached !== null) return cached === 'null' ? null : JSON.parse(cached);
  } catch {}
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const coords = data.length > 0 ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
    try { sessionStorage.setItem(key, coords ? JSON.stringify(coords) : 'null'); } catch {}
    return coords;
  } catch {
    return null;
  }
}

// Fix default marker icons for Leaflet in bundler environments
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [50, 50] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 14);
    }
  }, [positions, map]);
  return null;
}

export default function DriverNavigationCard({ job }) {
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [geocoding, setGeocoding] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!job?.pickup_address || !job?.dropoff_address) {
        setGeocoding(false);
        return;
      }
      try {
        const [pickupCoordsResult, dropoffCoordsResult] = await Promise.all([
          geocodeWithCache(job.pickup_address),
          geocodeWithCache(job.dropoff_address),
        ]);
        if (cancelled) return;
        if (pickupCoordsResult) setPickupCoords(pickupCoordsResult);
        if (dropoffCoordsResult) setDropoffCoords(dropoffCoordsResult);
      } catch {}
      setGeocoding(false);
    })();
    return () => { cancelled = true; };
  }, [job?.pickup_address, job?.dropoff_address]);

  const pickup = job?.pickup_address || '';
  const dropoff = job?.dropoff_address || '';

  // External map app deep links
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(dropoff)}&travelmode=driving`;
  const appleMapsUrl = `https://maps.apple.com/?saddr=${encodeURIComponent(pickup)}&daddr=${encodeURIComponent(dropoff)}&dirflg=d`;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(dropoff)}&navigate=yes`;

  const mapApps = [
    { name: 'Google Maps', url: googleMapsUrl, color: 'bg-blue-500 hover:bg-blue-600', icon: '🗺️', ariaLabel: 'Open route in Google Maps' },
    { name: 'Apple Maps', url: appleMapsUrl, color: 'bg-gray-700 hover:bg-gray-800', icon: '🍎', ariaLabel: 'Open route in Apple Maps' },
    { name: 'Waze', url: wazeUrl, color: 'bg-cyan-500 hover:bg-cyan-600', icon: '🚗', ariaLabel: 'Open route in Waze' },
  ];
  // Map emoji icons to accessible JSX (emoji hidden from screen readers, sr-only label provided)
  const renderAppIcon = (app) => (
    <>
      <span aria-hidden="true" className="text-xl">{app.icon}</span>
      <span className="sr-only">{app.name}</span>
    </>
  );

  const hasCoords = pickupCoords && dropoffCoords;
  const routePath = hasCoords ? [pickupCoords, dropoffCoords] : [];

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 bg-emerald-500/10 border-b font-medium text-sm flex items-center gap-2">
        <Navigation size={16} className="text-emerald-600" /> Route Navigation
      </div>

      {/* In-app map */}
      <div className="h-64 w-full bg-muted" aria-label={`Pickup: ${pickup} to Dropoff: ${dropoff}`}>
        {geocoding ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin mb-2" size={24} />
            <p className="text-xs">Loading map...</p>
          </div>
        ) : hasCoords ? (
          <MapContainer
            center={pickupCoords}
            zoom={13}
            className="h-full w-full"
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />
            <FitBounds positions={routePath} />
            <Marker position={pickupCoords}>
              <Popup><strong>Pickup:</strong><br />{pickup}</Popup>
            </Marker>
            <Marker position={dropoffCoords}>
              <Popup><strong>Dropoff:</strong><br />{dropoff}</Popup>
            </Marker>
            {routePath.length === 2 && (
              <Polyline positions={routePath} pathOptions={{ color: '#10b981', weight: 4, dashArray: '8 8' }} />
            )}
          </MapContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <MapPin className="text-muted-foreground mb-2" size={28} />
            <p className="text-sm text-muted-foreground mb-3">Couldn't load map preview.</p>
            <p className="text-xs text-muted-foreground">Use a navigation app below for turn-by-turn directions.</p>
          </div>
        )}
      </div>

      {/* Addresses */}
      <div className="px-5 py-4 space-y-2 border-b">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin size={12} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">PICKUP</p>
            <p className="text-sm">{pickup}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Flag size={12} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">DROPOFF</p>
            <p className="text-sm">{dropoff}</p>
          </div>
        </div>
      </div>

      {/* Map app switcher */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
          <Smartphone size={16} /> Open in navigation app:
        </div>
        <div className="grid grid-cols-3 gap-2">
          {mapApps.map((app) => (
            <a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={app.ariaLabel}
              className={`flex flex-col items-center gap-1.5 ${app.color} text-white rounded-xl py-3 px-2 transition-colors`}
            >
              {renderAppIcon(app)}
              <span className="text-xs font-semibold">{app.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}