import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import PriceBreakdown from '@/components/go/PriceBreakdown';
import ItemForm from '@/components/go/ItemForm';
import PullToRefresh from '@/components/go/PullToRefresh';
import { calculateMovePrice, recommendTruckSize, formatCurrency } from '@/lib/pricing';
import { ArrowLeft, Camera, Loader2, Trash2, Package, ImageIcon, Sparkles, RefreshCw, Save } from 'lucide-react';

export default function MoveInventory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { scrollRef } = useOutletContext();
  const { toast } = useToast();
  const fileRef = useRef(null);

  const [move, setMove] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, it] = await Promise.all([
        base44.entities.MoveRequest.get(id),
        base44.entities.MoveItem.filter({ move_request_id: id }),
      ]);
      setMove(m);
      setItems(it);
    } catch {
      toast({ title: 'Could not load move', variant: 'destructive' });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const totalWeight = items.reduce((sum, item) => sum + (item.weight_lbs * item.quantity), 0);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setAnalyzing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: 'Analyze this photo of an item being moved. Identify the item, estimate its weight in pounds, and classify it into the most appropriate category. Also determine if it requires special/fragile handling.',
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            category: { type: 'string', enum: ['furniture', 'electronics', 'appliances', 'boxes', 'fragile', 'heavy_equipment', 'clothing', 'other'] },
            weight_lbs: { type: 'number' },
            special_handling: { type: 'boolean' },
            notes: { type: 'string' },
          },
        },
      });

      const newItem = await base44.entities.MoveItem.create({
        move_request_id: id,
        name: result.name || 'Unknown Item',
        category: result.category || 'other',
        weight_lbs: Math.max(1, Math.round(result.weight_lbs || 10)),
        quantity: 1,
        special_handling: result.special_handling || false,
        photo_url: file_url,
        notes: result.notes || '',
      });
      setItems(prev => [...prev, newItem]);
      toast({ title: 'Item added from photo', description: `${newItem.name} — ${newItem.weight_lbs} lbs` });
    } catch {
      toast({ title: 'Photo analysis failed', description: 'Try adding the item manually.', variant: 'destructive' });
    }
    setAnalyzing(false);
  };

  const handleManualAdd = async (item) => {
    try {
      const newItem = await base44.entities.MoveItem.create({ ...item, move_request_id: id });
      setItems(prev => [...prev, newItem]);
      toast({ title: 'Item added', description: item.name });
    } catch {
      toast({ title: 'Failed to add item', variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await base44.entities.MoveItem.delete(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch {
      toast({ title: 'Could not delete item', variant: 'destructive' });
    }
  };

  const handleRecalculate = () => {
    if (totalWeight <= 0) return;
    setRecalcLoading(true);
    const rec = recommendTruckSize(totalWeight);
    const price = calculateMovePrice({
      totalWeightLbs: totalWeight,
      distanceMiles: move.distance_miles,
      truckSize: rec,
      countryCode: move.country_code,
      currency: move.currency,
      distanceUnit: move.distance_unit,
    });
    setPricing(price);
    setRecalcLoading(false);
    toast({ title: 'Price recalculated', description: `Recommended truck: ${rec.replace('_', ' ')}` });
  };

  const handleSavePrice = async () => {
    if (!pricing) return;
    setSaving(true);
    try {
      await base44.entities.MoveRequest.update(id, {
        total_weight_lbs: totalWeight,
        truck_size_needed: recommendTruckSize(totalWeight),
        base_cost: pricing.baseCost,
        fuel_cost: pricing.fuelCost,
        tax_rate: pricing.taxRate,
        tax_amount: pricing.taxAmount,
        app_fee: pricing.appFee,
        driver_fee: pricing.driverFee,
        total_price: pricing.totalPrice,
        driver_payout: pricing.driverPayout,
        items_summary: items.map(i => `${i.quantity}x ${i.name} (${i.weight_lbs}lbs)`).join(', '),
      });
      toast({ title: 'Price updated!', description: 'The customer has been notified of the updated price.' });
      navigate(`/move/${id}`);
    } catch {
      toast({ title: 'Failed to save price', variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  if (!move) return <div className="text-center py-20"><p className="text-muted-foreground">Move not found.</p></div>;

  const currencyCode = move.currency || 'USD';
  const oldTotal = move.total_price || 0;
  const priceDiff = pricing ? pricing.totalPrice - oldTotal : 0;

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 min-h-[44px]">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold mb-1">Move Inventory</h1>
          <p className="text-muted-foreground text-sm">Photograph or add items, then recalculate the price.</p>
        </div>

        {/* Move summary */}
        <div className="bg-card border rounded-2xl p-4 mb-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">From</span><span className="font-medium truncate ml-2">{move.pickup_address}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">To</span><span className="font-medium truncate ml-2">{move.dropoff_address}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Current Price</span><span className="font-medium">{formatCurrency(oldTotal, currencyCode)}</span></div>
        </div>

        {/* Photo capture */}
        <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center mb-4">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
          {analyzing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
              <p className="text-sm text-muted-foreground">Analyzing photo with AI…</p>
            </div>
          ) : (
            <>
              <Camera className="mx-auto text-muted-foreground mb-2" size={32} />
              <p className="text-sm text-muted-foreground mb-3">Take a photo of an item — AI will identify it and estimate weight</p>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={analyzing}>
                <Camera size={14} className="mr-1" /> Capture / Upload Photo
              </Button>
            </>
          )}
        </div>

        {/* Manual add */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Package size={12} /> Or add manually</p>
          <ItemForm onAdd={handleManualAdd} />
        </div>

        {/* Item list */}
        {items.length > 0 && (
          <div className="bg-card border rounded-2xl overflow-hidden mb-4">
            <div className="px-4 py-3 bg-muted border-b flex justify-between items-center">
              <span className="text-sm font-medium">{items.length} item{items.length > 1 ? 's' : ''}</span>
              <span className="text-sm font-bold text-emerald-600">{totalWeight.toLocaleString()} lbs total</span>
            </div>
            <div className="divide-y">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.quantity}x {item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.weight_lbs} lbs each · {item.category}{item.special_handling ? ' · ⚠️ Fragile' : ''}</p>
                  </div>
                  <button onClick={() => handleDeleteItem(item.id)} className="text-muted-foreground hover:text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={`Remove ${item.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-12 bg-card border rounded-2xl mb-4">
            <Package className="mx-auto text-muted-foreground mb-3" size={40} />
            <p className="text-muted-foreground text-sm">No items yet. Add photos or manual entries above.</p>
          </div>
        )}

        {/* Recalculate */}
        {items.length > 0 && !pricing && (
          <Button onClick={handleRecalculate} className="w-full bg-emerald-500 hover:bg-emerald-600 mb-4" disabled={recalcLoading}>
            {recalcLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="mr-1" />}
            Recalculate Price ({totalWeight.toLocaleString()} lbs)
          </Button>
        )}

        {/* Price comparison */}
        {pricing && (
          <div className="space-y-4">
            <div className="bg-card border rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw size={16} className="text-emerald-600" />
                <h3 className="font-display font-bold text-sm">Price Comparison</h3>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Original Price</span>
                <span className="font-medium">{formatCurrency(oldTotal, currencyCode)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Weight</span>
                <span className="font-medium">{totalWeight.toLocaleString()} lbs</span>
              </div>
              {priceDiff !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Difference</span>
                  <Badge className={priceDiff > 0 ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}>
                    {priceDiff > 0 ? '+' : ''}{formatCurrency(priceDiff, currencyCode)}
                  </Badge>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleRecalculate} className="w-full mt-2" disabled={recalcLoading}>
                <RefreshCw size={14} className="mr-1" /> Recalculate Again
              </Button>
            </div>

            <PriceBreakdown pricing={pricing} truckSize={recommendTruckSize(totalWeight)} currencyCode={currencyCode} />

            <Button onClick={handleSavePrice} className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin mr-1" /> Saving...</> : <><Save size={16} className="mr-1" /> Update Move Price</>}
            </Button>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}