import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import SectionSkeleton from '@/components/admin/SectionSkeleton';
import {
  Users, Gift, TrendingUp, Loader2, Award, UserPlus, CheckCircle2, Copy,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function RecruitmentPipeline() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [processing, setProcessing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [driversRes, referralsRes] = await Promise.all([
        base44.entities.DriverProfile.list('-created_date', 100),
        base44.entities.Referral.list('-created_date', 50),
      ]);
      setDrivers(driversRes);
      setReferrals(referralsRes);
    } catch (err) {
      toast({ title: 'Failed to load recruitment data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    toast({ title: 'Referral code copied', description: code });
  };

  const toggleBonusEligibility = async (driverId, current) => {
    setProcessing(driverId);
    try {
      await base44.entities.DriverProfile.update(driverId, { sign_on_bonus_eligible: !current });
      setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, sign_on_bonus_eligible: !current } : d)));
      toast({ title: `Sign-on bonus ${!current ? 'enabled' : 'disabled'}` });
    } catch (err) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <SectionSkeleton />;

  const pending = drivers.filter((d) => d.status === 'pending_review');
  const approved = drivers.filter((d) => d.status === 'approved');
  const referredDrivers = drivers.filter((d) => d.referred_by_code);
  const bonusEligible = drivers.filter((d) => d.sign_on_bonus_eligible);
  const completedReferrals = referrals.filter((r) => r.status === 'rewarded');
  const pendingReferrals = referrals.filter((r) => r.status === 'pending');

  // Build referral tree: for each driver with a referral_code, count referrals
  const referralStats = drivers
    .filter((d) => d.referral_code)
    .map((d) => {
      const driverReferrals = referrals.filter((r) => r.referral_code === d.referral_code);
      return {
        ...d,
        totalReferred: driverReferrals.length,
        completed: driverReferrals.filter((r) => r.status === 'rewarded').length,
        pending: driverReferrals.filter((r) => r.status === 'pending').length,
      };
    })
    .filter((d) => d.totalReferred > 0)
    .sort((a, b) => b.totalReferred - a.totalReferred);

  const StatBox = ({ icon: Icon, label, value, accent }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-display font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus size={20} className="text-emerald-600" />
        <h2 className="font-display font-bold text-lg">Driver Recruitment Pipeline</h2>
      </div>

      {/* Recruitment KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatBox icon={Users} label="Pending Applications" value={pending.length} accent="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        <StatBox icon={CheckCircle2} label="Approved Drivers" value={approved.length} accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatBox icon={Gift} label="Referred Drivers" value={referredDrivers.length} accent="bg-purple-500/10 text-purple-600 dark:text-purple-400" />
        <StatBox icon={Award} label="Bonus Eligible" value={bonusEligible.length} accent="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
      </div>

      {/* Referral leaderboard */}
      {referralStats.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-emerald-600" />
            <h3 className="font-display font-bold text-sm">Top Referrers</h3>
          </div>
          <div className="space-y-2">
            {referralStats.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.full_name}</p>
                  <button
                    onClick={() => copyCode(d.referral_code)}
                    aria-label={`Copy referral code ${d.referral_code}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy size={11} /> {d.referral_code}
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary">{d.totalReferred} referred</Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{d.completed} completed</Badge>
                  {d.pending > 0 && <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">{d.pending} pending</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending referrals (referred but not yet completed first job) */}
      {pendingReferrals.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 size={16} className="text-amber-500" />
            <h3 className="font-display font-bold text-sm">Pending Referral Bonuses</h3>
          </div>
          <div className="space-y-2">
            {pendingReferrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.referred_email}</p>
                  <p className="text-xs text-muted-foreground truncate">Referred by {r.referrer_email} · Code: {r.referral_code}</p>
                </div>
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">Awaiting first job</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed referrals */}
      {completedReferrals.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <h3 className="font-display font-bold text-sm">Completed Referrals</h3>
          </div>
          <div className="space-y-2">
            {completedReferrals.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.referred_email}</p>
                  <p className="text-xs text-muted-foreground truncate">Referred by {r.referrer_email}</p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">+${r.bonus_points} bonus</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All drivers with bonus toggle */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Award size={16} className="text-rose-500" />
          <h3 className="font-display font-bold text-sm">Sign-On Bonus Management</h3>
        </div>
        {drivers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No drivers registered yet.</p>
        ) : (
          <div className="space-y-2">
            {drivers.slice(0, 20).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {d.email} · {d.status === 'pending_review' ? 'Pending' : d.status}
                    {d.referred_by_code && ` · Referred by ${d.referred_by_code}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={d.sign_on_bonus_eligible ? 'default' : 'outline'}
                  className={d.sign_on_bonus_eligible ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                  disabled={processing === d.id}
                  onClick={() => toggleBonusEligibility(d.id, d.sign_on_bonus_eligible)}
                >
                  {processing === d.id ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                  {d.sign_on_bonus_eligible ? 'Bonus Active' : 'Enable Bonus'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {drivers.length > 20 && (
          <p className="text-xs text-muted-foreground text-center mt-3">Showing first 20 of {drivers.length} drivers</p>
        )}
    </div>
  );
}