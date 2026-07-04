import React, { useState } from 'react';
import { Plus, Trash2, MapPin, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function MultiStopEditor({ stops, onChange, maxStops = 5 }) {
  const addStop = () => {
    if (stops.length >= maxStops) return;
    onChange([...stops, '']);
  };

  const updateStop = (i, val) => {
    const updated = [...stops];
    updated[i] = val;
    onChange(updated);
  };

  const removeStop = (i) => {
    onChange(stops.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      {stops.map((stop, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-600 shrink-0">
            {i + 2}
          </div>
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              className="pl-9 min-h-[40px] text-sm"
              placeholder={`Stop #${i + 2} address`}
              value={stop}
              onChange={(e) => updateStop(i, e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-[40px] min-w-[40px] text-destructive"
            onClick={() => removeStop(i)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      {stops.length < maxStops && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed text-muted-foreground"
          onClick={addStop}
        >
          <Plus size={14} className="mr-1" /> Add Stop (max {maxStops})
        </Button>
      )}
      {stops.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {stops.length} additional stop{stops.length > 1 ? 's' : ''} — driver will route through each before final drop-off.
        </p>
      )}
    </div>
  );
}