import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MobileSelect from '@/components/go/MobileSelect';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import ItemForm from '@/components/go/ItemForm';
import PriceBreakdown from '@/components/go/PriceBreakdown';
import LiabilityAgreement from '@/components/go/LiabilityAgreement';
import { calculateMovePrice, recommendTruckSize, TRUCK_SIZE_LABELS, STATE_TAX_RATES } from '@/lib/pricing';
import { ArrowLeft, ArrowRight, Upload, Trash2, Package, MapPin, Calendar, FileText, Loader2 } from 'lucide-react';

const STEPS = ['Details', 'Items', 'Quote', 'Agreement'];

export default function NewMove() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    pickup_address: '', dropoff_address: '', move_date: '', move_time: '',
    distance_miles: '', state_code: '', notes: '', needs_storage: false,
    customer_name: '', customer_email: '', customer_phone: '',
  });
  const [items, setItems] = useState([]);
  const [truckSize, setTruckSize] = useState('medium');
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setForm(f => ({ ...f, customer_name: u.full_name || '', customer_email: u.email || '' }));
    }).catch(() => {});
  }, []);

  const totalWeight = items.reduce((sum, item) => sum + (item.weight_lbs * item.quantity), 0);

  const handleAddItem = (item) => {
    setItems([...items, item]);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleUploadPDF = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string', enum: ['furniture', 'electronics', 'appliances', 'boxes', 'fragile', 'heavy_equipment', 'clothing', 'other'] },
                  weight_lbs: { type: 'number' },
                  quantity: { type: 'number' },
                  special_handling: { type: 'boolean' }
                }
              }
            }
          }
        }
      });
      if (result.status === 'success' && result.output?.items) {
        setItems([...items, ...result.output.items]);
        toast({ title: 'Items imported!', description: `${result.output.items.length} items added from your file.` });
      }
    } catch {
      toast({ title: 'Upload failed', description: 'Could not extract items from that file. Try adding them manually.', variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleCalculate = () => {
    const rec = recommendTruckSize(totalWeight);
    setTruckSize(rec);
    const price = calculateMovePrice({
      totalWeightLbs: totalWeight,
      distanceMiles: Number(form.distance_miles),
      truckSize: rec,
      stateCode: form.state_code,
    });
    setPricing(price);
  };

  const handleSign = async () => {
    setSaving(true);
    try {
      const moveData = {
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        pickup_address: form.pickup_address,
        dropoff_address: form.dropoff_address,
        move_date: form.move_date,
        move_time: form.move_time,
        distance_miles: Number(form.distance_miles),
        truck_size_needed: truckSize,
        total_weight_lbs: totalWeight,
        items_summary: items.map(i => `${i.quantity}x ${i.name} (${i.weight_lbs}lbs)`).join(', '),
        needs_storage: form.needs_storage,
        notes: form.notes,
        base_cost: pricing.baseCost,
        fuel_cost: pricing.fuelCost,
        tax_rate: pricing.taxRate,
        tax_amount: pricing.taxAmount,
        app_fee: pricing.appFee,
        driver_fee: pricing.driverFee,
        total_price: pricing.totalPrice,
        driver_payout: pricing.driverPayout,
        liability_signed: true,
        liability_signed_date: new Date().toISOString(),
        status: 'pending',
      };
      navigate('/my-moves', { state: { optimisticMove: { ...moveData, _optimistic: true } } });
      const move = await base44.entities.MoveRequest.create(moveData);
      // Save individual items
      if (items.length > 0) {
        await base44.entities.MoveItem.bulkCreate(
          items.map(item => ({ ...item, move_request_id: move.id }))
        );
      }
      toast({ title: 'Move booked!', description: 'A driver will accept your job shortly.' });
      navigate('/my-moves');
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const canNextStep = () => {
    if (step === 0) return form.pickup_address && form.dropoff_address && form.move_date && form.distance_miles && form.state_code;
    if (step === 1) return items.length > 0;
    if (step === 2) return pricing;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 ${i <= step ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400' : 'bg-muted'
              }`}>
                {i + 1}
              </div>
              <span className="hidden sm:inline text-sm font-medium">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-emerald-500' : 'bg-border'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0: Move Details */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-bold mb-1">Move Details</h2>
            <p className="text-muted-foreground text-sm">Tell us about your move.</p>
          </div>
          <div className="bg-card border rounded-2xl p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Your Name</Label>
                <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><MapPin size={14} /> Pickup Address</Label>
              <Input value={form.pickup_address} onChange={e => setForm({ ...form, pickup_address: e.target.value })} placeholder="123 Main St, City, State" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><MapPin size={14} /> Drop-off Address</Label>
              <Input value={form.dropoff_address} onChange={e => setForm({ ...form, dropoff_address: e.target.value })} placeholder="456 Oak Ave, City, State" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="flex items-center gap-2"><Calendar size={14} /> Move Date</Label>
                <Input type="date" value={form.move_date} onChange={e => setForm({ ...form, move_date: e.target.value })} />
              </div>
              <div>
                <Label>Preferred Time</Label>
                <Input type="time" value={form.move_time} onChange={e => setForm({ ...form, move_time: e.target.value })} />
              </div>
              <div>
                <Label>Distance (miles)</Label>
                <Input type="number" placeholder="e.g. 25" value={form.distance_miles} onChange={e => setForm({ ...form, distance_miles: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>State (for tax calculation)</Label>
              <MobileSelect
                value={form.state_code}
                onValueChange={v => setForm({ ...form, state_code: v })}
                options={Object.keys(STATE_TAX_RATES).sort().map(s => ({ value: s, label: s }))}
                placeholder="Select state"
              />
            </div>
            <div className="flex items-center justify-between bg-blue-500/10 rounded-xl p-4">
              <div>
                <p className="font-medium text-sm">Need storage?</p>
                <p className="text-xs text-muted-foreground">We'll help you find a facility near your move.</p>
              </div>
              <Switch checked={form.needs_storage} onCheckedChange={v => setForm({ ...form, needs_storage: v })} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Stairs, elevator access, special instructions..." />
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Items */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-bold mb-1">Add Your Items</h2>
            <p className="text-muted-foreground text-sm">List everything you're moving — or upload a file.</p>
          </div>

          {/* Upload */}
          <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center">
            <FileText className="mx-auto text-muted-foreground mb-2" size={32} />
            <p className="text-sm text-muted-foreground mb-3">Upload a PDF or CSV inventory list</p>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" disabled={uploading} asChild>
                <span>
                  {uploading ? <><Loader2 size={14} className="mr-1 animate-spin" /> Extracting...</> : <><Upload size={14} className="mr-1" /> Upload File</>}
                </span>
              </Button>
              <input type="file" accept=".pdf,.csv,.xlsx" className="hidden" onChange={handleUploadPDF} />
            </label>
          </div>

          {/* Manual add */}
          <ItemForm onAdd={handleAddItem} />

          {/* Item list */}
          {items.length > 0 && (
            <div className="bg-card border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-muted border-b flex justify-between items-center">
                <span className="text-sm font-medium">{items.length} item{items.length > 1 ? 's' : ''}</span>
                <span className="text-sm font-bold text-emerald-600">{totalWeight.toLocaleString()} lbs total</span>
              </div>
              <div className="divide-y max-h-64 overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{item.quantity}x {item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.weight_lbs} lbs each · {item.category}{item.special_handling ? ' · ⚠️ Fragile' : ''}</p>
                    </div>
                    <button onClick={() => handleRemoveItem(i)} className="text-muted-foreground hover:text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={`Remove ${item.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Quote */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-bold mb-1">Your Quote</h2>
            <p className="text-muted-foreground text-sm">Review the price breakdown for your move.</p>
          </div>

          {!pricing && (
            <div className="text-center py-8">
              <Button onClick={handleCalculate} size="lg" className="bg-emerald-500 hover:bg-emerald-600">
                Calculate Price
              </Button>
            </div>
          )}

          {pricing && (
            <>
              <div className="bg-card border rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">From</span><span className="font-medium">{form.pickup_address}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">To</span><span className="font-medium">{form.dropoff_address}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Distance</span><span className="font-medium">{form.distance_miles} mi (one way)</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Weight</span><span className="font-medium">{totalWeight.toLocaleString()} lbs</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Items</span><span className="font-medium">{items.length}</span></div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Truck Size</Label>
                <MobileSelect
                  value={truckSize}
                  onValueChange={v => {
                    setTruckSize(v);
                    setPricing(calculateMovePrice({
                      totalWeightLbs: totalWeight, distanceMiles: Number(form.distance_miles), truckSize: v, stateCode: form.state_code
                    }));
                  }}
                  options={Object.entries(TRUCK_SIZE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                />
              </div>

              <PriceBreakdown pricing={pricing} truckSize={truckSize} />
            </>
          )}
        </div>
      )}

      {/* Step 3: Liability Agreement */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-bold mb-1">Sign Agreement</h2>
            <p className="text-muted-foreground text-sm">Review and sign before we submit your move request.</p>
          </div>
          <LiabilityAgreement onSign={handleSign} />
          {saving && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Submitting your move...
            </div>
          )}
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="ghost"
          onClick={() => step === 0 ? navigate('/') : setStep(step - 1)}
        >
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        {step < 3 && (
          <Button
            onClick={() => {
              if (step === 1) handleCalculate();
              setStep(step + 1);
            }}
            disabled={!canNextStep()}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            Next <ArrowRight size={16} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}