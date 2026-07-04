import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { calculateMovePrice, recommendTruckSize, formatCurrency, COUNTRY_CONFIG, BULKY_WEIGHT_THRESHOLD } from '@/lib/pricing';
import { sanitizeObject, DEFAULT_SKIP_KEYS } from '@/lib/sanitize';
import StepProgress from '@/components/go/move-steps/StepProgress';
const CustomerInfoStep = lazy(() => import('@/components/go/move-steps/CustomerInfoStep'));
const MoveDetailsStep = lazy(() => import('@/components/go/move-steps/MoveDetailsStep'));
const InventoryStep = lazy(() => import('@/components/go/move-steps/InventoryStep'));
const PhotoVideoStep = lazy(() => import('@/components/go/move-steps/PhotoVideoStep'));
const AccessMediaStep = lazy(() => import('@/components/go/move-steps/AccessMediaStep'));
const TimingStep = lazy(() => import('@/components/go/move-steps/TimingStep'));
const EstimateStep = lazy(() => import('@/components/go/move-steps/EstimateStep'));
const ContractSign = lazy(() => import('@/components/go/ContractSign'));
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const STEPS = ['Details', 'Items', 'Quote', 'Sign'];

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
    notes: '', needs_storage: false, storage_days: 0,
    customer_name: '', customer_email: '', customer_phone: '',
    referral_code: '',
    pickup_steps: 0, dropoff_steps: 0,
    pickup_distance_from_street: 0, dropoff_distance_from_street: 0,
    materials_fee: 0,
    extra_helper: false, elevator_service: false,
  });
  const [intermediateStops, setIntermediateStops] = useState([]);
  const [items, setItems] = useState([]);
  const [media, setMedia] = useState([]);
  const [accessMedia, setAccessMedia] = useState([]);
  const [mediaAnalysis, setMediaAnalysis] = useState(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);

  const totalWeight = items.reduce((sum, item) => sum + (item.weight_lbs * item.quantity), 0);

  const hasData = form.pickup_address || form.customer_name || items.length > 0 || media.length > 0;

  useEffect(() => {
    if (!hasData) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasData]);

  const handleBack = useCallback(() => {
    if (step === 0) {
      if (hasData) {
        setShowLeaveDialog(true);
      } else {
        navigate('/');
      }
    } else {
      setStep(step - 1);
    }
  }, [step, hasData, navigate]);

  useEffect(() => {
    base44.auth.me().then(u => {
      setForm(f => ({ ...f, customer_name: u.full_name || '', customer_email: u.email || '' }));
      base44.entities.MoveRequest.filter({ customer_email: u.email, status: 'completed' }).then(moves => {
        if (moves.length > 0) setIsReturningCustomer(true);
      }).catch(() => {});
    }).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) setForm(f => ({ ...f, referral_code: refCode.toUpperCase() }));
    const rebookId = params.get('rebook');
    if (rebookId) {
      base44.entities.MoveRequest.get(rebookId).then((m) => {
        setForm(f => ({
          ...f,
          pickup_address: m.pickup_address || '',
          dropoff_address: m.dropoff_address || '',
          pickup_state: m.pickup_state || '',
          job_type: m.job_type || 'residential',
          move_time: m.move_time || '',
          notes: m.notes || '',
          needs_storage: m.needs_storage || false,
          storage_days: m.storage_days || 0,
          pickup_steps: m.pickup_steps || 0,
          dropoff_steps: m.dropoff_steps || 0,
          pickup_distance_from_street: m.pickup_distance_from_street || 0,
          dropoff_distance_from_street: m.dropoff_distance_from_street || 0,
          materials_fee: m.materials_fee || 0,
          extra_helper: m.extra_helper || false,
          elevator_service: m.elevator_service || false,
        }));
        if (m.multi_stop_addresses) {
          try { setIntermediateStops(JSON.parse(m.multi_stop_addresses)); } catch {}
        }
      }).catch(() => {});
    }
  }, []);

  const handleAddItem = (item) => setItems(prev => [...prev, item]);
  const handleAddItems = (newItems) => setItems(prev => [...prev, ...newItems]);
  const handleRemoveItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const handleUpdateQuantity = (idx, quantity) =>
    setItems(items.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, Number(quantity) || 1) } : item));

  const handleAddMedia = (m) => setMedia(prev => [...prev, m]);
  const handleRemoveMedia = (idx) => setMedia(media.filter((_, i) => i !== idx));
  const handleAddAccessMedia = (m) => setAccessMedia(prev => [...prev, m]);
  const handleRemoveAccessMedia = (idx) => setAccessMedia(accessMedia.filter((_, i) => i !== idx));

  const bulkyItemCount = items.filter(i => i.special_handling || i.weight_lbs >= BULKY_WEIGHT_THRESHOLD).reduce((sum, i) => sum + i.quantity, 0);

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
        bulkyItemCount,
        materialsFee: Number(form.materials_fee) || 0,
        pickupSteps: form.pickup_steps,
        dropoffSteps: form.dropoff_steps,
        pickupDistanceFromStreet: form.pickup_distance_from_street,
        dropoffDistanceFromStreet: form.dropoff_distance_from_street,
        extraHelper: form.extra_helper,
        elevatorService: form.elevator_service,
        moveDate: form.move_date,
        isReturningCustomer,
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
    setStep(3);
  };

  const handleSign = async (contractRecord) => {
    setSaving(true);

    // Rate limit check
    try {
      const rateCheck = await base44.functions.invoke('check-rate-limit', {
        form_name: 'new_move',
        identifier: form.customer_email,
      });
      if (!rateCheck.data?.allowed) {
        toast({ title: 'Too many requests', description: `Please wait ${rateCheck.data?.windowMinutes || 30} minutes before trying again.`, variant: 'destructive' });
        setSaving(false);
        return;
      }
    } catch {
      // Fail open
    }

    try {
      const moveData = sanitizeObject({
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
        storage_days: form.storage_days || 0,
        notes: form.notes,
        intermediate_stops: intermediateStops.filter(s => s && s.trim()).length > 0 ? JSON.stringify(intermediateStops.filter(s => s && s.trim())) : undefined,
        media_urls: JSON.stringify(media.map(m => ({ url: m.url, type: m.type }))),
        access_media_urls: JSON.stringify(accessMedia.map(m => ({ url: m.url, type: m.type }))),
        base_cost: pricing.baseCost,
        fuel_cost: pricing.fuelCost,
        tolls: Number(form.tolls) || 0,
        bulky_item_fee: pricing.bulkyItemFee,
        materials_fee: pricing.materialsFee,
        carrying_fee: pricing.carryingFee,
        extra_helper: form.extra_helper || false,
        elevator_service: form.elevator_service || false,
        extra_service_fee: pricing.extraServiceFee,
        pickup_steps: form.pickup_steps || 0,
        dropoff_steps: form.dropoff_steps || 0,
        pickup_distance_from_street: form.pickup_distance_from_street || 0,
        dropoff_distance_from_street: form.dropoff_distance_from_street || 0,
        tax_rate: pricing.taxRate,
        tax_amount: pricing.taxAmount,
        app_fee: pricing.appFee,
        driver_fee: pricing.driverFee,
        total_price: pricing.totalPrice,
        surge_multiplier: pricing.surgeMultiplier || 1,
        surge_label: pricing.surgeLabel || undefined,
        driver_payout: pricing.driverPayout,
        liability_signed: true,
        liability_signed_date: new Date().toISOString(),
        referral_code: form.referral_code || undefined,
        status: 'pending',
      }, DEFAULT_SKIP_KEYS);
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
      // Auto-dispatch to nearest available certified driver (fire-and-forget)
      base44.functions.invoke('auto-dispatch-driver', { move_request_id: move.id }).catch(() => {});
      toast({ title: 'Move booked!', description: "Finding your driver — you'll be notified when a driver accepts." });
      navigate('/my-moves');
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const canNextStep = () => {
    if (step === 0) return form.customer_name && form.customer_email && form.customer_phone
      && form.pickup_address && form.dropoff_address && form.distance_miles && form.country_code
      && form.move_date && form.move_time;
    if (step === 1) return items.length > 0;
    if (step === 2) return !!selectedTier;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </div>

      <StepProgress steps={STEPS} currentStep={step} />

      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>}>
      {step === 0 && (
        <div className="space-y-6">
          <CustomerInfoStep form={form} setForm={setForm} />
          <MoveDetailsStep form={form} setForm={setForm} handleCountryChange={handleCountryChange} intermediateStops={intermediateStops} setIntermediateStops={setIntermediateStops} />
          <TimingStep form={form} setForm={setForm} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <InventoryStep
            items={items}
            onAddItem={handleAddItem}
            onAddItems={handleAddItems}
            onRemoveItem={handleRemoveItem}
            onUpdateQuantity={handleUpdateQuantity}
            onUploadPDF={handleUploadPDF}
            uploading={uploading}
            form={form}
            setForm={setForm}
            liveEstimate={liveEstimate}
          />
          <PhotoVideoStep media={media} onAddMedia={handleAddMedia} onRemoveMedia={handleRemoveMedia} onAnalysis={setMediaAnalysis} />
          <AccessMediaStep accessMedia={accessMedia} onAddMedia={handleAddAccessMedia} onRemoveMedia={handleRemoveAccessMedia} />
        </div>
      )}

      {step === 2 && (
        <EstimateStep
          form={form}
          totalWeight={totalWeight}
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          onConfirm={handleConfirmTier}
          mediaAnalysis={mediaAnalysis}
        />
      )}

      {step === 3 && (
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
      </Suspense>

      {/* Nav buttons */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        {step < 2 && (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canNextStep()}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            Next <ArrowRight size={16} className="ml-1" />
          </Button>
        )}
      </div>

      {showLeaveDialog && (
        <AlertDialog open onOpenChange={() => setShowLeaveDialog(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
              <AlertDialogDescription>Your move details will be lost if you leave now.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowLeaveDialog(false)}>Stay</AlertDialogCancel>
              <AlertDialogAction onClick={() => navigate('/')}>Leave</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}