import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, MapPin } from 'lucide-react';

export default function IntermediateStops({ stops, onChange }) {
  const handleAdd = () => {
    onChange([...stops, '']);
  };

  const handleRemove = (idx) => {
    onChange(stops.filter((_, i) => i !== idx));
  };

  const handleChange = (idx, value) => {
    onChange(stops.map((s, i) => (i === idx ? value : s)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2"><MapPin size={14} /> Intermediate Stops (Optional)</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus size={14} className="mr-1" /> Add Stop
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Add stops for pickups or drop-offs along the way (e.g. storage unit, second location).</p>
      {stops.map((stop, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold">
            {idx + 1}
          </div>
          <Input
            value={stop}
            onChange={(e) => handleChange(idx, e.target.value)}
            placeholder={`Stop ${idx + 1} — e.g. 789 Storage Ln, City`}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemove(idx)}
            aria-label={`Remove stop ${idx + 1}`}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
    </div>
  );
}