import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DriverTrackingControls from '@/components/go/DriverTrackingControls';
import DriverLeaderboardCard from '@/components/go/DriverLeaderboardCard';
import PullToRefresh from '@/components/go/PullToRefresh';
import PageHeader from '@/components/go/PageHeader';
import { Truck, Plus, Star, DollarSign, Briefcase, Loader2, ShieldCheck, AlertCircle, FileText, Shield } from 'lucide-react';

export default function DriverHub() {
  const { scrollRef } = useOutletContext();
  const location = useLocation();
  const pendingApplication = location.state?.pendingApplication;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [contract, setContract] = useState(null);

  const load = useCallback(async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        const contracts = await base44.entities.Contract.filter({
          driver_profile_id: profiles[0].id,
          contract_type: 'driver_service',
        }).catch(() => []);
        setContract(contracts?.[0] || null);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;

  // Show pending banner if navigated from registration
  const pendingBanner = pendingApplication && (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
      <Loader2 className="text-yellow-700 dark:text-yellow-300 mt-0.5 animate-spin" size={18} />
      <div>
        <p className="font-medium text-sm text-yellow-700 dark:text-yellow-300">Application submitting...</p>
        <p className="text-xs text-yellow-700 dark:text-yellow-300">Your registration is being saved. You'll see your profile here shortly.</p>
      </div>
    </div>
  );

  // Not a driver yet
  if (!profile) {
    return (
      <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="max-w-xl mx-auto text-center py-16">
        {pendingBanner}
        <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Truck className="text-emerald-600 dark:text-emerald-400" size={36} />
        </div>
        <h1 className="text-3xl font-display font-bold mb-3">Become a GO Driver</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Earn money by helping people move. Register your truck, upload your docs, and start accepting local jobs.
        </p>
        <ul className="text-left max-w-sm mx-auto space-y-3 mb-8">
          {['Set your own schedule', 'Get paid per job (5% driver bonus)', 'Any truck size welcome', 'All companies accepted'].map(t => (
            <li key={t} className="flex items-center gap-2 text-sm text-foreground">
              <ShieldCheck size={16} className="text-emerald-500" /> {t}
            </li>
          ))}
        </ul>
        <Link to="/driver-register">
          <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 rounded-xl px-8">
            Register as Driver <Plus size={18} className="ml-2" />
          </Button>
        </Link>
      </div>
      </PullToRefresh>
    );
  }

  // Driver dashboard
  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
    <div>
      {pendingBanner}
      <div className="flex items-center justify-between mb-6">
        <div>
          <PageHeader title="Driver Dashboard" isRoot />
          <p className="text-muted-foreground text-sm">Welcome back, {profile.full_name}.</p>
        </div>
        <Badge className={profile.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400' : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'}>
          {profile.status?.replace('_', ' ')}
        </Badge>
      </div>

      {profile.status === 'pending_review' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-yellow-700 dark:text-yellow-300 mt-0.5" size={18} />
          <div>
            <p className="font-medium text-sm text-yellow-700 dark:text-yellow-300">Profile Under Review</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">Your documents are being verified. You'll be able to accept jobs once approved.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border rounded-2xl p-3 md:p-5 text-center">
          <Briefcase className="mx-auto text-muted-foreground mb-1" size={20} />
          <p className="text-xl md:text-2xl font-display font-bold">{profile.total_jobs || 0}</p>
          <p className="text-xs text-muted-foreground">Jobs</p>
        </div>
        <div className="bg-card border rounded-2xl p-3 md:p-5 text-center">
          <DollarSign className="mx-auto text-muted-foreground mb-1" size={20} />
          <p className="text-xl md:text-2xl font-display font-bold">${(profile.total_earnings || 0).toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Earnings</p>
        </div>
        <div className="bg-card border rounded-2xl p-3 md:p-5 text-center">
          <Star className="mx-auto text-yellow-400 fill-yellow-400 mb-1" size={20} />
          <p className="text-xl md:text-2xl font-display font-bold">{(profile.rating || 5.0).toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Rating</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <Link to="/available-jobs" className="flex-1">
          <Button className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={profile.status !== 'approved'}>
            Browse Available Jobs
          </Button>
        </Link>
        <Link to="/my-trucks">
          <Button variant="outline">
            <Truck size={16} className="mr-1" /> My Trucks
          </Button>
        </Link>
        <Link to="/my-payouts">
          <Button variant="outline">
            <DollarSign size={16} className="mr-1" /> Payouts
          </Button>
        </Link>
      </div>

      {/* Signed contract */}
      {contract && (
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="text-primary" size={18} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm">Driver Service Agreement</h3>
              <p className="text-xs text-muted-foreground">Signed contract on file</p>
            </div>
          </div>
          <div className="bg-muted rounded-xl p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Signed by</span><span className="font-medium">{contract.signature_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{new Date(contract.signed_at).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-medium">{contract.terms_version}</span></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-primary">
            <Shield size={14} /> Insurance coverage provided by GO for all your assigned moves
          </div>
        </div>
      )}

      {/* Driver leaderboard */}
      <DriverLeaderboardCard currentDriverId={profile.id} />

      {profile.status === 'approved' && (
        <DriverTrackingControls driverProfile={profile} />
      )}
    </div>
    </PullToRefresh>
  );
}