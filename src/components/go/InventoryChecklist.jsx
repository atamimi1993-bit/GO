import React, { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, RotateCcw, Package } from 'lucide-react';
import { recommendTruckSize, TRUCK_SIZE_LABELS } from '@/lib/pricing';

const CHECKLIST_ITEMS = [
  // Furniture
  { name: 'Sofa (3-seat)', category: 'Furniture', weight_lbs: 150 },
  { name: 'Loveseat (2-seat)', category: 'Furniture', weight_lbs: 100 },
  { name: 'Armchair', category: 'Furniture', weight_lbs: 75 },
  { name: 'Coffee Table', category: 'Furniture', weight_lbs: 50 },
  { name: 'Dining Table', category: 'Furniture', weight_lbs: 120 },
  { name: 'Dining Chair', category: 'Furniture', weight_lbs: 20 },
  { name: 'Dresser', category: 'Furniture', weight_lbs: 130 },
  { name: 'Nightstand', category: 'Furniture', weight_lbs: 40 },
  { name: 'Bookshelf', category: 'Furniture', weight_lbs: 80 },
  { name: 'Desk', category: 'Furniture', weight_lbs: 90 },
  { name: 'Wardrobe/Closet', category: 'Furniture', weight_lbs: 180 },
  { name: 'Cabinet', category: 'Furniture', weight_lbs: 100 },
  { name: 'TV Stand', category: 'Furniture', weight_lbs: 40 },
  { name: 'Office Chair', category: 'Furniture', weight_lbs: 35 },
  // Beds & Mattresses
  { name: 'Queen Bed Frame', category: 'Beds & Mattresses', weight_lbs: 120 },
  { name: 'King Bed Frame', category: 'Beds & Mattresses', weight_lbs: 150 },
  { name: 'Twin Bed Frame', category: 'Beds & Mattresses', weight_lbs: 80 },
  { name: 'Queen Mattress', category: 'Beds & Mattresses', weight_lbs: 100 },
  { name: 'King Mattress', category: 'Beds & Mattresses', weight_lbs: 130 },
  { name: 'Twin Mattress', category: 'Beds & Mattresses', weight_lbs: 60 },
  { name: 'Bunk Bed', category: 'Beds & Mattresses', weight_lbs: 200 },
  { name: 'Crib', category: 'Beds & Mattresses', weight_lbs: 60 },
  // Appliances
  { name: 'Refrigerator', category: 'Appliances', weight_lbs: 250 },
  { name: 'Washing Machine', category: 'Appliances', weight_lbs: 170 },
  { name: 'Dryer', category: 'Appliances', weight_lbs: 150 },
  { name: 'Oven/Stove', category: 'Appliances', weight_lbs: 180 },
  { name: 'Dishwasher', category: 'Appliances', weight_lbs: 80 },
  { name: 'Microwave', category: 'Appliances', weight_lbs: 40 },
  // Electronics
  { name: 'TV (32"-50")', category: 'Electronics', weight_lbs: 30 },
  { name: 'TV (55"+)', category: 'Electronics', weight_lbs: 50 },
  { name: 'TV (65"+)', category: 'Electronics', weight_lbs: 70 },
  { name: 'Desktop Computer', category: 'Electronics', weight_lbs: 30 },
  // Boxes
  { name: 'Box of Books', category: 'Boxes', weight_lbs: 50 },
  { name: 'Box of Clothes', category: 'Boxes', weight_lbs: 35 },
  { name: 'Box of Kitchen Items', category: 'Boxes', weight_lbs: 45 },
  { name: 'Box of Dishes', category: 'Boxes', weight_lbs: 40, special_handling: true },
  { name: 'Box of Misc', category: 'Boxes', weight_lbs: 30 },
  { name: 'Suitcase', category: 'Boxes', weight_lbs: 40 },
];

