import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Repeat, Loader2, Trash2, Plus, Calendar, Clock, Thermometer, PenLine } from 'lucide-react';
import MobileSelect from '@/components/go/MobileSelect';

const CATEGORIES = ['hospital','bank','office','pharmacy','lab_medical','legal_documents','retail','restaurant','other'];
const FREQUENCIES = [
  { key: 'daily', label: 'Every day' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Every 2 weeks' },
  { key: 'monthly', label: 'Monthly' },
];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const TIME_SLOTS = ['Morning (9-12)', 'Afternoon (12-3)', 'Late Afternoon (3-6)', 'Evening (6-9)'];

export default function RecurringDeliveries() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    pickup_address: '', dropoff_address: '', delivery_category: 'hospital',
    item_description: '', frequency: 'weekly', day_of_week: 1, time_slot: 'Morning (9-12)',
    requires_signature: false, temperature_controlled: false, notes: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setForm(f => ({ ...f, customer_name: u.full_name || '', customer_email: u.email || '' }));
    }).catch(() => {});
  }, []);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['recurringDeliveries', user?.email],
    queryFn: () => base44.entities.RecurringDelivery.filter({ customer_email: user.email }),
    enabled: !!user?.email,
  });

  const handleSave = async () => {
    if (!form.pickup_address || !form.dropoff_address || !user) return;
    setSaving(true);
    try {
      const now = new Date();
      await base44.entities.RecurringDelivery.create({
        ...form,
        customer_name: user.full_name,
        customer_email: user.email,
        active: true,
        next_trigger: new Date(now.getTime() + 86400000).toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['recurringDeliveries', user.email] });
      toast({ title: 'Recurring delivery scheduled!', description: 'We will auto-create deliveries on schedule.' });
      setShowForm(false);
      setForm({ pickup_address: '', dropoff_address: '', delivery_category: 'hospital', item_description: '', frequency: 'weekly', day_of_week: 1, time_slot: 'Morning (9-12)', requires_signature: false, temperature_controlled: false, notes: '' });
    } catch {
      toast({ title: 'Error saving schedule', variant: 'destructive' });
    }
    setSaving(false);
  };

  const toggleActive = async (id, current) => {
    await base44.entities.RecurringDelivery.update(id, { active: !current });
    queryClient.invalidateQueries({ queryKey: ['recurringDeliveries', user?.email] });
  };

  const handleDelete = async (id) => {
    await base44.entities.RecurringDelivery.delete(id);
    queryClient.invalidateQueries({ queryKey: ['recurringDeliveries', user?.email] });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="min-h-[44px] min-w-[44px]">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Repeat className="text-emerald-500" size={24} /> Recurring Deliveries
          </h1>
          <p className="text-muted-foreground text-sm">Automate daily, weekly, or monthly delivery schedules.</p>
        </div>
      </div>

      {!showForm ? (
        <Button className="w-full mb-4 bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowForm(true)}>
          <Plus size={18} className="mr-1" /> New Recurring Delivery
        </Button>
      ) : (
        <div className="bg-card border rounded-2xl p-5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Frequency</Label>
              <MobileSelect
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v })}
                options={FREQUENCIES.map(f => ({ value: f.key, label: f.label }))}
                placeholder="Select frequency"
              />
            </div>
            {form.frequency === 'weekly' || form.frequency === 'biweekly' ? (
              <div>
                <Label className="mb-1 block">Day of Week</Label>
                <MobileSelect
                  value={String(form.day_of_week)}
                  onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}
                  options={DAYS.map((d, i) => ({ value: String(i), label: d }))}
                  placeholder="Select day"
                />
              </div>
            ) : (
              <div>
                <Label className="mb-1 block">Time Slot</Label>
                <MobileSelect
                  value={form.time_slot}
                  onValueChange={(v) => setForm({ ...form, time_slot: v })}
                  options={TIME_SLOTS.map(t => ({ value: t, label: t }))}
                  placeholder="Select time slot"
                />
              </div>
            )}
          </div>
          <div>
            <Label className="mb-1 block">Pickup Address</Label>
            <Input className="min-h-[44px]" placeholder="Pickup location" value={form.pickup_address} onChange={e => setForm({...form, pickup_address: e.target.value})} />
          </div>
          <div>
            <Label className="mb-1 block">Drop-off Address</Label>
            <Input className="min-h-[44px]" placeholder="Drop-off location" value={form.dropoff_address} onChange={e => setForm({...form, dropoff_address: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Category</Label>
              <MobileSelect
                value={form.delivery_category}
                onValueChange={(v) => setForm({ ...form, delivery_category: v })}
                options={CATEGORIES.map(c => ({ value: c, label: c.replace(/_/g, ' ') }))}
                placeholder="Select category"
              />
            </div>
            {form.frequency !== 'weekly' && form.frequency !== 'biweekly' && (
              <div>
                <Label className="mb-1 block">Time Slot</Label>
                <MobileSelect
                  value={form.time_slot}
                  onValueChange={(v) => setForm({ ...form, time_slot: v })}
                  options={TIME_SLOTS.map(t => ({ value: t, label: t }))}
                  placeholder="Select time slot"
                />
              </div>
            )}
          </div>
          <div>
            <Label className="mb-1 block">Items</Label>
            <Textarea className="min-h-[44px]" placeholder="e.g. Lab samples in cooler" rows={2} value={form.item_description} onChange={e => setForm({...form, item_description: e.target.value})} />
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => setForm({...form, requires_signature: !form.requires_signature})} className={`flex items-center gap-1.5 text-sm ${form.requires_signature ? 'text-purple-600' : 'text-muted-foreground'}`}>
              <PenLine size={16} /> Signature required
            </button>
            <button type="button" onClick={() => setForm({...form, temperature_controlled: !form.temperature_controlled})} className={`flex items-center gap-1.5 text-sm ${form.temperature_controlled ? 'text-teal-600' : 'text-muted-foreground'}`}>
              <Thermometer size={16} /> Temp-controlled
            </button>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 min-h-[44px]" disabled={saving || !form.pickup_address || !form.dropoff_address} onClick={handleSave}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Schedule'}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Repeat size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No recurring deliveries scheduled.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map(s => (
            <div key={s.id} className={`bg-card border rounded-xl p-4 ${s.active ? '' : 'opacity-50'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 uppercase">{s.frequency}</span>
                    {(s.frequency === 'weekly' || s.frequency === 'biweekly') && <span className="text-xs text-muted-foreground">{DAYS[s.day_of_week]}</span>}
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> {s.time_slot}</span>
                  </div>
                  <div className="text-sm font-medium truncate">{s.pickup_address}</div>
                  <div className="text-sm text-muted-foreground truncate">→ {s.dropoff_address}</div>
                  {s.item_description && <div className="text-xs text-muted-foreground mt-1">{s.item_description}</div>}
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{s.delivery_category.replace(/_/g, ' ')}</span>
                    {s.requires_signature && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700">Sig.</span>}
                    {s.temperature_controlled && <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700">Temp</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="sm" className="min-h-[36px]" onClick={() => toggleActive(s.id, s.active)}>
                    {s.active ? 'Pause' : 'Resume'}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive min-h-[36px] min-w-[36px]" onClick={() => handleDelete(s.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}