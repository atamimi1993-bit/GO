import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Trash2, Loader2, FileText, Package } from 'lucide-react';
import AIScanItems from '@/components/go/AIScanItems';
import QuickAddItems from '@/components/go/QuickAddItems';
import ItemForm from '@/components/go/ItemForm';
import { formatCurrency, recommendTruckSize, TRUCK_SIZE_LABELS, BULKY_WEIGHT_THRESHOLD, BULKY_ITEM_FEE } from '@/lib/pricing';

export default function InventoryStep({ items, onAddItem, onAddItems, onRemoveItem, onUpdateQuantity, onUploadPDF, uploading, form, setForm, liveEstimate }) {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight_lbs * item.quantity), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Your Inventory</h2>
        <p className="text-muted-foreground text-sm">List everything you're moving — or let AI scan your space.</p>
      </div>

      <AIScanItems onItemsGenerated={onAddItems} existingItems={items} />

      <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center">
        <FileText className="mx-auto text-muted-foreground mb-2" size={32} />
        <p className="text-sm text-muted-foreground mb-3">Upload a PDF or CSV inventory list</p>
        <label className="cursor-pointer">
          <Button variant="outline" size="sm" disabled={uploading} asChild>
            <span>
              {uploading
                ? <><Loader2 size={14} className="mr-1 animate-spin" /> Extracting...</>
                : <><Upload size={14} className="mr-1" /> Upload File</>}
            </span>
          </Button>
          <input type="file" accept=".pdf,.csv,.xlsx" className="hidden" onChange={onUploadPDF} />
        </label>
      </div>

      <QuickAddItems onAdd={onAddItem} existingItems={items} />
      <ItemForm onAdd={onAddItem} />

      {items.length > 0 && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-muted border-b flex justify-between items-center">
            <span className="text-sm font-medium">{items.length} item{items.length > 1 ? 's' : ''}</span>
            <span className="text-sm font-bold text-emerald-600">
              {totalWeight.toLocaleString()} lbs total · {TRUCK_SIZE_LABELS[recommendTruckSize(totalWeight)]?.split('(')[0]?.trim()} truck
            </span>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.weight_lbs} lbs each · {item.category}{item.special_handling ? ' · ⚠️ Fragile' : ''} · {(item.weight_lbs * item.quantity).toLocaleString()} lbs total
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => onUpdateQuantity(i, e.target.value)}
                    className="w-14 h-9 text-center text-sm"
                    aria-label={`Quantity for ${item.name}`}
                  />
                  <button
                    onClick={() => onRemoveItem(i)}
                    className="text-muted-foreground hover:text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulky item notice */}
      {(() => {
        const bulkyCount = items.filter(i => i.special_handling || i.weight_lbs >= BULKY_WEIGHT_THRESHOLD).reduce((s, i) => s + i.quantity, 0);
        if (bulkyCount === 0) return null;
        return (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
            <Package size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{bulkyCount} bulky item{bulkyCount > 1 ? 's' : ''} detected</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Items marked fragile or over {BULKY_WEIGHT_THRESHOLD} lbs incur a ${BULKY_ITEM_FEE} surcharge each. This covers the extra care and effort needed to move them safely.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Packing materials */}
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Package size={16} className="text-emerald-600" />
          <h3 className="font-display font-bold text-sm">Need Packing Materials?</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Standard wrapping is included. If you need extra boxes, bubble wrap, or specialty packing materials, enter the estimated cost here.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground shrink-0">{formatCurrency(0, form.currency).replace(/[\d.,\s]/g, '')}</span>
          <Input
            type="number"
            min={0}
            placeholder="e.g. 45.00"
            value={form.materials_fee || ''}
            onChange={e => setForm(f => ({ ...f, materials_fee: Number(e.target.value) || 0 }))}
            className="flex-1"
            aria-label="Packing materials cost"
          />
          <span className="text-xs text-muted-foreground shrink-0">{form.currency}</span>
        </div>
      </div>

      {liveEstimate && (
        <div className="sticky bottom-4 z-10 bg-emerald-600 text-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-emerald-100">Grand Total Estimate</p>
              <p className="text-2xl font-display font-black">{formatCurrency(liveEstimate.totalPrice, form.currency)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-emerald-100">{totalWeight.toLocaleString()} lbs · {form.distance_miles} {form.distance_unit}</p>
              <p className="text-sm font-medium">{TRUCK_SIZE_LABELS[recommendTruckSize(totalWeight)]?.split('(')[0]?.trim()} truck</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}