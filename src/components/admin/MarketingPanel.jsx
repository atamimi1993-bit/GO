import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Megaphone, Loader2, Mail, Tag, Copy, ImageIcon, Users, Truck, RefreshCw,
} from 'lucide-react';

export default function MarketingPanel() {
  const { toast } = useToast();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  const load = useCallback(async () => {
    try {
      const active = await base44.entities.PromotionalAd.filter({ active: true }, '-created_date', 50);
      const now = new Date();
      const valid = active.filter((ad) => {
        const end = ad.campaign_end ? new Date(ad.campaign_end) : null;
        return !end || end >= now;
      });
      setAds(valid);
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendPromoEmail = async (ad) => {
    setSending(ad.id);
    try {
      const res = await base44.functions.invoke('send-promo-campaign', {
        campaign_title: ad.headline,
        campaign_description: ad.subtext,
        promo_code: ad.promo_code,
        audience: ad.audience || 'customers',
        discount_percent: ad.discount_percent,
      });
      const { emailsSent = 0, textsSent = 0, totalReach = 0 } = res.data || {};
      if (totalReach === 0) {
        toast({ title: 'No recipients', description: `No opted-in ${ad.audience || 'customers'} found.`, variant: 'destructive' });
      } else {
        toast({
          title: 'Campaign sent!',
          description: `${ad.headline}: ${emailsSent} email(s) and ${textsSent} text(s) delivered.`,
        });
      }
    } catch (err) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    }
    setSending(null);
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    toast({ title: 'Copied!', description: `Promo code "${code}" copied to clipboard.` });
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone size={20} className="text-purple-500" />
          <h2 className="font-display font-bold text-lg">Marketing & Promotions</h2>
        </div>
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
      </div>
    );
  }

  const customerAds = ads.filter((a) => (a.audience || 'customers') === 'customers');
  const driverAds = ads.filter((a) => a.audience === 'drivers');

  const renderAdCard = (ad) => (
    <div key={ad.id} className="border rounded-xl overflow-hidden flex flex-col">
      {/* Ad image area */}
      <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.headline} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-muted-foreground p-4">
            <ImageIcon size={28} className="mx-auto mb-2" />
            <p className="text-xs">No ad image yet</p>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge className={ad.audience === 'drivers' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}>
            {ad.audience === 'drivers' ? <><Truck size={10} className="mr-1" /> Drivers</> : <><Users size={10} className="mr-1" /> Customers</>}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-display font-bold text-sm mb-1">{ad.headline}</h3>
          <p className="text-xs text-muted-foreground">{ad.subtext}</p>
        </div>

        {/* Promo code */}
        {ad.promo_code && (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
              <Tag size={12} className="text-muted-foreground" />
              <span className="font-mono font-bold text-sm">{ad.promo_code}</span>
              {ad.discount_percent > 0 && <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-auto">{ad.discount_percent}% off</span>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => copyCode(ad.promo_code)} aria-label={`Copy promo code ${ad.promo_code}`}>
              <Copy size={14} />
            </Button>
          </div>
        )}

        {/* Send action */}
        <div className="mt-auto">
          <Button size="sm" className="w-full bg-purple-500 hover:bg-purple-600" aria-label={`Send ${ad.headline} campaign`} onClick={() => sendPromoEmail(ad)} disabled={sending === ad.id}>
            {sending === ad.id ? <Loader2 size={14} className="animate-spin mr-1" /> : <Mail size={14} className="mr-1" />}
            Broadcast
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-purple-500 rounded-lg p-1.5">
            <Megaphone size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Marketing & Promotions</h2>
            <p className="text-xs text-muted-foreground">Auto-generated ad campaigns. Customer ads refresh every 2 weeks, driver ads every month.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={load} aria-label="Refresh campaigns">
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {ads.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Megaphone size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No active campaigns right now. New ads are generated automatically.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {customerAds.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <Users size={14} className="text-emerald-500" /> Customer Campaigns
                <Badge variant="secondary" className="ml-1 text-xs">Every 2 weeks</Badge>
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customerAds.map(renderAdCard)}
              </div>
            </div>
          )}
          {driverAds.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <Truck size={14} className="text-blue-500" /> Driver Campaigns
                <Badge variant="secondary" className="ml-1 text-xs">Every month</Badge>
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {driverAds.map(renderAdCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}