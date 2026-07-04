import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Check } from 'lucide-react';

const COMMON_ITEMS = [
  { name: 'Sofa (3-seat)', category: 'furniture', weight_lbs: 150 },
  { name: 'Loveseat (2-seat)', category: 'furniture', weight_lbs: 100 },
  { name: 'Armchair', category: 'furniture', weight_lbs: 75 },
  { name: 'Coffee Table', category: 'furniture', weight_lbs: 50 },
  { name: 'Dining Table', category: 'furniture', weight_lbs: 120 },
  { name: 'Dining Chair', category: 'furniture', weight_lbs: 20 },
  { name: 'TV Stand', category: 'furniture', weight_lbs: 40 },
  { name: 'Bookshelf', category: 'furniture', weight_lbs: 80 },
  { name: 'Desk', category: 'furniture', weight_lbs: 90 },
  { name: 'Office Chair', category: 'furniture', weight_lbs: 35 },
  { name: 'Dresser', category: 'furniture', weight_lbs: 130 },
  { name: 'Nightstand', category: 'furniture', weight_lbs: 40 },
  { name: 'Wardrobe/Closet', category: 'furniture', weight_lbs: 180 },
  { name: 'Queen Bed Frame', category: 'furniture', weight_lbs: 120 },
  { name: 'King Bed Frame', category: 'furniture', weight_lbs: 150 },
  { name: 'Twin Bed Frame', category: 'furniture', weight_lbs: 80 },
  { name: 'Queen Mattress', category: 'furniture', weight_lbs: 100 },
  { name: 'King Mattress', category: 'furniture', weight_lbs: 130 },
  { name: 'Twin Mattress', category: 'furniture', weight_lbs: 60 },
  { name: 'Bunk Bed', category: 'furniture', weight_lbs: 200 },
  { name: 'Crib', category: 'furniture', weight_lbs: 60 },
  { name: 'Cabinet', category: 'furniture', weight_lbs: 100 },
  { name: 'Bar Stool', category: 'furniture', weight_lbs: 15 },
  { name: 'Piano (Upright)', category: 'heavy_equipment', weight_lbs: 500, special_handling: true },
  { name: 'Piano (Grand)', category: 'heavy_equipment', weight_lbs: 900, special_handling: true },
  { name: 'Safe', category: 'heavy_equipment', weight_lbs: 300, special_handling: true },
  { name: 'Treadmill', category: 'heavy_equipment', weight_lbs: 250 },
  { name: 'Washing Machine', category: 'appliances', weight_lbs: 170 },
  { name: 'Dryer', category: 'appliances', weight_lbs: 150 },
  { name: 'Refrigerator', category: 'appliances', weight_lbs: 250 },
  { name: 'Freezer', category: 'appliances', weight_lbs: 200 },
  { name: 'Oven/Stove', category: 'appliances', weight_lbs: 180 },
  { name: 'Microwave', category: 'appliances', weight_lbs: 40 },
  { name: 'Dishwasher', category: 'appliances', weight_lbs: 80 },
  { name: 'Dining Set (Table + 6 Chairs)', category: 'furniture', weight_lbs: 240 },
  { name: 'Bedroom Set (Bed + Dresser + 2 Nightstands)', category: 'furniture', weight_lbs: 330 },
  { name: 'Living Room Set (Sofa + Loveseat + Coffee Table)', category: 'furniture', weight_lbs: 300 },
  { name: 'TV (32"-50")', category: 'electronics', weight_lbs: 30 },
  { name: 'TV (55"+)', category: 'electronics', weight_lbs: 50 },
  { name: 'TV (65"+)', category: 'electronics', weight_lbs: 70 },
  { name: 'Desktop Computer', category: 'electronics', weight_lbs: 30 },
  { name: 'Gaming Console', category: 'electronics', weight_lbs: 10 },
  { name: 'Home Theater System', category: 'electronics', weight_lbs: 50 },
  { name: 'Floor Lamp', category: 'furniture', weight_lbs: 15 },
  { name: 'Rug (Large)', category: 'furniture', weight_lbs: 40 },
  { name: 'Mirror (Large)', category: 'fragile', weight_lbs: 25, special_handling: true },
  { name: 'Artwork/Framed Picture', category: 'fragile', weight_lbs: 15, special_handling: true },
  { name: 'Box of Books', category: 'boxes', weight_lbs: 50 },
  { name: 'Box of Clothes', category: 'boxes', weight_lbs: 35 },
  { name: 'Box of Kitchen Items', category: 'boxes', weight_lbs: 45 },
  { name: 'Box of Dishes', category: 'fragile', weight_lbs: 40, special_handling: true },
  { name: 'Box of Misc', category: 'boxes', weight_lbs: 30 },
  { name: 'Suitcase', category: 'clothing', weight_lbs: 40 },
  { name: 'Garment Bag', category: 'clothing', weight_lbs: 15 },
  { name: 'Bicycle', category: 'other', weight_lbs: 30 },
  { name: 'Exercise Bike', category: 'heavy_equipment', weight_lbs: 120 },
  { name: 'BBQ Grill', category: 'other', weight_lbs: 100 },
  { name: 'Patio Furniture Set', category: 'furniture', weight_lbs: 150 },
  { name: 'Garden Hose Reel', category: 'other', weight_lbs: 25 },
  { name: 'Lawn Mower', category: 'other', weight_lbs: 90 },
  { name: 'Filing Cabinet', category: 'furniture', weight_lbs: 120 },
  { name: 'Storage Ottoman', category: 'furniture', weight_lbs: 30 },
  { name: 'Shoe Rack', category: 'furniture', weight_lbs: 20 },
];

export default function QuickAddItems({ onAdd, existingItems }) {
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState({});

  const filtered = COMMON_ITEMS.filter(item =>
    !search || item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (item) => {
    const qty = quantities[item.name] || 1;
    onAdd({ ...item, quantity: qty });
    setQuantities({ ...quantities, [item.name]: 1 });
  };

  return (
    <div className="bg-card border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Plus size={18} className="text-emerald-600" />
        <h3 className="font-display font-bold text-sm">Quick Add Common Items</h3>
      </div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search common items"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
        {filtered.map(item => {
          const qty = quantities[item.name] || 1;
          return (
            <div
              key={item.name}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.weight_lbs} lbs{item.special_handling ? ' · ⚠️ Fragile' : ''}
                </p>
              </div>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={e => setQuantities({ ...quantities, [item.name]: Number(e.target.value) || 1 })}
                className="w-14 min-h-[44px] text-center text-sm"
                aria-label={`Quantity for ${item.name}`}
              />
              <Button
                size="sm"
                variant="ghost"
                className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 h-9 w-9 p-0 shrink-0"
                onClick={() => handleAdd(item)}
                aria-label={`Add ${item.name}`}
              >
                <Plus size={16} />
              </Button>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No items found. Try adding one manually below.
        </p>
      )}
    </div>
  );
}