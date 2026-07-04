import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import SectionSkeleton from '@/components/admin/SectionSkeleton';
import { Megaphone, Loader2, Plus, Pause, Play, ExternalLink, Eye, MousePointerClick } from 'lucide-react';
import MobileSelect from '@/components/go/MobileSelect';

const PLACEMENT_OPTIONS = [
  { value: 'homepage_banner', label: 'Homepage Banner' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'in_app', label: 'In-App' },
  { value: 'move_confirmation', label: 'Move Confirmation' },
  { value: 'email', label: 'Email Insert' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'customers', label: 'Customers' },
  { value: 'drivers', label: 'Drivers' },
  { value: 'business', label: 'Business' },
];

export default function AdManagement() {
  const { toast } = useToast();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    advertiser_name: '', advertiser_email: '', title: '', description: '',
    target_url: '', image_url: '', placement: 'homepage_banner', audience: 'all',
  });

  const load = useCallback(async () => {
    try {
      const res = await base44.entities.AdSlot.list('-created_date', 50);
      setAds(res);
    } catch (err) {
      toast({ title: 'Failed to load ads', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreateCheckout = async () => {
    if (!form.advertiser_name || !form.advertiser_email || !form.title) {
      toast({ title: 'Missing fields', description: 'Advertiser name, email, and title are required.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await base44.functions.invoke('ad-management', { action: 'create_ad_checkout', ...form });
      if (res.data?.checkout_url) {
        toast({ title: 'Redirecting to checkout...', description: 'The ad will go live once payment is confirmed.' });
        setTimeout(() => { window.open(res.data.checkout_url, '_blank'); }, 500);
      }
    } catch (err) {
      toast({ title: 'Checkout failed', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const toggleAd = async (ad) => {
    try {
      await base44.functions.invoke('ad-management', {
        action: ad.status === 'active' ? 'pause_ad' : 'resume_ad',
        ad_id: ad.id,
      });
      toast({ title: ad.status === 'active' ? 'Ad paused' : 'Ad resumed' });
      load();
    } catch (err) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <SectionSkeleton />;

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-indigo-500 rounded-xl p-2.5 flex items-center justify-center">
          <Megaphone className="text-white" size={22} />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-bold text-lg">Ad Space Management</h2>
          <p className="text-muted-foreground text-sm">Sell ad placements — $99/month per slot.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={16} className="mr-1" /> New Ad
        </Button>
      </div>

      {showForm && (
        <div className="bg-muted/30 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Advertiser Name</Label>
              <Input value={form.advertiser_name} onChange={e => setForm({...form, advertiser_name: e.target.value})} placeholder="Acme Moving Supplies" />
            </div>
            <div>
              <Label className="text-xs">Advertiser Email</Label>
              <Input value={form.advertiser_email} onChange={e => setForm({...form, advertiser_email: e.target.value})} placeholder="contact@acme.com" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Ad Title</Label>
            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Get 20% off moving boxes!" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Premium moving supplies delivered to your door..." rows={2} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Target URL</Label>
              <Input value={form.target_url} onChange={e => setForm({...form, target_url: e.target.value})} placeholder="https://acme.com" />
            </div>
            <div>
              <Label className="text-xs">Image URL (optional)</Label>
              <Input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://...banner.jpg" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Placement</Label>
              <MobileSelect
                value={form.placement}
                onValueChange={(v) => setForm({...form, placement: v})}
                options={PLACEMENT_OPTIONS}
                placeholder="Select placement"
              />
            </div>
            <div>
              <Label className="text-xs">Audience</Label>
              <MobileSelect
                value={form.audience}
                onValueChange={(v) => setForm({...form, audience: v})}
                options={AUDIENCE_OPTIONS}
                placeholder="Select audience"
              />
            </div>
          </div>
          <Button onClick={handleCreateCheckout} disabled={creating} className="w-full bg-indigo-500 hover:bg-indigo-600">
            {creating ? <Loader2 size={16} className="animate-spin" /> : 'Create & Send Checkout ($99/mo)'}
          </Button>
        </div>
      )}

      {ads.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Megaphone className="mx-auto mb-2 opacity-40" size={32} />
          No ads yet. Click "New Ad" to sell your first placement.
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div key={ad.id} className="border rounded-xl p-3 flex items-center gap-3">
              {ad.image_url ? (
                <img src={ad.image_url} alt={ad.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Megaphone size={20} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{ad.title}</p>
                  <Badge variant="secondary" className={ad.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400' : ''}>
                    {ad.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{ad.advertiser_name} · {ad.placement}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye size={10} />{ad.impressions || 0}</span>
                  <span className="flex items-center gap-1"><MousePointerClick size={10} />{ad.clicks || 0}</span>
                  {ad.target_url && (
                    <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <ExternalLink size={10} />Visit
                    </a>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => toggleAd(ad)} title={ad.status === 'active' ? 'Pause' : 'Resume'}>
                {ad.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}