import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Tooltip } from 'react-leaflet';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, DollarSign, Package, Truck } from 'lucide-react';
import L from 'leaflet';

// Fix default marker icons for Leaflet in bundler environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Driver icon (glass-style blue marker)
const driverIcon = L.divIcon({
  html: `<div style="background:linear-gradient(135deg,#3b82f6,#06b6d4);color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><span aria-hidden="true">🚚</span></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Sales icon (green with glow)
const salesIcon = L.divIcon({
  html: `<div style="background:linear-gradient(135deg,#22c55e,#10b981);color:#fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 0 12px rgba(34,197,94,0.5);">$</div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const geocodeCache = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getCachedGeocode(address) {
  if (geocodeCache.has(address)) return geocodeCache.get(address);
  try {
    const stored = sessionStorage.getItem('geocode_' + address);
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
  const [salesPins, setSalesPins] = useState([]);
  const [jobPins, setJobPins] = useState([]);
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

  // Geocode moves — split into sales (completed/paid) and active jobs
  useEffect(() => {
    if (moves.length === 0) {
      setSalesPins([]);
      setJobPins([]);
      setGeocoding(false);
      return;
    }
    let cancelled = false;
    setGeocoding(true);
    (async () => {
      const addresses = moves.slice(0, 30)
        .filter(m => m.pickup_address)
        .map(m => ({ address: m.pickup_address, move: m }));
      const results = await geocodeBatch(addresses);
      if (cancelled) return;
      const sales = [];
      const jobs = [];
      results
        .filter(r => r.coords)
        .forEach(r => {
          const pin = {
            id: r.move.id,
            coords: r.coords,
            address: r.address,
            customer: r.move.customer_name || 'Unknown',
            status: r.move.status,
            date: r.move.move_date,
            price: r.move.total_price,
            currency: r.move.currency,
            paid: r.move.paid,
          };
          if (r.move.status === 'completed' || r.move.paid) {
            sales.push(pin);
          }
          if (r.move.status !== 'completed' && r.move.status !== 'cancelled') {
            jobs.push(pin);
          }
        });
      setSalesPins(sales);
      setJobPins(jobs);
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

  // Amber for active jobs
  const getJobColor = (status) => {
    if (status === 'in_progress') return '#a855f7';
    if (status === 'accepted') return '#6366f1';
    return '#f59e0b';
  };

  const totalSalesRevenue = salesPins.reduce((sum, p) => sum + (p.price || 0), 0);

  return (
    <div className="glass-card rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <MapPin size={20} className="text-primary" />
        <h2 className="font-display font-bold text-lg">Global Operations Map</h2>
        <span className="ml-auto text-xs text-muted-foreground">Sales · Jobs · Drivers</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {salesPins.length} sales {totalSalesRevenue > 0 && `(${(totalSalesRevenue).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })})`} · {jobPins.length} active jobs · {driverPins.length} drivers
      </p>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: 'linear-gradient(135deg,#22c55e,#10b981)' }} />
          <span className="text-muted-foreground">Sales ({salesPins.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
          <span className="text-muted-foreground">Active Jobs ({jobPins.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)' }} />
          <span className="text-muted-foreground">Drivers ({driverPins.length})</span>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : (
        <div className="h-96 w-full rounded-xl overflow-hidden border border-border" role="img" aria-label={`Global operations map showing ${salesPins.length} sales, ${jobPins.length} active jobs, and ${driverPins.length} driver service areas`}>
          <MapContainer
            center={[39.8283, -98.5795]}
            zoom={3}
            className="h-full w-full"
            scrollWheelZoom={false}
            worldCopyJump={true}
            minZoom={2}
            maxBounds={[[-90, -180], [90, 180]]}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />

            {/* Sales pins (completed/paid moves) */}
            {salesPins.map((pin) => (
              <Marker
                key={`sale-${pin.id}`}
                position={pin.coords}
                icon={salesIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold mb-1"><span aria-hidden="true">💰</span> Sale</p>
                    <p><strong>Customer:</strong> {pin.customer}</p>
                    <p><strong>Address:</strong> {pin.address}</p>
                    <p><strong>Status:</strong> {pin.status?.replace('_', ' ')}</p>
                    {pin.date && <p><strong>Date:</strong> {new Date(pin.date).toLocaleDateString()}</p>}
                    {pin.price > 0 && <p><strong>Revenue:</strong> ${(pin.price || 0).toFixed(2)} {pin.currency || 'USD'}</p>}
                  </div>
                </Popup>
                <Tooltip>
                  <span><span aria-hidden="true">💰</span> {pin.customer} — ${(pin.price || 0).toFixed(0)}</span>
                </Tooltip>
              </Marker>
            ))}

            {/* Active job pins */}
            {jobPins.map((pin) => {
              const color = getJobColor(pin.status);
              return (
                <CircleMarker
                  key={`job-${pin.id}`}
                  center={pin.coords}
                  radius={8}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold mb-1"><span aria-hidden="true">📦</span> Active Job</p>
                      <p><strong>Customer:</strong> {pin.customer}</p>
                      <p><strong>Address:</strong> {pin.address}</p>
                      <p><strong>Status:</strong> {pin.status?.replace('_', ' ')}</p>
                      {pin.date && <p><strong>Date:</strong> {new Date(pin.date).toLocaleDateString()}</p>}
                      {pin.price > 0 && <p><strong>Price:</strong> ${(pin.price || 0).toFixed(2)} {pin.currency || 'USD'}</p>}
                    </div>
                  </Popup>
                  <Tooltip>
                    <span><span aria-hidden="true">📦</span> {pin.customer}</span>
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
                  <span><span aria-hidden="true">🚚</span> {pin.name}</span>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {geocoding && !loading && (
        <div className="mt-2 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3" aria-live="polite">
          <Loader2 size={14} className="animate-spin text-primary" />
          <span className="text-sm text-primary">Geocoding addresses...</span>
        </div>
      )}

      {(moves.length > 30 || drivers.length > 20) && !loading && (
        <p className="text-xs text-muted-foreground mt-2">
          Showing up to 30 recent move locations and 20 driver service areas
        </p>
      )}

      {salesPins.length === 0 && jobPins.length === 0 && driverPins.length === 0 && !loading && !geocoding && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No location data available yet. Pins will appear as moves and drivers are added.
        </p>
      )}
    </div>
  );
}