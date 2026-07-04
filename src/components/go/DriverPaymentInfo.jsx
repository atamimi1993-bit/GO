import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Banknote, Loader2, ShieldCheck } from 'lucide-react';

export default function DriverPaymentInfo() {
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bank_name: '',
    bank_account_type: 'checking',
    bank_routing_number: '',
    bank_account_number: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
        if (profiles.length > 0) {
          const p = profiles[0];
          setProfile(p);
          setForm({
            bank_name: p.bank_name || '',
            bank_account_type: p.bank_account_type || 'checking',
            bank_routing_number: p.bank_routing_number || '',
            bank_account_number: '',
          });
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!form.bank_name || !form.bank_routing_number || !form.bank_account_number) {
      toast({ title: 'Missing fields', description: 'Please fill in all bank details.', variant: 'destructive' });
      return;
    }
    if (form.bank_routing_number.length !== 9) {
      toast({ title: 'Invalid routing number', description: 'Routing numbers must be 9 digits.', variant: 'destructive' });
      return;
    }
    if (form.bank_account_number.length < 4) {
      toast({ title: 'Invalid account number', description: 'Account number must be at least 4 digits.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const last4 = form.bank_account_number.slice(-4);
      const updated = await base44.entities.DriverProfile.update(profile.id, {
        bank_name: form.bank_name,
        bank_account_type: form.bank_account_type,
        bank_routing_number: form.bank_routing_number,
        bank_account_last4: last4,
      });
      setProfile(updated);
      setForm((prev) => ({ ...prev, bank_account_number: '' }));
      toast({ title: 'Payment info saved', description: 'Your bank details are on file for payouts.' });
    } catch (err) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Banknote size={20} className="text-emerald-600" />
          <h2 className="font-display font-bold text-lg">Payout Bank Details</h2>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-card border rounded-2xl p-6 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Banknote size={20} className="text-muted-foreground" />
          <h2 className="font-display font-bold text-lg">Payout Bank Details</h2>
        </div>
        <p className="text-sm text-muted-foreground">Register as a driver first to set up payout details.</p>
      </div>
    );
  }

  const hasBankOnFile = profile.bank_account_last4;

  return (
    <div className="bg-card border rounded-2xl p-6 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <Banknote size={20} className="text-emerald-600" />
        <h2 className="font-display font-bold text-lg">Payout Bank Details</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Your earnings are sent via direct deposit to this account.
      </p>

      {hasBankOnFile && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4 text-sm text-emerald-600 dark:text-emerald-400">
          <ShieldCheck size={16} />
          <span>On file: {profile.bank_name} · {profile.bank_account_type} · ****{profile.bank_account_last4}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label>Bank Name</Label>
          <Input
            value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
            placeholder="e.g. Chase, Bank of America"
          />
        </div>
        <div>
          <Label>Account Type</Label>
          <div className="flex gap-2 mt-1">
            {['checking', 'savings'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm({ ...form, bank_account_type: type })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  form.bank_account_type === type
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Routing Number (9 digits)</Label>
          <Input
            value={form.bank_routing_number}
            onChange={(e) => setForm({ ...form, bank_routing_number: e.target.value.replace(/\D/g, '').slice(0, 9) })}
            placeholder="021000021"
            inputMode="numeric"
          />
        </div>
        <div>
          <Label>Account Number {hasBankOnFile && <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>}</Label>
          <Input
            type="password"
            value={form.bank_account_number}
            onChange={(e) => setForm({ ...form, bank_account_number: e.target.value.replace(/\D/g, '').slice(0, 17) })}
            placeholder={hasBankOnFile ? `••••${profile.bank_account_last4}` : 'Enter full account number'}
            inputMode="numeric"
          />
          <p className="text-xs text-muted-foreground mt-1">Only the last 4 digits are stored.</p>
        </div>
        <Button
          className="w-full bg-emerald-500 hover:bg-emerald-600"
          disabled={saving || (!form.bank_account_number && !hasBankOnFile)}
          onClick={handleSave}
        >
          {saving ? <><Loader2 size={16} className="animate-spin mr-1" /> Saving...</> : 'Save Bank Details'}
        </Button>
      </div>
    </div>
  );
}