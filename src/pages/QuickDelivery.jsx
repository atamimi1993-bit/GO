import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, MapPin, Package, Clock, Building2, Hospital, Banknote, Briefcase, Pill, FlaskConical, FileText, ShoppingCart, Utensils, Zap, DollarSign } from 'lucide-react';
import { calculateCourierPrice, formatCurrency } from '@/lib/pricing';

const CATEGORIES = [
  { key: 'hospital', label: 'Hospital', icon: Hospital, color: 'text-red-500', bg: 'bg-red-500/10' },
  { key: 'bank', label: 'Bank', icon: Banknote, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'office', label: 'Office', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { key: 'pharmacy', label: 'Pharmacy', icon: Pill, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { key: 'lab_medical', label: 'Lab / Medical', icon: FlaskConical, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { key: 'legal_documents', label: 'Legal Docs', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { key: 'retail', label: 'Retail', icon: ShoppingCart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { key: 'restaurant', label: 'Restaurant', icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { key: 'other', label: 'Other', icon: Package, color: 'text-gray-500', bg: 'bg-gray-500/10' },
];

const TIME_SLOTS = ['ASAP', 'Morning (9-12)', 'Afternoon (12-3)', 'Late Afternoon (3-6)', 'Evening (6-9)', 'Specific Time'];

export default function QuickDelivery() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState(null);
  const [form, setForm] = useState({
    pickup_address: '',
    dropoff_address: '',
    item_description: '',
    delivery_date: '',
    delivery_time: 'ASAP',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    notes: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setForm(f => ({ ...f, customer_name: u.full_name || '', customer_email: u.email || '' }));
    }).catch(() => {});
  }, []);

  const estimate = form.pickup_address && form.dropoff_address
    ? calculateCourierPrice({
        distanceMiles: 10, // estimated — real distance calculated on submit
        deliveryCategory: category,
        countryCode: 'US',
        stateCode: '',
        currency: 'USD',
        distanceUnit: 'mi',
      })
    : null;

  const canSubmit = category && form.pickup_address && form.dropoff_address && form.item_description && form.customer_name && form.customer_email && form.customer_phone;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Estimate distance via LLM geocoding (quick estimate)
      let distanceMiles = 10;
      try {
        const distRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Estimate the driving distance in miles between these two addresses. Return ONLY a number (no units, no text). Pickup: ${form.pickup_address}. Dropoff: ${form.dropoff_address}.`,
          response_json_schema: { type: 'object', properties: { miles: { type: 'number' } } },
        });
        if (distRes?.miles) distanceMiles = Math.max(1, distRes.miles);
      } catch {}

      const pricing = calculateCourierPrice({
        distanceMiles,
        deliveryCategory: category,
        countryCode: 'US',
        currency: 'USD',
        distanceUnit: 'mi',
      });

      const moveData = {
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        pickup_address: form.pickup_address,
        dropoff_address: form.dropoff_address,
        move_date: form.delivery_date || new Date().toISOString().split('T')[0],
        move_time: form.delivery_time,
        job_type: 'courier',
        delivery_category: category,
        items_summary: form.item_description,
        total_weight_lbs: 50, // default small weight for courier
        truck_size_needed: 'small',
        service_level: 'standard',
        distance_miles: distanceMiles,
        country_code: 'US',
        currency: 'USD',
        distance_unit: 'mi',
        base_cost: pricing.baseCost,
        fuel_cost: pricing.fuelCost,
        tolls: 0,
        tax_rate: pricing.taxRate,
        tax_amount: pricing.taxAmount,
        app_fee: pricing.appFee,
        driver_fee: 0,
        total_price: pricing.totalPrice,
        driver_payout: pricing.driverPayout,
        bulky_item_fee: 0,
        materials_fee: 0,
        carrying_fee: 0,
        extra_service_fee: pricing.categoryFee,
        notes: form.notes || undefined,
        liability_signed: true,
        liability_signed_date: new Date().toISOString(),
        status: 'pending',
      };

      navigate('/my-moves', { state: { optimisticMove: { ...moveData, _optimistic: true } } });
      const move = await base44.entities.MoveRequest.create(moveData);
      // Auto-dispatch to nearest driver
      base44.functions.invoke('auto-dispatch-driver', { move_request_id: move.id }).catch(() => {});
      toast({ title: 'Delivery booked!', description: "Finding your courier — you'll be notified when a driver accepts." });
      navigate('/my-moves');
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="min-h-[44px] min-w-[44px]">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Zap className="text-emerald-500" size={24} /> Quick Delivery
          </h1>
          <p className="text-muted-foreground text-sm">Small packages, documents & medical deliveries — dispatched in seconds.</p>
        </div>
      </div>

      {/* Category selection */}
      <div className="mb-6">
        <Label className="mb-3 block">What are you delivering?</Label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-h-[44px] ${
                  active ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center`}>
                  <Icon size={20} className={cat.color} />
                </div>
                <span className="text-xs font-medium text-center">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pickup & Dropoff */}
      <div className="space-y-4 mb-6">
        <div>
          <Label className="mb-1.5 block">Pickup Address</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              className="pl-9 min-h-[44px]"
              placeholder="Where should the driver pick up?"
              value={form.pickup_address}
              onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block">Drop-off Address</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              className="pl-9 min-h-[44px]"
              placeholder="Where is it going?"
              value={form.dropoff_address}
              onChange={(e) => setForm({ ...form, dropoff_address: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Item description */}
      <div className="mb-6">
        <Label className="mb-1.5 block">What's being delivered?</Label>
        <Textarea
          placeholder="e.g. Lab samples in cooler, 2 banker boxes of records, pharmacy prescription..."
          value={form.item_description}
          onChange={(e) => setForm({ ...form, item_description: e.target.value })}
          rows={2}
          className="min-h-[44px]"
        />
      </div>

      {/* Timing */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div>
          <Label className="mb-1.5 block">Date</Label>
          <Input
            type="date"
            className="min-h-[44px]"
            value={form.delivery_date}
            onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Time</Label>
          <select
            className="w-full h-11 rounded-md border border-input bg-transparent px-3 text-sm min-h-[44px]"
            value={form.delivery_time}
            onChange={(e) => setForm({ ...form, delivery_time: e.target.value })}
          >
            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div>
          <Label className="mb-1.5 block">Your Name</Label>
          <Input className="min-h-[44px]" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1.5 block">Phone</Label>
          <Input className="min-h-[44px]" placeholder="(555) 123-4567" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block">Email</Label>
          <Input className="min-h-[44px]" placeholder="you@email.com" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <Label className="mb-1.5 block">Special Instructions (optional)</Label>
        <Textarea
          placeholder="e.g. Ring bell at loading dock, ask for Dr. Smith, keep refrigerated..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="min-h-[44px]"
        />
      </div>

      {/* Price estimate */}
      {estimate && (
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={18} className="text-emerald-600" />
            <h3 className="font-display font-bold text-sm">Estimated Price</h3>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery fee</span><span>{formatCurrency(estimate.baseCost + estimate.fuelCost + estimate.driverPayout, 'USD')}</span></div>
            {estimate.categoryFee > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Category handling</span><span>{formatCurrency(estimate.categoryFee, 'USD')}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(estimate.taxAmount, 'USD')}</span></div>
            <div className="flex justify-between pt-2 border-t"><span className="font-bold">Total</span><span className="text-xl font-display font-black text-emerald-600">{formatCurrency(estimate.totalPrice, 'USD')}</span></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Final price calculated when a driver accepts. No charge until delivery is confirmed.</p>
        </div>
      )}

      {/* Submit */}
      <Button
        className="w-full bg-emerald-500 hover:bg-emerald-600 min-h-[48px] text-lg"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
      >
        {submitting ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} className="mr-1" />}
        {submitting ? 'Booking delivery...' : 'Book Quick Delivery'}
      </Button>
    </div>
  );
}