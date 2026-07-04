import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StripeConnectCard({ profile: initialProfile, onUpdated }) {
  const { toast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(!initialProfile);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (initialProfile) return;
    (async () => {
      try {
        const u = await base44.auth.me();
        const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
        if (profiles.length > 0) setProfile(profiles[0]);
      } catch {}
      setLoading(false);
    })();
  }, [initialProfile]);

  useEffect(() => {
    if (initialProfile) setProfile(initialProfile);
  }, [initialProfile]);

  // Detect return from Stripe onboarding and sync status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get('stripe');
    if (stripeParam === 'success' || stripeParam === 'refresh') {
      window.history.replaceState({}, '', window.location.pathname);
      handleSync();
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('create-driver-connect-account', { sync_only: true });
      const enabled = res.data.stripe_payouts_enabled;
      if (enabled) {
        toast({ title: 'Payouts active!', description: 'Your Stripe account is set up. Earnings will be sent to your bank automatically.' });
      } else if (res.data.stripe_account_id) {
        toast({ title: 'Setup incomplete', description: 'Please complete your Stripe onboarding to receive automatic payouts.', variant: 'destructive' });
      }
      // Refresh profile from server
      const u = await base44.auth.me();
      const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        if (onUpdated) onUpdated(profiles[0]);
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = async () => {
    if (window.self !== window.top) {
      alert('Account setup is only available from the published app, not the editor preview.');
      return;
    }
    setConnecting(true);
    try {
      const res = await base44.functions.invoke('create-driver-connect-account', {});
      window.location.href = res.data.url;
    } catch (err) {
      toast({ title: 'Setup failed', description: err.message, variant: 'destructive' });
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-6 mb-6">
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  if (syncing) {
    return (
      <div className="bg-card border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Verifying your Stripe account...
        </div>
      </div>
    );
  }

  // Connected and payouts enabled
  if (profile.stripe_payouts_enabled) {
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-display font-bold text-lg">Automatic Payouts Active</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Your earnings are automatically transferred to your bank account via Stripe after each completed job.
        </p>
        <Button variant="outline" size="sm" aria-label="Update bank details on Stripe" onClick={handleConnect} disabled={connecting}>
          {connecting ? <Loader2 size={14} className="animate-spin mr-1" /> : <CreditCard size={14} className="mr-1" />}
          Update Bank Details
        </Button>
      </div>
    );
  }

  // Has a Stripe account but onboarding not complete
  if (profile.stripe_account_id) {
    return (
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
          <h2 className="font-display font-bold text-lg">Complete Payout Setup</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          You started setting up automatic payouts but haven't finished. Complete your Stripe account to receive earnings directly to your bank.
        </p>
        <Button className="w-full bg-amber-500 hover:bg-amber-600" aria-label="Finish Stripe Connect onboarding" onClick={handleConnect} disabled={connecting}>
          {connecting ? <Loader2 size={16} className="animate-spin mr-1" /> : <CreditCard size={16} className="mr-1" />}
          Finish Stripe Setup
        </Button>
      </div>
    );
  }

  // Not connected yet
  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard size={20} className="text-emerald-600" />
        <h2 className="font-display font-bold text-lg">Set Up Automatic Payouts</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Connect your bank account through Stripe to receive earnings automatically after each completed job — no more waiting for manual payouts.
      </p>
      <Button className="w-full bg-emerald-500 hover:bg-emerald-600" aria-label="Connect your bank account with Stripe" onClick={handleConnect} disabled={connecting}>
        {connecting ? <Loader2 size={16} className="animate-spin mr-1" /> : <CreditCard size={16} className="mr-1" />}
        Connect with Stripe
      </Button>
    </div>
  );
}