import React, { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/go/MobileSelect';
import { MapPin, Ruler, Loader2, Sparkles } from 'lucide-react';
import { COUNTRY_LIST, COUNTRY_CONFIG, CURRENCIES, US_STATES } from '@/lib/pricing';

const JOB_TYPES = [
  { value: 'residential', label: 'Residential Move' },
  { value: 'freight', label: 'Freight / Large-Scale Haul' },
  { value: 'corporate_logistics', label: 'Corporate Logistics' },
];

const geocodeCache = new Map();

async function geocodeAddress(address) {
  if (!address || address.trim().length < 5) return null;
  if (geocodeCache.has(address)) return geocodeCache.get(address);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const coords = data.length > 0 ? [parseFloat(data[0].lon), parseFloat(data[0].lat)] : null;
    geocodeCache.set(address, coords);
    return coords;
  } catch {
    geocodeCache.set(address, null);
    return null;
  }
}

export default function MoveDetailsStep({ form, setForm, handleCountryChange }) {
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const debounceRef = useRef(null);

  const autoFillDistanceAndTolls = useCallback(async (pickup, dropoff) => {
    if (!pickup || !dropoff || pickup.trim().length < 5 || dropoff.trim().length < 5) return;
    setAutoFilling(true);
    try {
      const [pickupCoord, dropoffCoord] = await Promise.all([
        geocodeAddress(pickup),
        geocodeAddress(dropoff),
      ]);

      if (!pickupCoord || !dropoffCoord) {
        setAutoFilling(false);
        return;
      }

      // OSRM routing API — returns driving distance in meters
      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickupCoord[0]},${pickupCoord[1]};${dropoffCoord[0]},${dropoffCoord[1]}?overview=false`
      );
      const routeData = await routeRes.json();

      if (routeData.routes && routeData.routes.length > 0) {
        const distanceMeters = routeData.routes[0].distance;
        const distanceMiles = distanceMeters / 1609.34;

        // Convert to the selected unit
        const distanceValue = form.distance_unit === 'km'
          ? Math.round((distanceMiles * 1.60934) * 10) / 10
          : Math.round(distanceMiles * 10) / 10;

        // Estimate tolls: ~$0.06/mile average for US, scaled by country
        const tollPerMile = form.country_code === 'US' ? 0.06 : form.country_code === 'CA' ? 0.05 : 0.03;
        const estimatedTolls = distanceMiles > 5 ? Math.round(distanceMiles * tollPerMile * 100) / 100 : 0;

        setForm(f => ({
          ...f,
          distance_miles: distanceValue.toString(),
          tolls: estimatedTolls > 0 ? estimatedTolls.toFixed(2) : '',
        }));
        setAutoFilled(true);
      }
    } catch {
      // Silently fail — user can enter manually
    }
    setAutoFilling(false);
  }, [form.distance_unit, form.country_code, setForm]);

  const handleAddressBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      autoFillDistanceAndTolls(form.pickup_address, form.dropoff_address);
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">About Your Move</h2>
        <p className="text-muted-foreground text-sm">Where are you moving from and to?</p>
      </div>
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div>
          <Label>Job Type</Label>
          <MobileSelect
            value={form.job_type}
            onValueChange={v => setForm({ ...form, job_type: v })}
            options={JOB_TYPES}
            placeholder="Select job type"
          />
        </div>
        <div>
          <Label className="flex items-center gap-2"><MapPin size={14} /> Pickup Address</Label>
          <Input
            value={form.pickup_address}
            onChange={e => { setForm({ ...form, pickup_address: e.target.value }); setAutoFilled(false); }}
            onBlur={handleAddressBlur}
            placeholder="123 Main St, City, Country"
          />
        </div>
        {form.country_code === 'US' && (
          <div>
            <Label>Pickup State (for tax calculation)</Label>
            <MobileSelect
              value={form.pickup_state}
              onValueChange={v => setForm({ ...form, pickup_state: v })}
              options={US_STATES.map(s => ({ value: s.code, label: `${s.code} — ${s.name}` }))}
              placeholder="Select your state"
            />
          </div>
        )}
        <div>
          <Label className="flex items-center gap-2"><MapPin size={14} /> Drop-off Address</Label>
          <Input
            value={form.dropoff_address}
            onChange={e => { setForm({ ...form, dropoff_address: e.target.value }); setAutoFilled(false); }}
            onBlur={handleAddressBlur}
            placeholder="456 Oak Ave, City, Country"
          />
        </div>

        {autoFilling && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <Loader2 size={14} className="animate-spin" />
            Calculating driving distance and tolls...
          </div>
        )}
        {autoFilled && !autoFilling && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <Sparkles size={14} />
            Distance and tolls auto-filled based on your route.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2"><Ruler size={14} /> Distance ({form.distance_unit})</Label>
            <Input
              type="number"
              placeholder="e.g. 25"
              value={form.distance_miles}
              onChange={e => setForm({ ...form, distance_miles: e.target.value })}
            />
          </div>
          <div>
            <Label>Tolls {autoFilled ? '(estimated)' : '(optional)'}</Label>
            <Input
              type="number"
              placeholder="e.g. 15.00"
              value={form.tolls}
              onChange={e => setForm({ ...form, tolls: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Country</Label>
            <MobileSelect
              value={form.country_code}
              onValueChange={handleCountryChange}
              options={COUNTRY_LIST.map(c => ({ value: c.code, label: c.name }))}
              placeholder="Select country"
            />
          </div>
          <div>
            <Label>Currency</Label>
            <MobileSelect
              value={form.currency}
              onValueChange={v => setForm({ ...form, currency: v })}
              options={Object.keys(CURRENCIES).sort().map(c => ({ value: c, label: `${c} (${CURRENCIES[c].symbol.trim()})` }))}
              placeholder="Select currency"
            />
          </div>
          <div>
            <Label>Distance Unit</Label>
            <MobileSelect
              value={form.distance_unit}
              onValueChange={v => setForm({ ...form, distance_unit: v })}
              options={[{ value: 'mi', label: 'Miles (mi)' }, { value: 'km', label: 'Kilometers (km)' }]}
              placeholder="Select unit"
            />
          </div>
        </div>
      </div>
    </div>
  );
}