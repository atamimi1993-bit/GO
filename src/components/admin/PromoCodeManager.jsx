import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Ticket, Plus, Loader2, Power, Copy, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function PromoCodeManager() {
  const { toast } = useToast();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({
    code: '',
    discount_percent: 20,
    max_uses: 5,
    expires_at: '',
    description: '',
  });

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.PromoCode.list('-created_date', 50);
      setCodes(data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.discount_percent) return;
    setSaving(true);
    try {
      await base44.entities.PromoCode.create({
        code: form.code.trim().toUpperCase(),
        discount_percent: Number(form.discount_percent),
        max_uses: Number(form.max_uses) || 0,
        uses_count: 0,
        active: true,
        expires_at: form.expires_at || undefined,
        description: form.description || undefined,
      });
      toast({ title: 'Promo code created', description: `${form.code.trim().toUpperCase()} is now active` });
      setForm({ code: '', discount_percent: 20, max_uses: 5, expires_at: '', description: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const toggleActive = async (code) => {
    try {
      await base44.entities.PromoCode.update(code.id, { active: !code.active });
      toast({ title: code.active ? 'Promo code disabled' : 'Promo code enabled' });
      load();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const copyCode = (codeText) => {
    navigator.clipboard.writeText(codeText);
    setCopied(codeText);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="bg-card border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Ticket size={20} className="text-emerald-500" />
        <h2 className="font-display font-bold text-lg">Promo Codes</h2>
        <Button size="sm" className="ml-auto" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} className="mr-1" /> New Code
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 p-4 rounded-xl bg-muted/40 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="promo-code">Code</Label>
              <Input
                id="promo-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="GOFIRST20"
                className="font-mono uppercase"
                required
              />
            </div>
            <div>
              <Label htmlFor="promo-discount">Discount %</Label>
              <Input
                id="promo-discount"
                type="number"
                min="1"
                max="100"
                value={form.discount_percent}
                onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="promo-max">Max Uses (0 = unlimited)</Label>
              <Input
                id="promo-max"
                type="number"
                min="0"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="promo-expires">Expires (optional)</Label>
              <Input
                id="promo-expires"
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="promo-desc">Description (optional)</Label>
            <Input
              id="promo-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="20% off launch promo"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Plus size={14} className="mr-1" />}
              Create Code
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
      ) : codes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No promo codes yet.</p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm">{c.code}</span>
                  <button
                    onClick={() => copyCode(c.code)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Copy ${c.code}`}
                  >
                    {copied === c.code ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.discount_percent}% off · {c.uses_count}/{c.max_uses > 0 ? c.max_uses : '∞'} used
                  {c.expires_at ? ` · expires ${format(parseISO(c.expires_at), 'MMM d, yyyy')}` : ''}
                </p>
              </div>
              <Badge variant={c.active ? 'default' : 'secondary'}>
                {c.active ? 'Active' : 'Disabled'}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => toggleActive(c)}>
                <Power size={14} className={c.active ? 'text-amber-500' : 'text-emerald-500'} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}