import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import {
  Truck, DollarSign, TrendingUp, Star, Briefcase, Wallet,
  CheckCircle2, Clock, Package, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  quoted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  accepted: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  completed: 'bg-muted text-foreground',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

export default function DriverPersonalDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [moves, setMoves] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [ratings, setRatings] = useState([]);

  const load = useCallback(async () => {
    try {
      const u = await base44.auth.me();
      const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
      if (profiles.length === 0) {
        setLoading(false);
        return;
      }
      const p = profiles[0];
      setProfile(p);

      const [allMoves, allPayouts, allRatings] = await Promise.all([
        base44.entities.MoveRequest.list('-created_date', 500),
        base44.entities.DriverPayout.filter({ driver_profile_id: p.id }, '-created_date', 200),
        base44.entities.Rating.filter({ direction: 'customer_to_driver', ratee_id: p.id }, '-created_date', 50),
      ]);
      setMoves(allMoves.filter((m) => m.assigned_driver_id === p.id));
      setPayouts(allPayouts);
      setRatings(allRatings);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Truck className="text-muted-foreground" size={28} />
        </div>
        <h2 className="font-display font-bold text-lg mb-1">No Driver Profile</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
          You need a registered driver profile to view your dashboard.
        </p>
        <Link to="/driver-register" className="text-primary text-sm font-medium underline">
          Register as a driver
        </Link>
      </div>
    );
  }

  const completedMoves = moves.filter((m) => m.status === 'completed');
  const activeMoves = moves.filter((m) => ['accepted', 'in_progress', 'quoted'].includes(m.status));
  const totalEarnings = payouts.reduce((s, p) => s + (p.amount - (p.deduction_amount || 0)), 0);
  const pendingPayouts = payouts.filter((p) => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + p.amount, 0);
  const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + (r.stars || 0), 0) / ratings.length : 0;

  const now = new Date();
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthPayouts = payouts.filter((p) => {
      const pd = parseISO(p.created_date);
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
    });
    chartData.push({
      month: format(d, 'MMM'),
      earnings: monthPayouts.reduce((s, p) => s + (p.amount - (p.deduction_amount || 0)), 0),
    });
  }

  const stats = [
    { label: 'Total Jobs', value: moves.length, icon: Briefcase, accent: 'text-blue-500' },
    { label: 'Completed', value: completedMoves.length, icon: CheckCircle2, accent: 'text-emerald-500' },
    { label: 'Active', value: activeMoves.length, icon: Clock, accent: 'text-purple-500' },
    { label: 'Total Earnings', value: fmt(totalEarnings), icon: DollarSign, accent: 'text-emerald-600' },
    { label: 'Pending Payout', value: fmt(pendingPayouts), icon: Wallet, accent: 'text-amber-500' },
    { label: 'Avg Rating', value: avgRating.toFixed(1), icon: Star, accent: 'text-yellow-500' },
  ];

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-500 rounded-xl p-2.5 flex items-center justify-center">
          <Truck className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">My Performance</h1>
          <p className="text-muted-foreground text-sm">
            Your earnings and job stats, {profile.full_name || user?.full_name || 'Driver'}.
          </p>
        </div>
      </div>

      {/* Personal stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={16} className={s.accent} />
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
            </div>
            <p className="text-xl md:text-2xl font-display font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Earnings chart */}
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-500" /> Monthly Earnings
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent jobs */}
      <div className="bg-card border rounded-2xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-3 bg-muted border-b">
          <h3 className="font-display font-bold text-sm">Recent Jobs</h3>
          <Link to="/driver-report" className="text-xs text-primary font-medium hover:underline">Full report</Link>
        </div>
        {moves.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="mx-auto text-muted-foreground mb-3 opacity-40" size={36} />
            <p className="text-sm text-muted-foreground">No jobs assigned yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {moves.slice(0, 5).map((m) => (
              <Link
                key={m.id}
                to={`/move/${m.id}`}
                className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-muted/30 transition-colors block"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.pickup_address}</p>
                  <p className="text-xs text-muted-foreground truncate">→ {m.dropoff_address}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.move_date ? format(parseISO(m.move_date), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmt(m.driver_payout || 0)}</p>
                  <Badge className={STATUS_COLORS[m.status] || ''}>{m.status?.replace('_', ' ') || 'unknown'}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent payouts */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-muted border-b">
          <h3 className="font-display font-bold text-sm">Recent Payouts</h3>
          <Link to="/my-payouts" className="text-xs text-primary font-medium hover:underline">View all</Link>
        </div>
        {payouts.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet className="mx-auto text-muted-foreground mb-3 opacity-40" size={36} />
            <p className="text-sm text-muted-foreground">No payouts yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {payouts.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmt(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(p.created_date), 'MMM d, yyyy')}</p>
                </div>
                <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}