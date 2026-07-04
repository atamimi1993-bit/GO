import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Camera, Loader2, Trash2, Footprints, Home, CheckCircle2, ClipboardList } from 'lucide-react';
import ItemForm from '@/components/go/ItemForm';
import QuickAddItems from '@/components/go/QuickAddItems';
import OfficePriceStep from '@/components/go/OfficePriceStep';
import { calculateMovePrice, recommendTruckSize, BULKY_WEIGHT_THRESHOLD } from '@/lib/pricing';

export default function OnSiteChecklist({ move, driverProfile, onComplete }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [photoUrl, setPhotoUrl] = useState(move.onsite_photo_url || '');
  const [uploading, setUploading] = useState(false);
  const [pickupSteps, setPickupSteps] = useState(move.pickup_steps || 0);
  const [pickupDistance, setPickupDistance] = useState(move.pickup_distance_from_street || 0);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const loadItems = useCallback(async () => {
    try {
      const data = await base44.entities.MoveItem.filter({ move_request_id: move.id });
      setItems(data);
    } catch {
      toast({ title: 'Could not load items', variant: 'destructive' });
    }
    setLoadingItems(false);
  }, [move.id, toast]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const totalWeight = items.reduce((s, i) => s + i.weight_lbs * i.quantity, 0);
  const bulkyCount = items.filter(i => i.special_handling || i.weight_lbs >= BULKY_WEIGHT_THRESHOLD).reduce((s, i) => s + i.quantity, 0);

  const handleAddItem = async (item) => {
    try {
      const created = await base44.entities.MoveItem.create({ ...item, move_request_id: move.id });
      setItems(prev => [...prev, created]);
    } catch {
      toast({ title: 'Could not add item', variant: 'destructive' });
    }
  };

  const handleUpdateQty = async (itemId, qty) => {
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: qty } : i));
    try {
      await base44.entities.MoveItem.update(itemId, { quantity: qty });
    } catch {
      toast({ title: 'Could not update quantity', variant: 'destructive' });
      loadItems();
    }
  };

  const handleRemoveItem = async (itemId) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
    try {
      await base44.entities.MoveItem.delete(itemId);
    } catch {
      toast({ title: 'Could not remove item', variant: 'destructive' });
      loadItems();
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(file_url);
    } catch {
      toast({ title: 'Photo upload failed', variant: 'destructive' });
    }
    setUploading(false);
    if (e.target) e.target.value = '';
  };

  const handleFinalize = async () => {
    setSaving(true);
    try {
      const truckSize = recommendTruckSize(totalWeight);
      const pricing = calculateMovePrice({
        totalWeightLbs: totalWeight,
        distanceMiles: Number(move.distance_miles),
        truckSize,
        stateCode: move.pickup_state,
        countryCode: move.country_code,
        currency: move.currency,
        distanceUnit: move.distance_unit,
        jobType: move.job_type,
        tolls: Number(move.tolls) || 0,
        bulkyItemCount: bulkyCount,
        materialsFee: Number(move.materials_fee) || 0,
        pickupSteps,
        dropoffSteps: move.dropoff_steps || 0,
        pickupDistanceFromStreet: pickupDistance,
        dropoffDistanceFromStreet: move.dropoff_distance_from_street || 0,
      });

      await base44.entities.MoveRequest.update(move.id, {
        onsite_photo_url: photoUrl,
        onsite_verified: true,
        pickup_steps: pickupSteps,
        pickup_distance_from_street: pickupDistance,
        total_weight_lbs: totalWeight,
        truck_size_needed: truckSize,
        base_cost: pricing.baseCost,
        fuel_cost: pricing.fuelCost,
        bulky_item_fee: pricing.bulkyItemFee,
        materials_fee: pricing.materialsFee,
        carrying_fee: pricing.carryingFee,
        tax_rate: pricing.taxRate,
        tax_amount: pricing.taxAmount,
        app_fee: pricing.appFee,
        driver_fee: pricing.driverFee,
        total_price: pricing.totalPrice,
        driver_payout: pricing.driverPayout,
      });

      toast({ title: 'Office price finalized!', description: 'The customer has been updated with the final price.' });
      onComplete();
    } catch (err) {
      toast({ title: 'Could not finalize price', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const STEPS = [
    { num: 1, label: 'Verify Items', icon: ClipboardList },
    { num: 2, label: 'Access & Photo', icon: Home },
    { num: 3, label: 'Office Price', icon: CheckCircle2 },
  ];

  return (
    <div className="bg-card border-2 border-emerald-500/30 rounded-2xl overflow-hidden mb-4">
      <div className="px-5 py-3 bg-emerald-500/10 border-b border-emerald-500/20">
        <h3 className="font-display font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <ClipboardList size={16} /> On-Site Checklist
        </h3>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 p-4 border-b">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.num}>
            <div className={`flex items-center gap-2 ${step >= s.num ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.num ? 'bg-emerald-500 text-white' : 'bg-muted'}`}>
                {step > s.num ? <CheckCircle2 size={14} /> : s.num}
              </div>
              <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${step > s.num ? 'bg-emerald-500' : 'bg-muted'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="p-5">
        {/* Step 1: Verify Items */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Record all items the customer requested</p>
              <p className="text-xs text-muted-foreground">Verify each item is present. Adjust quantities or add missing items as needed.</p>
            </div>

            {loadingItems ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
            ) : items.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">No items recorded yet. Add the customer's items below.</div>
            ) : (
              <div className="border rounded-xl divide-y max-h-64 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2.5 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.weight_lbs} lbs{item.special_handling ? ' · Fragile' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input type="number" min={1} value={item.quantity} onChange={e => handleUpdateQty(item.id, Number(e.target.value) || 1)} className="w-14 h-9 text-center text-sm" aria-label={`Quantity for ${item.name}`} />
                      <button onClick={() => handleRemoveItem(item.id)} className="text-muted-foreground hover:text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={`Remove ${item.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Add missing items:</p>
              <QuickAddItems onAdd={handleAddItem} existingItems={items} />
              <ItemForm onAdd={handleAddItem} />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">{items.length} items · {totalWeight.toLocaleString()} lbs{bulkyCount > 0 ? ` · ${bulkyCount} bulky` : ''}</span>
              <Button onClick={() => setStep(2)} disabled={items.length === 0} className="bg-emerald-500 hover:bg-emerald-600">
                Items Verified <CheckCircle2 size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Access & Photo */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium mb-1 flex items-center gap-2"><Home size={16} /> Record the front of the house</p>
              <p className="text-xs text-muted-foreground">Take a photo showing the distance from where the truck will park to the door.</p>
            </div>

            {/* Photo */}
            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
              {photoUrl ? (
                <div className="relative">
                  <img src={photoUrl} alt="Front of house" className="w-full max-h-48 object-cover rounded-lg" />
                  <button onClick={() => fileInputRef.current?.click()} className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 text-white" aria-label="Retake photo">
                    <Camera size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="py-4 flex flex-col items-center gap-2 w-full">
                  {uploading ? <Loader2 className="animate-spin text-muted-foreground" size={24} /> : <Camera className="text-muted-foreground" size={28} />}
                  <span className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Take photo of front of house'}</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
            </div>

            {/* Access details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Footprints size={16} /> Access Details at Pickup
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Steps / Stairs</Label>
                  <Input type="number" min={0} placeholder="e.g. 12" value={pickupSteps || ''} onChange={e => setPickupSteps(Number(e.target.value) || 0)} />
                  <p className="text-xs text-muted-foreground mt-1">Stair steps from door to truck</p>
                </div>
                <div>
                  <Label>Distance from Street (ft)</Label>
                  <Input type="number" min={0} placeholder="e.g. 50" value={pickupDistance || ''} onChange={e => setPickupDistance(Number(e.target.value) || 0)} />
                  <p className="text-xs text-muted-foreground mt-1">Door to truck parking spot</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!photoUrl} className="bg-emerald-500 hover:bg-emerald-600">
                Continue <CheckCircle2 size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Finalize Office Price */}
        {step === 3 && (
          <OfficePriceStep move={move} items={items} totalWeight={totalWeight} bulkyCount={bulkyCount} pickupSteps={pickupSteps} pickupDistance={pickupDistance} saving={saving} onBack={() => setStep(2)} onFinalize={handleFinalize} />
        )}
      </div>
    </div>
  );
}