import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Trash2, Loader2, FileText } from 'lucide-react';
import AIScanItems from '@/components/go/AIScanItems';
import QuickAddItems from '@/components/go/QuickAddItems';
import ItemForm from '@/components/go/ItemForm';
import { formatCurrency, recommendTruckSize, TRUCK_SIZE_LABELS } from '@/lib/pricing';

export default function InventoryStep({ items, onAddItem, onAddItems, onRemoveItem, onUpdateQuantity, onUploadPDF, uploading, form, liveEstimate }) {
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