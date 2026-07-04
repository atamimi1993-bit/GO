import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Warehouse, Truck } from 'lucide-react';

export default function TimingStep({ form, setForm }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">When & How</h2>
        <p className="text-muted-foreground text-sm">Tell us when you'd like to move and if you need storage.</p>
      </div>
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2"><Calendar size={14} /> Move Date</Label>
            <Input
              type="date"
              value={form.move_date}
              onChange={e => setForm({ ...form, move_date: e.target.value })}
            />
          </div>
          <div>
            <Label className="flex items-center gap-2"><Clock size={14} /> Preferred Time</Label>
            <Input
              type="time"
              value={form.move_time}
              onChange={e => setForm({ ...form, move_time: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Service Type</Label>
          <div
            className={`flex items-center justify-between rounded-xl p-4 border-2 cursor-pointer transition-colors ${
              !form.needs_storage ? 'border-emerald-500 bg-emerald-500/5' : 'border-border'
            }`}
            onClick={() => setForm({ ...form, needs_storage: false })}
          >
            <div className="flex items-center gap-3">
              <Truck className={!form.needs_storage ? 'text-emerald-600' : 'text-muted-foreground'} size={20} />
              <div>
                <p className="font-medium text-sm">Straight Delivery</p>
                <p className="text-xs text-muted-foreground">Pick up and deliver directly to your destination.</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 ${!form.needs_storage ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground'}`} />
          </div>
          <div
            className={`flex items-center justify-between rounded-xl p-4 border-2 cursor-pointer transition-colors ${
              form.needs_storage ? 'border-emerald-500 bg-emerald-500/5' : 'border-border'
            }`}
            onClick={() => setForm({ ...form, needs_storage: true })}
          >
            <div className="flex items-center gap-3">
              <Warehouse className={form.needs_storage ? 'text-emerald-600' : 'text-muted-foreground'} size={20} />
              <div>
                <p className="font-medium text-sm">Need Storage</p>
                <p className="text-xs text-muted-foreground">We'll help you find a storage facility along the way.</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 ${form.needs_storage ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground'}`} />
          </div>
        </div>

        <div>
          <Label>Notes (optional)</Label>
          <Textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Stairs, elevator access, special instructions..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}