const CATEGORY_MAP = {
  'Furniture': 'furniture',
  'Beds & Mattresses': 'furniture',
  'Appliances': 'appliances',
  'Electronics': 'electronics',
  'Boxes': 'boxes',
};

export default function InventoryChecklist({ onAddItems, existingItems }) {
  const [checked, setChecked] = useState({});
  const [quantities, setQuantities] = useState({});

  const existingNames = useMemo(
    () => new Set(existingItems.map(i => i.name)),
    [existingItems]
  );

  const grouped = useMemo(() => {
    const groups = {};
    CHECKLIST_ITEMS.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, []);

  const totalWeight = useMemo(() => {
    return CHECKLIST_ITEMS.reduce((sum, item) => {
      if (!checked[item.name]) return sum;
      const qty = quantities[item.name] || 1;
      return sum + item.weight_lbs * qty;
    }, 0);
  }, [checked, quantities]);

  const checkedCount = Object.values(checked).filter(Boolean).length;

  const toggleItem = (item) => {
    setChecked(prev => {
      const next = { ...prev, [item.name]: !prev[item.name] };
      if (!prev[item.name] && !quantities[item.name]) {
        setQuantities(q => ({ ...q, [item.name]: 1 }));
      }
      return next;
    });
  };

  const setQty = (name, qty) => {
    setQuantities(prev => ({ ...prev, [name]: Math.max(1, Number(qty) || 1) }));
  };

  const handleAddAll = () => {
    const selected = CHECKLIST_ITEMS
      .filter(item => checked[item.name])
      .map(item => ({
        ...item,
        category: CATEGORY_MAP[item.category] || 'other',
        quantity: quantities[item.name] || 1,
      }));
    if (selected.length === 0) return;
    onAddItems(selected);
    setChecked({});
    setQuantities({});
  };

  const handleReset = () => {
    setChecked({});
    setQuantities({});
  };

  return (
    <div className="bg-card border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-emerald-600" />
          <h3 className="font-display font-bold text-sm">Quick Inventory Checklist</h3>
        </div>
        {checkedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs h-8">
            <RotateCcw size={14} className="mr-1" /> Reset
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Check off the items you have and set quantities. Your total weight updates automatically for an accurate quote.
      </p>

      <div className="space-y-5 max-h-80 overflow-y-auto pr-1 overscroll-none">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{category}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {items.map(item => {
                const isChecked = !!checked[item.name];
                const alreadyAdded = existingNames.has(item.name);
                return (
                  <div
                    key={item.name}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                      isChecked ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-muted/50 hover:bg-muted border border-transparent'
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleItem(item)}
                      id={`chk-${item.name}`}
                    />
                    <label htmlFor={`chk-${item.name}`} className="min-w-0 flex-1 cursor-pointer">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.weight_lbs} lbs{item.special_handling ? ' · ⚠️ Fragile' : ''}
                        {alreadyAdded ? ' · ✓ Added' : ''}
                      </p>
                    </label>
                    {isChecked && (
                      <Input
                        type="number"
                        min={1}
                        value={quantities[item.name] || 1}
                        onChange={e => setQty(item.name, e.target.value)}
                        className="w-14 h-9 text-center text-sm shrink-0"
                        aria-label={`Quantity for ${item.name}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {checkedCount > 0 && (
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Package size={16} className="text-emerald-600" />
              <span className="text-muted-foreground">{checkedCount} item type{checkedCount > 1 ? 's' : ''} selected</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Estimated Weight</p>
              <p className="text-lg font-display font-black text-emerald-600">
                {totalWeight.toLocaleString()} lbs
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Recommended: <span className="font-medium text-foreground">
                {TRUCK_SIZE_LABELS[recommendTruckSize(totalWeight)]?.split('(')[0]?.trim()} truck
              </span>
            </p>
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={handleAddAll}
            >
              <ClipboardCheck size={16} className="mr-1" /> Add {checkedCount} to Inventory
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}