import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Truck, Package, CheckCircle2 } from 'lucide-react';
import L from 'leaflet';

// Fix default marker icons for Leaflet in bundler environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Driver icon (blue truck marker)
const driverIcon = L.divIcon({
  html: `<div style="background:#3b82f6;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);">D</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const geocodeCache = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getCachedGeocode(address) {
  // Check in-memory cache first
  if (geocodeCache.has(address)) return geocodeCache.get(address);
  // Check sessionStorage
  try {
    const stored = sessionStorage.getItem('geocode_' + address);
    if (stored !== null) {
      const coords = stored === 'null' ? null : JSON.parse(stored);
      geocodeCache.set(address, coords);
      return coords;
    }
  } catch {}
  return undefined; // not cached
}

function setCachedGeocode(address, coords) {
  geocodeCache.set(address, coords);
  try {
    sessionStorage.setItem('geocode_' + address, coords ? JSON.stringify(coords) : 'null');
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

// Geocode addresses in parallel batches of 5 with 500ms delay between batches
async function geocodeBatch(addresses) {
  const results = [];
  const BATCH_SIZE = 5;
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(({ address }) => geocodeAddress(address)));
    for (let j = 0; j < batch.length; j++) {
      results.push({ ...batch[j], coords: batchResults[j] });
    }
    if (i + BATCH_SIZE < addresses.length) {
      await sleep(500);
    }
  }
  return results;
}

export default function AdminWorldMap() {
  const [moves, setMoves] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(true);
  const [movePins, setMovePins] = useState([]);
  const [driverPins, setDriverPins] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allMoves, allDrivers] = await Promise.all([
        base44.entities.MoveRequest.list('-created_date', 200),
        base44.entities.DriverProfile.list('-created_date', 100),
      ]);
      setMoves(allMoves);
      setDrivers(allDrivers);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Geocode moves
  useEffect(() => {
    if (moves.length === 0) {
      setMovePins([]);
      setGeocoding(false);
      return;
    }
    let cancelled = false;
    setGeocoding(true);
    (async () => {
      const addresses = moves.slice(0, 20)
        .filter(m => m.pickup_address)
        .map(m => ({ address: m.pickup_address, move: m }));
      const results = await geocodeBatch(addresses);
      if (cancelled) return;
      const pins = results
        .filter(r => r.coords)
        .map(r => ({
          id: r.move.id,
          coords: r.coords,
          address: r.address,
          customer: r.move.customer_name || 'Unknown',
          status: r.move.status,
          date: r.move.move_date,
          price: r.move.total_price,
          currency: r.move.currency,
        }));
      setMovePins(pins);
      setGeocoding(false);
    })();
    return () => { cancelled = true; };
  }, [moves]);

  // Geocode drivers
  useEffect(() => {
    if (drivers.length === 0) {
      setDriverPins([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const addresses = drivers.slice(0, 20)
        .filter(d => d.service_area)
        .map(d => ({ address: d.service_area, driver: d }));
      const results = await geocodeBatch(addresses);
      if (cancelled) return;
      const pins = results
        .filter(r => r.coords)
        .map(r => ({
          id: r.driver.id,
          coords: r.coords,
          name: r.driver.full_name,
          serviceArea: r.address,
          status: r.driver.status,
          rating: r.driver.rating,
          totalJobs: r.driver.total_jobs,
        }));
      setDriverPins(pins);
    })();
    return () => { cancelled = true; };
  }, [drivers]);

  // Red for new/pending clients, green for completed
  const getPinColor = (status) => {
    if (status === 'completed') return '#22c55e'; // green
    if (status === 'cancelled') return '#6b7280'; // gray
    return '#ef4444'; // red for new/pending/quoted/accepted/in_progress
  };

  const newClients = movePins.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
  const completedClients = movePins.filter(p => p.status === 'completed');

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin size={20} className="text-emerald-600" />
        <h2 className="font-display font-bold text-lg">Global Operations Map</h2>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span className="text-muted-foreground">New / Active Client ({newClients.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span className="text-muted-foreground">Completed ({completedClients.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
          <span className="text-muted-foreground">Driver ({driverPins.length})</span>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : (
        <div className="h-96 w-full rounded-xl overflow-hidden border">
          <MapContainer
            center={[39.8283, -98.5795]}
            zoom={3}
            className="h-full w-full"
            scrollWheelZoom={true}
            worldCopyJump={true}
            minZoom={2}
            maxBounds={[[-90, -180], [90, 180]]}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />

            {/* Client pins */}
            {movePins.map((pin) => {
              const color = getPinColor(pin.status);
              const isCompleted = pin.status === 'completed';
              return (
                <CircleMarker
                  key={`move-${pin.id}`}
                  center={pin.coords}
                  radius={isCompleted ? 7 : 8}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold mb-1"><span aria-hidden="true">{isCompleted ? '✅' : '🔴'}</span> {isCompleted ? 'Completed' : 'Active Client'}</p>
                      <p><strong>Customer:</strong> {pin.customer}</p>
                      <p><strong>Address:</strong> {pin.address}</p>
                      <p><strong>Status:</strong> {pin.status?.replace('_', ' ')}</p>
                      {pin.date && <p><strong>Date:</strong> {new Date(pin.date).toLocaleDateString()}</p>}
                      {pin.price > 0 && <p><strong>Price:</strong> ${(pin.price || 0).toFixed(2)} {pin.currency || 'USD'}</p>}
                    </div>
                  </Popup>
                  <Tooltip>
                    <span aria-hidden="true">{isCompleted ? '✅' : '🔴'}</span> {isCompleted ? 'Completed' : 'Active'} — {pin.customer}
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* Driver pins */}
            {driverPins.map((pin) => (
              <Marker
                key={`driver-${pin.id}`}
                position={pin.coords}
                icon={driverIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold mb-1"><span aria-hidden="true">🚚</span> Driver</p>
                    <p><strong>Name:</strong> {pin.name}</p>
                    <p><strong>Service Area:</strong> {pin.serviceArea}</p>
                    <p><strong>Status:</strong> {pin.status?.replace('_', ' ')}</p>
                    <p><strong>Rating:</strong> {(pin.rating || 5).toFixed(1)} ★</p>
                    <p><strong>Jobs:</strong> {pin.totalJobs || 0}</p>
                  </div>
                </Popup>
                <Tooltip>
                  <span aria-hidden="true">🚚</span> {pin.name} — {pin.serviceArea}
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {geocoding && !loading && (
        <div className="mt-2 flex items-center gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3" aria-live="polite">
          <Loader2 size={14} className="animate-spin text-blue-500" />
          <span className="text-sm text-blue-600 dark:text-blue-400">Geocoding addresses...</span>
        </div>
      )}

      {(moves.length > 20 || drivers.length > 20) && !loading && (
        <p className="text-xs text-muted-foreground mt-2">
          Showing up to 20 recent locations
        </p>
      )}

      {movePins.length === 0 && driverPins.length === 0 && !loading && !geocoding && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No location data available yet. Pins will appear as moves and drivers are added.
        </p>
      )}
    </div>
  );
}