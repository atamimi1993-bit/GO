import React, { useState, useEffect } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { calculateMovePrice, recommendTruckSize, formatCurrency, COUNTRY_CONFIG } from '@/lib/pricing';
import StepProgress from '@/components/go/move-steps/StepProgress';
import CustomerInfoStep from '@/components/go/move-steps/CustomerInfoStep';
import MoveDetailsStep from '@/components/go/move-steps/MoveDetailsStep';
import InventoryStep from '@/components/go/move-steps/InventoryStep';
import PhotoVideoStep from '@/components/go/move-steps/PhotoVideoStep';
import TimingStep from '@/components/go/move-steps/TimingStep';
import EstimateStep from '@/components/go/move-steps/EstimateStep';
import ContractSign from '@/components/go/ContractSign';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const STEPS = ['Info', 'Move', 'Items', 'Media', 'Timing', 'Quote', 'Sign'];

export default function NewMove() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [truckSize, setTruckSize] = useState('medium');
  const [serviceLevel, setServiceLevel] = useState('standard');

  const [form, setForm] = useState({
    pickup_address: '', dropoff_address: '', move_date: '', move_time: '',
    distance_miles: '', country_code: 'US', currency: 'USD', distance_unit: 'mi',
    pickup_state: '', job_type: 'residential', tolls: '',
    notes: '', needs_storage: false,
    customer_name: '', customer_email: '', customer_phone: '',
  });
  const [items, setItems] = useState([]);
  const [media, setMedia] = useState([]);
  const [mediaAnalysis, setMediaAnalysis] = useState(null);

  const totalWeight = items.reduce((sum, item) => sum + (item.weight_lbs * item.quantity), 0);

  const hasData = form.pickup_address || form.customer_name || items.length > 0 || media.length > 0;
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    hasData && step > 0 && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    base44.auth.me().then(u => {
      setForm(f => ({ ...f, customer_name: u.full_name || '', customer_email: u.email || '' }));
    }).catch(() => {});
  }, []);

  const handleAddItem = (item) => setItems(prev => [...prev, item]);
  const handleAddItems = (newItems) => setItems(prev => [...prev, ...newItems]);
  const handleRemoveItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const handleUpdateQuantity = (idx, quantity) =>
    setItems(items.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, Number(quantity) || 1) } : item));

  const handleAddMedia = (m) => setMedia(prev => [...prev, m]);
  const handleRemoveMedia = (idx) => setMedia(media.filter((_, i) => i !== idx));

  const liveEstimate = items.length > 0 && form.distance_miles
    ? calculateMovePrice({
        totalWeightLbs: totalWeight,
        distanceMiles: Number(form.distance_miles),
        truckSize: recommendTruckSize(totalWeight),
        stateCode: form.pickup_state,
        countryCode: form.country_code,
        currency: form.currency,
        distanceUnit: form.distance_unit,
        jobType: form.job_type,
        tolls: Number(form.tolls) || 0,
      })
    : null;

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
        handleAddItems(result.output.items);
        toast({ title: 'Items imported!', description: `${result.output.items.length} items added from your file.` });
      }
    } catch {
      toast({ title: 'Upload failed', description: 'Could not extract items from that file. Try adding them manually.', variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleCountryChange = (code) => {
    const cfg = COUNTRY_CONFIG[code];
    setForm(f => ({ ...f, country_code: code, currency: cfg?.currency || 'USD', distance_unit: cfg?.distanceUnit || 'mi' }));
  };

  const handleConfirmTier = (finalPricing, serviceLevelKey, truck) => {
    setPricing(finalPricing);
    setServiceLevel(serviceLevelKey);
    setTruckSize(truck);
    setStep(6);
  };

  const handleSign = async (contractRecord) => {
    setSaving(true);
    try {
      const moveData = {
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        pickup_address: form.pickup_address,
        pickup_state: form.pickup_state,
        dropoff_address: form.dropoff_address,
        move_date: form.move_date,
        move_time: form.move_time,
        distance_miles: Number(form.distance_miles),
        distance_unit: form.distance_unit,
        country_code: form.country_code,
        currency: form.currency,
        job_type: form.job_type,
        truck_size_needed: truckSize,
        service_level: serviceLevel,
        total_weight_lbs: totalWeight,
        items_summary: items.map(i => `${i.quantity}x ${i.name} (${i.weight_lbs}lbs)`).join(', '),
        needs_storage: form.needs_storage,
        notes: form.notes,
        media_urls: JSON.stringify(media.map(m => ({ url: m.url, type: m.type }))),
        base_cost: pricing.baseCost,
        fuel_cost: pricing.fuelCost,
        tolls: Number(form.tolls) || 0,
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
      if (items.length > 0) {
        await base44.entities.MoveItem.bulkCreate(
          items.map(item => ({ ...item, move_request_id: move.id }))
        );
      }
      if (contractRecord?.id) {
        await base44.entities.Contract.update(contractRecord.id, { move_request_id: move.id });
      }
      toast({ title: 'Move booked!', description: 'A driver will accept your job shortly.' });
      navigate('/my-moves');
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const canNextStep = () => {
    if (step === 0) return form.customer_name && form.customer_email && form.customer_phone;
    if (step === 1) return form.pickup_address && form.dropoff_address && form.distance_miles && form.country_code;
    if (step === 2) return items.length > 0;
    if (step === 3) return media.length > 0;
    if (step === 4) return form.move_date && form.move_time;
    if (step === 5) return !!selectedTier;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {STEPS[step]} — Step {step + 1} of {STEPS.length}
      </div>

      <StepProgress steps={STEPS} currentStep={step} />

      {step === 0 && <CustomerInfoStep form={form} setForm={setForm} />}

      {step === 1 && (
        <MoveDetailsStep form={form} setForm={setForm} handleCountryChange={handleCountryChange} />
      )}

      {step === 2 && (
        <InventoryStep
          items={items}
          onAddItem={handleAddItem}
          onAddItems={handleAddItems}
          onRemoveItem={handleRemoveItem}
          onUpdateQuantity={handleUpdateQuantity}
          onUploadPDF={handleUploadPDF}
          uploading={uploading}
          form={form}
          liveEstimate={liveEstimate}
        />
      )}

      {step === 3 && (
        <PhotoVideoStep media={media} onAddMedia={handleAddMedia} onRemoveMedia={handleRemoveMedia} onAnalysis={setMediaAnalysis} />
      )}

      {step === 4 && <TimingStep form={form} setForm={setForm} />}

      {step === 5 && (
        <EstimateStep
          form={form}
          totalWeight={totalWeight}
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          onConfirm={handleConfirmTier}
          mediaAnalysis={mediaAnalysis}
        />
      )}

      {step === 6 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-bold mb-1">Review & Sign</h2>
            <p className="text-muted-foreground text-sm">Review your final quote and sign the service agreement.</p>
          </div>
          {pricing && (
            <div className="bg-card border rounded-2xl p-5 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Service Level</span><span className="font-medium capitalize">{serviceLevel.replace('_', ' ')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Truck Size</span><span className="font-medium capitalize">{truckSize.replace('_', ' ')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Weight</span><span className="font-medium">{totalWeight.toLocaleString()} lbs</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Distance</span><span className="font-medium">{form.distance_miles} {form.distance_unit}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Move Date</span><span className="font-medium">{form.move_date} at {form.move_time}</span></div>
              <div className="border-t pt-2 mt-2 flex justify-between items-center">
                <span className="font-bold">Total Price</span>
                <span className="text-2xl font-display font-black text-emerald-600">{formatCurrency(pricing.totalPrice, form.currency)}</span>
              </div>
            </div>
          )}
          <ContractSign
            contractType="customer_service"
            partyName={form.customer_name}
            partyEmail={form.customer_email}
            partyPhone={form.customer_phone}
            onSigned={() => handleSign()}
          />
          {saving && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Submitting your move...
            </div>
          )}
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={() => step === 0 ? navigate('/') : setStep(step - 1)}>
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        {step < 5 && (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canNextStep()}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            Next <ArrowRight size={16} className="ml-1" />
          </Button>
        )}
      </div>

      {blocker.state === 'blocked' && (
        <AlertDialog open onOpenChange={() => blocker.reset()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
              <AlertDialogDescription>Your move details will be lost if you leave now.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => blocker.reset()}>Stay</AlertDialogCancel>
              <AlertDialogAction onClick={() => blocker.proceed()}>Leave</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}