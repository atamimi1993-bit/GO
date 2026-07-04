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
  html: `<div style="background:#3b82f6;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);">🚚</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const geocodeCache = new Map();

async function geocodeAddress(address) {
  if (!address || address.trim().length < 3) return null;
  if (geocodeCache.has(address)) return geocodeCache.get(address);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const coords = data.length > 0 ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
    geocodeCache.set(address, coords);
    return coords;
  } catch {
    geocodeCache.set(address, null);
    return null;
  }
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
      const pins = [];
      for (const m of moves.slice(0, 30)) {
        if (cancelled) return;
        const addr = m.pickup_address;
        if (!addr) continue;
        const coords = await geocodeAddress(addr);
        if (coords) {
          pins.push({
            id: m.id,
            coords,
            address: addr,
            customer: m.customer_name || 'Unknown',
            status: m.status,
            date: m.move_date,
            price: m.total_price,
            currency: m.currency,
          });
        }
      }
      if (!cancelled) {
        setMovePins(pins);
        setGeocoding(false);
      }
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
      const pins = [];
      for (const d of drivers.slice(0, 20)) {
        if (cancelled) return;
        const area = d.service_area;
        if (!area) continue;
        const coords = await geocodeAddress(area);
        if (coords) {
          pins.push({
            id: d.id,
            coords,
            name: d.full_name,
            serviceArea: area,
            status: d.status,
            rating: d.rating,
            totalJobs: d.total_jobs,
          });
        }
      }
      if (!cancelled) setDriverPins(pins);
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
          <span className="text-base leading-none">🚚</span>
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
                      <p className="font-bold mb-1">{isCompleted ? '✅ Completed' : '🔴 Active Client'}</p>
                      <p><strong>Customer:</strong> {pin.customer}</p>
                      <p><strong>Address:</strong> {pin.address}</p>
                      <p><strong>Status:</strong> {pin.status?.replace('_', ' ')}</p>
                      {pin.date && <p><strong>Date:</strong> {new Date(pin.date).toLocaleDateString()}</p>}
                      {pin.price > 0 && <p><strong>Price:</strong> ${(pin.price || 0).toFixed(2)} {pin.currency || 'USD'}</p>}
                    </div>
                  </Popup>
                  <Tooltip>
                    {isCompleted ? '✅ Completed' : '🔴 Active'} — {pin.customer}
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
                    <p className="font-bold mb-1">🚚 Driver</p>
                    <p><strong>Name:</strong> {pin.name}</p>
                    <p><strong>Service Area:</strong> {pin.serviceArea}</p>
                    <p><strong>Status:</strong> {pin.status?.replace('_', ' ')}</p>
                    <p><strong>Rating:</strong> {(pin.rating || 5).toFixed(1)} ★</p>
                    <p><strong>Jobs:</strong> {pin.totalJobs || 0}</p>
                  </div>
                </Popup>
                <Tooltip>
                  🚚 {pin.name} — {pin.serviceArea}
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {geocoding && !loading && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Geocoding addresses...
        </p>
      )}

      {(moves.length > 30 || drivers.length > 20) && !loading && (
        <p className="text-xs text-muted-foreground mt-2">
          Showing up to 30 recent locations
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