import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';

const CATEGORIES = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'fragile', label: 'Fragile Items' },
  { value: 'heavy_equipment', label: 'Heavy Equipment' },
  { value: 'clothing', label: 'Clothing / Bags' },
  { value: 'other', label: 'Other' },
];

export default function ItemForm({ onAdd }) {
  const [item, setItem] = useState({
    name: '', category: 'boxes', weight_lbs: '', quantity: 1, special_handling: false, notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!item.name || !item.weight_lbs) return;
    onAdd({ ...item, weight_lbs: Number(item.weight_lbs), quantity: Number(item.quantity) });
    setItem({ name: '', category: 'boxes', weight_lbs: '', quantity: 1, special_handling: false, notes: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-muted rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Item Name</Label>
          <Input
            placeholder="e.g. Couch, TV, Box of books"
            value={item.name}
            onChange={e => setItem({ ...item, name: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select value={item.category} onValueChange={v => setItem({ ...item, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Weight (lbs)</Label>
          <Input
            type="number"
            placeholder="50"
            value={item.weight_lbs}
            onChange={e => setItem({ ...item, weight_lbs: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Quantity</Label>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={e => setItem({ ...item, quantity: e.target.value })}
          />
        </div>
        <div className="flex items-end pb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={item.special_handling}
              onCheckedChange={v => setItem({ ...item, special_handling: v })}
            />
            <Label className="text-xs">Fragile / Special</Label>
          </div>
        </div>
      </div>
      <Button type="submit" size="sm" className="bg-emerald-500 hover:bg-emerald-600">
        <Plus size={16} className="mr-1" /> Add Item
      </Button>
    </form>
  );
}