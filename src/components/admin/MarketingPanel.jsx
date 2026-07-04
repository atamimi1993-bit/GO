import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Megaphone, Sparkles, Loader2, Mail, Tag, Copy, ImageIcon, Users, Truck, CheckCircle2,
} from 'lucide-react';

const PRESET_CAMPAIGNS = [
  {
    code: 'WELCOME10',
    discount_percent: 10,
    title: 'First Move Welcome',
    description: '10% off your first move — welcome to the GO family!',
    audience: 'customers',
    ad_prompt: 'A bright, cheerful moving truck parked in front of a sunny suburban home, movers carrying boxes, welcoming warm tones, professional advertising style, clean modern look',
  },
  {
    code: 'SUMMER25',
    discount_percent: 25,
    title: 'Summer Move Sale',
    description: 'Save 25% on all summer moves — book before the season ends!',
    audience: 'customers',
    ad_prompt: 'A vibrant summer-themed moving scene, golden sunlight, happy family moving into a new home, palm trees, bright colors, promotional advertising poster style',
  },
  {
    code: 'REFER50',
    discount_percent: 15,
    title: 'Refer a Friend',
    description: 'Refer a friend and you both get 15% off your next move.',
    audience: 'customers',
    ad_prompt: 'Two happy friends giving a high-five in front of a moving truck, community referral concept, warm friendly colors, clean advertising design',
  },
  {
    code: 'DRIVERBONUS',
    discount_percent: 0,
    title: 'Driver Bonus Payout',
    description: 'Complete 5 jobs this month for a $200 bonus payout.',
    audience: 'drivers',
    ad_prompt: 'A confident professional truck driver standing next to their truck, achievement badge and bonus theme, motivational poster style, energetic tones',
  },
  {
    code: 'WEEKEND15',
    discount_percent: 15,
    title: 'Weekend Warrior Special',
    description: 'Book a weekend move and save 15% — flexible scheduling included.',
    audience: 'customers',
    ad_prompt: 'A weekend moving scene with bright blue sky, family loading boxes into a truck on a Saturday morning, energetic and clean advertising style',
  },
  {
    code: 'STORAGE20',
    discount_percent: 20,
    title: 'Move + Storage Bundle',
    description: '20% off when you bundle your move with storage. Declutter with ease.',
    audience: 'customers',
    ad_prompt: 'A clean modern storage facility with neatly organized boxes, moving truck in foreground, bundle savings concept, professional advertising design',
  },
];

