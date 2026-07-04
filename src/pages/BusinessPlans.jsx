import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, Crown, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function BusinessPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [currentSub, setCurrentSub] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [planRes, subRes] = await Promise.all([
          base44.entities.SubscriptionPlan.filter({ active: true }, 'sort_order', 20),
          user?.email ? base44.entities.BusinessSubscription.filter({ business_email: user.email, status: { $in: ['active', 'trialing', 'past_due'] } }) : Promise.resolve([]),
        ]);
        setPlans(planRes || []);
        setCurrentSub(subRes?.[0] || null);
      } catch {}
      setLoading(false);
    })();
  }, [user?.email]);

  const handleSubscribe = async (planId) => {
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the editor preview.');
      return;
    }
    setSubscribing(planId);
    try {
      const res = await base44.functions.invoke('create-subscription-checkout', { plan_id: planId });
      window.location.href = res.data.url;
    } catch (err) {
      toast({ title: 'Subscription failed', description: err.message, variant: 'destructive' });
      setSubscribing(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="text-emerald-600 dark:text-emerald-400" size={28} />
        </div>
        <h1 className="text-3xl font-display font-bold mb-2">Business Plans</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Scale your delivery operations with a monthly subscription. Get priority dispatch, discounted rates, and dedicated support.
        </p>
      </div>

      {currentSub && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <Crown className="text-emerald-600 dark:text-emerald-400" size={20} />
          <div className="flex-1">
            <p className="font-medium text-sm">Active Subscription: {currentSub.plan_name}</p>
            <p className="text-xs text-muted-foreground">
              {currentSub.status === 'active' ? 'Active' : currentSub.status}
              {currentSub.current_period_end && ` · Renews ${new Date(currentSub.current_period_end).toLocaleDateString()}`}
            </p>
          </div>
          <Link to="/business-account">
            <Button variant="outline" size="sm">Manage</Button>
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map(plan => {
          const isCurrent = currentSub?.plan_tier === plan.tier;
          const isPopular = plan.tier === 'professional';
          return (
            <div
              key={plan.id}
              className={`relative bg-card border-2 rounded-2xl p-6 flex flex-col ${
                isPopular ? 'border-emerald-500' : 'border-border'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-500 text-white">Most Popular</Badge>
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-display font-bold">${plan.price_monthly}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>

              {plan.delivery_limit > 0 && (
                <p className="text-sm text-muted-foreground mb-4">
                  Includes {plan.delivery_limit} deliveries/month
                </p>
              )}
              {plan.delivery_limit === 0 && plan.tier === 'enterprise' && (
                <p className="text-sm text-muted-foreground mb-4">Unlimited deliveries</p>
              )}

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features?.split('\n').filter(Boolean).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>{f.trim()}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrent || subscribing === plan.id}
                className={`w-full ${isCurrent ? '' : isPopular ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                variant={isCurrent ? 'secondary' : isPopular ? 'default' : 'outline'}
              >
                {subscribing === plan.id ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
                {isCurrent ? 'Current Plan' : 'Subscribe'}
                {!isCurrent && <ArrowRight size={14} className="ml-1" />}
              </Button>
            </div>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Subscription plans are being configured. Please check back soon.</p>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/business-account">
          <Button variant="ghost">← Back to Business Account</Button>
        </Link>
      </div>
    </div>
  );
}