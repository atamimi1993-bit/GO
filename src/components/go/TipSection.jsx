import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Loader2, CheckCircle2, Coffee, PartyPopper } from 'lucide-react';
import { getCurrency } from '@/lib/pricing';
import { useToast } from '@/components/ui/use-toast';

const TIP_PERCENTAGES = [15, 20, 25];

export default function TipSection({ move }) {
  const [pings, setPings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTip, setSelectedTip] = useState(null);
  const [customTip, setCustomTip] = useState('');
  const [paying, setPaying] = useState(null);
  const { toast } = useToast();

  const currencyCode = move.currency || 'USD';
  const curr = getCurrency(currencyCode);
  const fmt = (v) => curr.symbol + Number(v).toFixed(curr.decimals);
  const basePrice = move.total_price || 0;

  useEffect(() => {
    base44.entities.LocationPing.filter({ move_request_id: move.id }, '-created_date', 100)
      .then(setPings)
      .finally(() => setLoading(false));
  }, [move.id]);

  if (loading) return null;

  const reachedMilestones = new Set(pings.map((p) => p.milestone));
  const itemsLoaded = reachedMilestones.has('items_loaded');
  const delivered = reachedMilestones.has('delivered');

  const handleTip = async (stage) => {
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the editor preview.');
      return;
    }
    const amount = stage === 'pickup' ? selectedTip : (selectedTip || parseFloat(customTip));
    if (!amount || amount <= 0) {
      toast({ title: 'Please select a tip amount', variant: 'destructive' });
      return;
    }
    try {
      setPaying(stage);
      const res = await base44.functions.invoke('create-tip-checkout', {
        move_request_id: move.id,
        tip_amount: amount,
        stage,
      });
      window.location.href = res.data.url;
    } catch {
      toast({ title: 'Tip checkout failed', description: 'Please try again.', variant: 'destructive' });
      setPaying(null);
    }
  };

  const sections = [];

  if (itemsLoaded && !move.pickup_tip_paid) {
    sections.push({
      stage: 'pickup',
      icon: Coffee,
      title: 'Items are loaded!',
      subtitle: 'Show your appreciation for a smooth pickup',
    });
  }

  if (delivered && !move.delivery_tip_paid) {
    sections.push({
      stage: 'delivery',
      icon: PartyPopper,
      title: 'Delivery complete!',
      subtitle: 'Thank your driver for a job well done',
    });
  }

  // Show paid confirmation cards
  if (itemsLoaded && move.pickup_tip_paid) {
    sections.push({
      stage: 'pickup',
      icon: CheckCircle2,
      title: 'Pickup tip sent',
      subtitle: `${fmt(move.pickup_tip)} tip — thank you!`,
      paid: true,
    });
  }

  if (delivered && move.delivery_tip_paid) {
    sections.push({
      stage: 'delivery',
      icon: CheckCircle2,
      title: 'Delivery tip sent',
      subtitle: `${fmt(move.delivery_tip)} tip — thank you!`,
      paid: true,
    });
  }

  if (sections.length === 0) return null;

  return (
    <div className="space-y-4 mt-4">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <div
            key={section.stage}
            className={`border rounded-2xl p-5 ${
              section.paid
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800/40'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  section.paid
                    ? 'bg-emerald-500/10'
                    : 'bg-amber-500/10'
                }`}
              >
                <Icon size={20} className={section.paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm">{section.title}</h3>
                <p className="text-xs text-muted-foreground">{section.subtitle}</p>
              </div>
            </div>

            {!section.paid && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {TIP_PERCENTAGES.map((pct) => {
                    const amt = Math.round(basePrice * (pct / 100) * 100) / 100;
                    return (
                      <button
                        key={pct}
                        onClick={() => { setSelectedTip(amt); setCustomTip(''); }}
                        className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors min-h-[52px] ${
                          selectedTip === amt
                            ? 'bg-amber-500 text-white'
                            : 'bg-white dark:bg-card border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        }`}
                      >
                        <span className="text-base font-bold">{pct}%</span>
                        <span className="text-xs opacity-80">{fmt(amt)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{curr.symbol}</span>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={customTip}
                      onChange={(e) => { setCustomTip(e.target.value); setSelectedTip(null); }}
                      placeholder="Custom amount"
                      className="pl-7"
                    />
                  </div>
                  <Button
                    onClick={() => handleTip(section.stage)}
                    disabled={paying === section.stage || (!selectedTip && !customTip)}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {paying === section.stage ? (
                      <><Loader2 size={16} className="animate-spin mr-1" /> Redirecting...</>
                    ) : (
                      <><Heart size={16} className="mr-1" /> Tip {selectedTip ? fmt(selectedTip) : customTip ? fmt(customTip) : ''}</>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}