export default function MarketingPanel() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingAd, setGeneratingAd] = useState(null);
  const [sending, setSending] = useState(null);
  const [adImages, setAdImages] = useState({});

  const load = useCallback(async () => {
    try {
      const existing = await base44.entities.PromoCode.filter({}, '-created_date', 50);
      // Merge presets with any existing codes
      const existingCodes = new Set(existing.map((p) => p.code));
      const merged = PRESET_CAMPAIGNS.map((preset) => {
        const dbMatch = existing.find((p) => p.code === preset.code);
        return dbMatch ? { ...preset, ...dbMatch, synced: true } : { ...preset, synced: false };
      });
      setCampaigns(merged);
    } catch {
      setCampaigns(PRESET_CAMPAIGNS.map((c) => ({ ...c, synced: false })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const syncCampaign = async (campaign) => {
    try {
      const existing = await base44.entities.PromoCode.filter({ code: campaign.code });
      if (existing.length > 0) {
        await base44.entities.PromoCode.update(existing[0].id, {
          discount_percent: campaign.discount_percent,
          active: true,
          description: campaign.description,
        });
      } else {
        await base44.entities.PromoCode.create({
          code: campaign.code,
          discount_percent: campaign.discount_percent,
          active: true,
          description: campaign.description,
        });
      }
      toast({ title: 'Promo code synced', description: `${campaign.code} is now active and ready to use.` });
      load();
    } catch (err) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    }
  };

  const generateAd = async (campaign) => {
    setGeneratingAd(campaign.code);
    try {
      const res = await base44.integrations.Core.GenerateImage({ prompt: campaign.ad_prompt });
      setAdImages((prev) => ({ ...prev, [campaign.code]: res.url }));
      toast({ title: 'Ad generated!', description: `Marketing image for "${campaign.title}" is ready.` });
    } catch (err) {
      toast({ title: 'Ad generation failed', description: err.message, variant: 'destructive' });
    }
    setGeneratingAd(null);
  };

  const sendPromoEmail = async (campaign) => {
    setSending(campaign.code);
    try {
      // Fetch audience: customers or drivers
      let recipients = [];
      if (campaign.audience === 'drivers') {
        const drivers = await base44.entities.DriverProfile.filter({ status: 'approved' }, '-created_date', 200);
        recipients = drivers.map((d) => d.email).filter(Boolean);
      } else {
        const moves = await base44.entities.MoveRequest.filter({}, '-created_date', 200);
        recipients = [...new Set(moves.map((m) => m.customer_email).filter(Boolean))];
      }

      if (recipients.length === 0) {
        toast({ title: 'No recipients', description: `No ${campaign.audience} found to send this promotion to.`, variant: 'destructive' });
        setSending(null);
        return;
      }

      const subject = campaign.audience === 'drivers'
        ? `GO Driver Reward: ${campaign.title}`
        : `Special Offer from GO: ${campaign.title}`;

      const body = campaign.audience === 'drivers'
        ? `Hello Driver,\n\n${campaign.description}\n\nUse code: ${campaign.code}\n\nThank you for being part of the GO team!\n\n— The GO Team`
        : `Hi there,\n\n${campaign.description}\n\nUse promo code ${campaign.code} at checkout to claim your discount.\n\nBook your move today at GO!\n\n— The GO Team`;

      let sent = 0;
      for (const email of recipients) {
        try {
          await base44.integrations.Core.SendEmail({ to: email, subject, body, from_name: 'GO' });
          sent++;
        } catch { /* skip individual failures */ }
      }

      toast({
        title: 'Campaign sent!',
        description: `${campaign.title} was emailed to ${sent} ${campaign.audience}.`,
      });
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

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-purple-500 rounded-lg p-1.5">
          <Megaphone size={18} className="text-white" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg">Marketing & Promotions</h2>
          <p className="text-xs text-muted-foreground">Generate ads, sync promo codes, and broadcast offers to customers and drivers.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((c) => (
          <div key={c.code} className="border rounded-xl overflow-hidden flex flex-col">
            {/* Ad image area */}
            <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
              {adImages[c.code] ? (
                <img src={adImages[c.code]} alt={c.title} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <ImageIcon size={28} className="mx-auto mb-2" />
                  <p className="text-xs">No ad image yet</p>
                </div>
              )}
              <div className="absolute top-2 left-2">
                <Badge className={c.audience === 'drivers' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}>
                  {c.audience === 'drivers' ? <><Truck size={10} className="mr-1" /> Drivers</> : <><Users size={10} className="mr-1" /> Customers</>}
                </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-display font-bold text-sm">{c.title}</h3>
                  {c.synced && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>

              {/* Promo code */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
                  <Tag size={12} className="text-muted-foreground" />
                  <span className="font-mono font-bold text-sm">{c.code}</span>
                  {c.discount_percent > 0 && <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-auto">{c.discount_percent}% off</span>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => copyCode(c.code)} aria-label="Copy code">
                  <Copy size={14} />
                </Button>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 mt-auto">
                <Button size="sm" variant="outline" onClick={() => generateAd(c)} disabled={generatingAd === c.code}>
                  {generatingAd === c.code ? <Loader2 size={14} className="animate-spin mr-1" /> : <Sparkles size={14} className="mr-1" />}
                  {adImages[c.code] ? 'Regenerate Ad' : 'Generate Ad'}
                </Button>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-purple-500 hover:bg-purple-600" onClick={() => sendPromoEmail(c)} disabled={sending === c.code}>
                    {sending === c.code ? <Loader2 size={14} className="animate-spin mr-1" /> : <Mail size={14} className="mr-1" />}
                    Send
                  </Button>
                  {!c.synced && (
                    <Button size="sm" variant="secondary" onClick={() => syncCampaign(c)}>
                      Sync
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}