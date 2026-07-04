import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/go/PageHeader';
import PullToRefresh from '@/components/go/PullToRefresh';
import { Check, Crown, Zap, Loader2, TrendingUp } from 'lucide-react';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    icon: TrendingUp,
    color: 'gray',
    features: ['Up to 3 jobs per month', 'Basic job matching', 'Standard payouts', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    icon: Zap,
    color: 'emerald',
    features: ['Unlimited jobs', 'Priority dispatch', 'AI coaching reports', 'Faster payouts (2-day)', 'Email support'],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 99,
    icon: Crown,
    color: 'amber',
    features: ['Everything in Pro', 'Instant payouts', 'Featured placement', 'Advanced analytics', 'Priority phone support', 'Exclusive high-value jobs'],
  },
];

export default function DriverUpgrade() {
  const { scrollRef } = useOutletContext();
  const { toast } = useToast();
  const [currentTier, setCurrentTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);

  useEffect(() => {
    base44.functions.invoke('driver-subscription', { action: 'get_status' })
      .then(res => setCurrentTier(res.data?.tier || 'free'))
      .catch(() => setCurrentTier('free'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (tier) => {
    setUpgrading(tier);
    try {
      const res = await base44.functions.invoke('driver-subscription', { action: 'create_checkout', tier });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      toast({ title: 'Upgrade failed', description: err.message, variant: 'destructive' });
    } finally {
      setUpgrading(null);
    }
  };

  const handleCancel = async () => {
    setUpgrading('cancel');
    try {
      await base44.functions.invoke('driver-subscription', { action: 'cancel' });
      setCurrentTier('free');
      toast({ title: 'Subscription cancelled', description: 'Your plan will end at the current period.' });
    } catch (err) {
      toast({ title: 'Cancel failed', description: err.message, variant: 'destructive' });
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  }

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={async () => {
      const res = await base44.functions.invoke('driver-subscription', { action: 'get_status' });
      setCurrentTier(res.data?.tier || 'free');
    }}>
      <div className="pb-8">
        <PageHeader title="Driver Plans" />

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 mb-6 text-white">
          <h2 className="text-2xl font-display font-bold mb-2">Maximize Your Earnings</h2>
          <p className="text-emerald-100 text-sm">Upgrade to accept unlimited jobs, get priority dispatch, and unlock instant payouts.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {TIERS.map((tier) => {
            const isCurrent = currentTier === tier.id;
            const Icon = tier.icon;
            return (
              <div
                key={tier.id}
                className={`relative bg-card border-2 rounded-2xl p-6 flex flex-col ${isCurrent ? 'border-primary' : 'border-border'}`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Current Plan</Badge>
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  tier.color === 'amber' ? 'bg-amber-500/10' : tier.color === 'emerald' ? 'bg-emerald-500/10' : 'bg-muted'
                }`}>
                  <Icon className={tier.color === 'amber' ? 'text-amber-500' : tier.color === 'emerald' ? 'text-emerald-500' : 'text-muted-foreground'} size={24} />
                </div>
                <h3 className="font-display font-bold text-lg mb-1">{tier.name}</h3>
                <p className="text-3xl font-display font-black mb-4">
                  ${tier.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">Current Plan</Button>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(tier.id)}
                    disabled={upgrading !== null}
                    className={`w-full ${tier.color === 'amber' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                  >
                    {upgrading === tier.id ? <Loader2 size={16} className="animate-spin" /> : `Upgrade to ${tier.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {currentTier !== 'free' && (
          <div className="mt-6 text-center">
            <button onClick={handleCancel} disabled={upgrading === 'cancel'} className="text-sm text-muted-foreground hover:text-destructive transition-colors">
              {upgrading === 'cancel' ? <Loader2 size={14} className="animate-spin inline" /> : 'Cancel subscription'}
            </button>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}