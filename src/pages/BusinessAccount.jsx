import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Loader2, Check, FileText } from 'lucide-react';

const INDUSTRIES = [
  { key: 'hospital', label: 'Hospital / Medical' },
  { key: 'bank', label: 'Bank / Financial' },
  { key: 'law_firm', label: 'Law Firm' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'lab', label: 'Laboratory' },
  { key: 'retail', label: 'Retail' },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'other', label: 'Other Business' },
];

export default function BusinessAccount() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: '', business_email: '', business_phone: '',
    industry: 'hospital', billing_type: 'per_delivery', contact_name: '',
    address: '', tax_id: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setForm(f => ({ ...f, business_email: u.email || '', contact_name: u.full_name || '' }));
    }).catch(() => {});
  }, []);

  const { data: accounts = [] } = useQuery({
    queryKey: ['businessAccounts', user?.email],
    queryFn: () => base44.entities.BusinessAccount.filter({ account_owner_email: user.email }),
    enabled: !!user?.email,
  });

  const handleSave = async () => {
    if (!form.business_name || !form.business_email || !user) return;
    setSaving(true);
    try {
      await base44.entities.BusinessAccount.create({ ...form, account_owner_email: user.email });
      queryClient.invalidateQueries({ queryKey: ['businessAccounts', user.email] });
      toast({ title: 'Business account created!', description: 'You can now book deliveries with monthly invoicing.' });
      setForm({ business_name: '', business_email: user.email, business_phone: '', industry: 'hospital', billing_type: 'per_delivery', contact_name: user.full_name, address: '', tax_id: '' });
    } catch {
      toast({ title: 'Error creating account', variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="min-h-[44px] min-w-[44px]">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Building2 className="text-emerald-500" size={24} /> Business Account
          </h1>
          <p className="text-muted-foreground text-sm">Monthly invoicing for hospitals, banks, labs, and law firms.</p>
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="space-y-2 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Your Accounts</h2>
          {accounts.map(acc => (
            <div key={acc.id} className="bg-card border rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Building2 className="text-emerald-600" size={18} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{acc.business_name}</div>
                <div className="text-xs text-muted-foreground">{acc.industry.replace(/_/g, ' ')} · {acc.billing_type.replace(/_/g, ' ')}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${acc.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>
                {acc.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border rounded-2xl p-5 space-y-3">
        <h2 className="font-display font-bold text-lg">Register New Business</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block">Business Name</Label>
            <Input className="min-h-[44px]" placeholder="General Hospital" value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} />
          </div>
          <div>
            <Label className="mb-1 block">Industry</Label>
            <select className="w-full h-11 rounded-md border border-input bg-transparent px-3 text-sm" value={form.industry} onChange={e => setForm({...form, industry: e.target.value})}>
              {INDUSTRIES.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block">Business Email</Label>
            <Input className="min-h-[44px]" placeholder="billing@hospital.com" value={form.business_email} onChange={e => setForm({...form, business_email: e.target.value})} />
          </div>
          <div>
            <Label className="mb-1 block">Phone</Label>
            <Input className="min-h-[44px]" placeholder="(555) 123-4567" value={form.business_phone} onChange={e => setForm({...form, business_phone: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block">Contact Name</Label>
            <Input className="min-h-[44px]" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} />
          </div>
          <div>
            <Label className="mb-1 block">Tax ID (optional)</Label>
            <Input className="min-h-[44px]" placeholder="EIN" value={form.tax_id} onChange={e => setForm({...form, tax_id: e.target.value})} />
          </div>
        </div>
        <div>
          <Label className="mb-1 block">Business Address</Label>
          <Input className="min-h-[44px]" placeholder="123 Medical Center Dr, City, State" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
        </div>
        <div>
          <Label className="mb-1 block">Billing Preference</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({...form, billing_type: 'per_delivery'})}
              className={`p-3 rounded-xl border-2 text-left ${form.billing_type === 'per_delivery' ? 'border-emerald-500 bg-emerald-500/5' : 'border-border'}`}
            >
              <div className="text-sm font-semibold">Per Delivery</div>
              <div className="text-xs text-muted-foreground">Pay for each delivery individually</div>
            </button>
            <button
              type="button"
              onClick={() => setForm({...form, billing_type: 'monthly_invoice'})}
              className={`p-3 rounded-xl border-2 text-left ${form.billing_type === 'monthly_invoice' ? 'border-emerald-500 bg-emerald-500/5' : 'border-border'}`}
            >
              <div className="text-sm font-semibold">Monthly Invoice</div>
              <div className="text-xs text-muted-foreground">Net-30 consolidated billing</div>
            </button>
          </div>
        </div>
        <Button className="w-full bg-emerald-500 hover:bg-emerald-600 min-h-[48px]" disabled={saving || !form.business_name || !form.business_email} onClick={handleSave}>
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />} Create Business Account
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <FileText size={14} />
        <span>Monthly invoice accounts are reviewed within 1 business day.</span>
      </div>
    </div>
  );
}