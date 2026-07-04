import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/go/MobileSelect';
import { MapPin, Ruler } from 'lucide-react';
import { COUNTRY_LIST, COUNTRY_CONFIG, CURRENCIES, US_STATES } from '@/lib/pricing';

const JOB_TYPES = [
  { value: 'residential', label: 'Residential Move' },
  { value: 'freight', label: 'Freight / Large-Scale Haul' },
  { value: 'corporate_logistics', label: 'Corporate Logistics' },
];

export default function MoveDetailsStep({ form, setForm, handleCountryChange }) {
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
            onChange={e => setForm({ ...form, pickup_address: e.target.value })}
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
            onChange={e => setForm({ ...form, dropoff_address: e.target.value })}
            placeholder="456 Oak Ave, City, Country"
          />
        </div>
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
            <Label>Tolls (optional)</Label>
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