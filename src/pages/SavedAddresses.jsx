import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, MapPin, Loader2 } from 'lucide-react';
import MobileSelect from '@/components/go/MobileSelect';

const CATEGORIES = ['hospital','bank','office','pharmacy','lab_medical','legal_documents','retail','restaurant','other'];

export default function SavedAddresses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: '', address: '', contact_name: '', contact_phone: '', category: 'other' });

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['savedAddresses', user?.email],
    queryFn: () => base44.entities.SavedAddress.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const handleSave = async () => {
    if (!form.label || !form.address || !user) return;
    setSaving(true);
    try {
      await base44.entities.SavedAddress.create({ ...form, user_email: user.email });
      queryClient.invalidateQueries({ queryKey: ['savedAddresses', user.email] });
      setForm({ label: '', address: '', contact_name: '', contact_phone: '', category: 'other' });
      setShowForm(false);
      toast({ title: 'Address saved!' });
    } catch {
      toast({ title: 'Error saving address', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.SavedAddress.delete(id);
    queryClient.invalidateQueries({ queryKey: ['savedAddresses', user?.email] });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="min-h-[44px] min-w-[44px]">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">Saved Addresses</h1>
          <p className="text-muted-foreground text-sm">Quick-fill your frequent pickup and drop-off locations.</p>
        </div>
      </div>

      {!showForm ? (
        <Button className="w-full mb-4" variant="outline" onClick={() => setShowForm(true)}>
          <Plus size={18} className="mr-1" /> Add Address
        </Button>
      ) : (
        <div className="bg-card border rounded-2xl p-5 mb-4 space-y-3">
          <div>
            <Label className="mb-1 block">Label</Label>
            <Input className="min-h-[44px]" placeholder="e.g. Hospital Loading Dock" value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
          </div>
          <div>
            <Label className="mb-1 block">Address</Label>
            <Input className="min-h-[44px]" placeholder="123 Main St, City, State" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Contact Name</Label>
              <Input className="min-h-[44px]" placeholder="Dr. Smith" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} />
            </div>
            <div>
              <Label className="mb-1 block">Contact Phone</Label>
              <Input className="min-h-[44px]" placeholder="(555) 123-4567" value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} />
            </div>
          </div>
          <div>
            <Label className="mb-1 block">Category</Label>
            <MobileSelect
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
              options={CATEGORIES.map(c => ({ value: c, label: c.replace(/_/g, ' ') }))}
              placeholder="Select category"
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 min-h-[44px]" disabled={saving || !form.label || !form.address} onClick={handleSave}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Address'}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground"><Loader2 className="animate-spin mx-auto" /></div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No saved addresses yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map(addr => (
            <div key={addr.id} className="bg-card border rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <MapPin className="text-emerald-600" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{addr.label}</div>
                <div className="text-sm text-muted-foreground truncate">{addr.address}</div>
                {addr.contact_name && <div className="text-xs text-muted-foreground mt-0.5">{addr.contact_name} · {addr.contact_phone}</div>}
                {addr.category && addr.category !== 'other' && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{addr.category.replace(/_/g, ' ')}</span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="text-destructive min-h-[40px] min-w-[40px]" onClick={() => handleDelete(addr.id)}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}