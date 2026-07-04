import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import MobileSelect from '@/components/go/MobileSelect';
import PriceBreakdown from '@/components/go/PriceBreakdown';
import { useToast } from '@/components/ui/use-toast';
import { calculateMovePrice, recommendTruckSize, TRUCK_SIZE_LABELS, COUNTRY_LIST, COUNTRY_CONFIG, CURRENCIES } from '@/lib/pricing';
import { Building2, Truck, Package, MapPin, Calendar, Loader2, Briefcase, Boxes, CheckCircle2 } from 'lucide-react';

const BUSINESS_TYPES = [
  { value: 'local_business', label: 'Local Business', icon: Store },
  { value: 'corporation', label: 'Big Corporation', icon: Building2 },
  { value: 'freight_carrier', label: 'Freight / Logistics', icon: Truck },
];

const JOB_TYPES = [
  { value: 'commercial', label: 'Commercial Move', desc: 'Office furniture, equipment, fixtures' },
  { value: 'freight', label: 'Freight Delivery', desc: 'Pallets, bulk goods, materials' },
  { value: 'corporate_relocation', label: 'Corporate Relocation', desc: 'Employee or office relocation' },
];

function Store(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7l-5 5-1.5-1.5L14 12l-2 2-2-2-1.5 1.5L3 12Z" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

export default function BusinessPortal() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [truckSize, setTruckSize] = useState('large');

  const [form, setForm] = useState({
    business_name: '',
    business_type: 'local_business',
    job_type: 'commercial',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    pickup_address: '',
    dropoff_address: '',
    move_date: '',
    move_time: '',
    distance_miles: '',
    country_code: 'US',
    currency: 'USD',
    distance_unit: 'mi',
    total_weight_lbs: '',
    items_summary: '',
    notes: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setForm(f => ({ ...f, contact_name: u.full_name || '', contact_email: u.email || '' }));
    }).catch(() => {});
  }, []);

  const handleCountryChange = (code) => {
    const cfg = COUNTRY_CONFIG[code];
    setForm(f => ({ ...f, country_code: code, currency: cfg?.currency || 'USD', distance_unit: cfg?.distanceUnit || 'mi' }));
  };

  const handleCalculate = () => {
    const weight = Number(form.total_weight_lbs) || 0;
    const rec = recommendTruckSize(weight);
    setTruckSize(rec);
    const price = calculateMovePrice({
      totalWeightLbs: weight,
      distanceMiles: Number(form.distance_miles),
      truckSize: rec,
      countryCode: form.country_code,
      currency: form.currency,
      distanceUnit: form.distance_unit,
    });
    setPricing(price);
  };

  const handleSubmit = async () => {
    if (!form.business_name || !form.pickup_address || !form.dropoff_address || !form.move_date || !form.distance_miles) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const moveData = {
        business_name: form.business_name,
        business_type: form.business_type,
        job_type: form.job_type,
        customer_name: form.contact_name,
        customer_email: form.contact_email,
        customer_phone: form.contact_phone,
        pickup_address: form.pickup_address,
        dropoff_address: form.dropoff_address,
        move_date: form.move_date,
        move_time: form.move_time,
        distance_miles: Number(form.distance_miles),
        distance_unit: form.distance_unit,
        country_code: form.country_code,
        currency: form.currency,
        truck_size_needed: truckSize,
        total_weight_lbs: Number(form.total_weight_lbs) || 0,
        items_summary: form.items_summary,
        notes: form.notes,
        liability_signed: true,
        liability_signed_date: new Date().toISOString(),
        status: 'pending',
      };
      if (pricing) {
        moveData.base_cost = pricing.baseCost;
        moveData.fuel_cost = pricing.fuelCost;
        moveData.tax_rate = pricing.taxRate;
        moveData.tax_amount = pricing.taxAmount;
        moveData.app_fee = pricing.appFee;
        moveData.driver_fee = pricing.driverFee;
        moveData.total_price = pricing.totalPrice;
        moveData.driver_payout = pricing.driverPayout;
      }
      await base44.entities.MoveRequest.create(moveData);
      toast({ title: 'Job posted!', description: 'Certified drivers will see your job and can accept it immediately.' });
      navigate('/my-moves');
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const selectedBizType = BUSINESS_TYPES.find(b => b.value === form.business_type);
  const selectedJobType = JOB_TYPES.find(j => j.value === form.job_type);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Briefcase className="text-blue-600 dark:text-blue-400" size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Business & Freight Portal</h1>
            <p className="text-muted-foreground text-sm">Post commercial jobs and freight deliveries — certified drivers accept and fulfill them.</p>
          </div>
        </div>
      </div>

      {/* Business Type Selector */}
      <div className="mb-6">
        <Label className="mb-2 block">Business Type</Label>
        <div className="grid grid-cols-3 gap-3">
          {BUSINESS_TYPES.map(bt => {
            const Icon = bt.icon;
            const active = form.business_type === bt.value;
            return (
              <button
                key={bt.value}
                onClick={() => setForm({ ...form, business_type: bt.value })}
                aria-pressed={active}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[88px] ${
                  active
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-border bg-card hover:border-blue-300'
                }`}
              >
                <Icon size={24} className={active ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'} />
                <span className={`text-xs font-medium text-center ${active ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>{bt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-card border rounded-2xl p-6 space-y-4 mb-6">
        <div>
          <Label>Business / Company Name</Label>
          <Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="Acme Corp" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Contact Name</Label>
            <Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="John Smith" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="john@acme.com" />
          </div>
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="+1 (555) 123-4567" />
        </div>
      </div>

      {/* Job Type Selector */}
      <div className="mb-6">
        <Label className="mb-2 block">Job Type</Label>
        <div className="space-y-2">
          {JOB_TYPES.map(jt => {
            const active = form.job_type === jt.value;
            return (
              <button
                key={jt.value}
                onClick={() => setForm({ ...form, job_type: jt.value })}
                aria-pressed={active}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  active ? 'border-blue-500 bg-blue-500/5' : 'border-border bg-card hover:border-blue-300'
                }`}
              >
                <div className="text-left">
                  <p className={`text-sm font-medium ${active ? 'text-blue-600 dark:text-blue-400' : ''}`}>{jt.label}</p>
                  <p className="text-xs text-muted-foreground">{jt.desc}</p>
                </div>
                {active && <CheckCircle2 size={20} className="text-blue-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logistics */}
      <div className="bg-card border rounded-2xl p-6 space-y-4 mb-6">
        <div>
          <Label className="flex items-center gap-2"><MapPin size={14} className="text-blue-500" /> Pickup Address</Label>
          <Input value={form.pickup_address} onChange={e => setForm({ ...form, pickup_address: e.target.value })} placeholder="Warehouse / Office address" />
        </div>
        <div>
          <Label className="flex items-center gap-2"><MapPin size={14} className="text-red-400" /> Drop-off Address</Label>
          <Input value={form.dropoff_address} onChange={e => setForm({ ...form, dropoff_address: e.target.value })} placeholder="Delivery destination" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="flex items-center gap-2"><Calendar size={14} /> Date</Label>
            <Input type="date" value={form.move_date} onChange={e => setForm({ ...form, move_date: e.target.value })} />
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={form.move_time} onChange={e => setForm({ ...form, move_time: e.target.value })} />
          </div>
          <div>
            <Label>Distance ({form.distance_unit})</Label>
            <Input type="number" placeholder="e.g. 45" value={form.distance_miles} onChange={e => setForm({ ...form, distance_miles: e.target.value })} />
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

      {/* Cargo Details */}
      <div className="bg-card border rounded-2xl p-6 space-y-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2"><Boxes size={14} /> Total Weight (lbs)</Label>
            <Input type="number" placeholder="e.g. 5000" value={form.total_weight_lbs} onChange={e => setForm({ ...form, total_weight_lbs: e.target.value })} />
          </div>
          <div>
            <Label className="flex items-center gap-2"><Package size={14} /> Truck Size</Label>
            <MobileSelect
              value={truckSize}
              onValueChange={v => {
                setTruckSize(v);
                if (pricing) {
                  setPricing(calculateMovePrice({
                    totalWeightLbs: Number(form.total_weight_lbs) || 0,
                    distanceMiles: Number(form.distance_miles),
                    truckSize: v,
                    countryCode: form.country_code,
                    currency: form.currency,
                    distanceUnit: form.distance_unit,
                  }));
                }
              }}
              options={Object.entries(TRUCK_SIZE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
          </div>
        </div>
        <div>
          <Label>Cargo / Items Summary</Label>
          <Textarea
            value={form.items_summary}
            onChange={e => setForm({ ...form, items_summary: e.target.value })}
            placeholder="e.g. 20 pallets of office supplies, 10 desks, conference room equipment..."
            rows={3}
          />
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <Textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Loading dock access, forklift needed, time-sensitive delivery, etc."
            rows={2}
          />
        </div>
      </div>

      {/* Quote */}
      <div className="mb-6">
        {!pricing ? (
          <div className="text-center py-6">
            <Button onClick={handleCalculate} size="lg" className="bg-blue-600 hover:bg-blue-700">
              Get Quote
            </Button>
          </div>
        ) : (
          <>
            <PriceBreakdown pricing={pricing} truckSize={truckSize} currencyCode={form.currency} />
          </>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {saving ? <><Loader2 size={16} className="mr-1 animate-spin" /> Posting Job...</> : <><Briefcase size={16} className="mr-1" /> Post Job</>}
        </Button>
      </div>

      {/* Info banner */}
      <div className="mt-6 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Truck size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">How it works</p>
            <p className="text-xs text-muted-foreground mt-1">Once posted, your job appears instantly in the driver dispatch feed. Certified drivers in your area accept and fulfill the job — you'll see real-time tracking and status updates as the delivery progresses.</p>
          </div>
        </div>
      </div>
    </div>
  );
}