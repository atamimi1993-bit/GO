import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PullToRefresh from '@/components/go/PullToRefresh';
import PageHeader from '@/components/go/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/pricing';
import { format, parseISO } from 'date-fns';
import {
  Truck, DollarSign, TrendingUp, CheckCircle2, Clock, Star,
  Loader2, Briefcase, Wallet, Search, FileText, Package,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  quoted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  accepted: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  completed: 'bg-muted text-foreground',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DriverReport() {
  const { scrollRef } = useOutletContext();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState(null);
  const [moves, setMoves] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const u = await base44.auth.me();
      const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
      if (profiles.length === 0) {
        setLoading(false);
        return;
      }
      const profile = profiles[0];
      setDriverProfile(profile);

      const [allMoves, allPayouts, allRatings] = await Promise.all([
        base44.entities.MoveRequest.list('-created_date', 500),
        base44.entities.DriverPayout.filter({ driver_profile_id: profile.id }, '-created_date', 200),
        base44.entities.Rating.filter({ direction: 'customer_to_driver', ratee_id: profile.id }, '-created_date', 50),
      ]);
      setMoves(allMoves.filter((m) => m.assigned_driver_id === profile.id));
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

  if (!driverProfile) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Truck className="text-muted-foreground" size={28} />
        </div>
        <h2 className="font-display font-bold text-lg mb-1">No Driver Profile</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
          You need a registered driver profile to view your job report.
        </p>
        <Link to="/driver-register" className="text-primary text-sm font-medium underline">
          Register as a driver
        </Link>
      </div>
    );
  }

  // Summary metrics
  const completedMoves = moves.filter((m) => m.status === 'completed');
  const activeMoves = moves.filter((m) => ['accepted', 'in_progress', 'quoted'].includes(m.status));
  const cancelledMoves = moves.filter((m) => m.status === 'cancelled');
  const totalEarnings = payouts.reduce((s, p) => s + (p.amount - (p.deduction_amount || 0)), 0);
  const pendingPayouts = payouts.filter((p) => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + p.amount, 0);
  const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + (r.stars || 0), 0) / ratings.length : 0;

  // Earnings by job type
  const earningsByType = ['residential', 'freight', 'corporate_logistics'].map((type) => ({
    type: type.replace('_', ' '),
    earnings: completedMoves.filter((m) => m.job_type === type).reduce((s, m) => s + (m.driver_payout || 0), 0),
    count: completedMoves.filter((m) => m.job_type === type).length,
  }));

  // Monthly earnings chart data (last 6 months)
  const now = new Date();
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = format(d, 'MMM');
    const monthPayouts = payouts.filter((p) => {
      const pd = parseISO(p.created_date);
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
    });
    chartData.push({
      month: monthLabel,
      earnings: monthPayouts.reduce((s, p) => s + (p.amount - (p.deduction_amount || 0)), 0),
    });
  }

  // Filtered moves for table
  const filteredMoves = moves
    .filter((m) => statusFilter === 'all' || m.status === statusFilter)
    .filter((m) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        m.pickup_address?.toLowerCase().includes(q) ||
        m.dropoff_address?.toLowerCase().includes(q) ||
        m.customer_name?.toLowerCase().includes(q)
      );
    });

  const stats = [
    { label: 'Total Jobs', value: moves.length, icon: Briefcase, accent: 'text-blue-500' },
    { label: 'Completed', value: completedMoves.length, icon: CheckCircle2, accent: 'text-emerald-500' },
    { label: 'Active', value: activeMoves.length, icon: Clock, accent: 'text-purple-500' },
    { label: 'Cancelled', value: cancelledMoves.length, icon: Package, accent: 'text-red-500' },
    { label: 'Total Earnings', value: fmt(totalEarnings), icon: DollarSign, accent: 'text-emerald-600' },
    { label: 'Pending Payout', value: fmt(pendingPayouts), icon: Wallet, accent: 'text-amber-500' },
    { label: 'Avg Rating', value: avgRating.toFixed(1), icon: Star, accent: 'text-yellow-500' },
    { label: 'Rating Count', value: ratings.length, icon: TrendingUp, accent: 'text-blue-500' },
  ];

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="pb-4">
        <PageHeader title="My Job Report" isRoot />
        <p className="text-muted-foreground text-sm mb-6">
          A full report of all your assigned jobs, earnings, and performance.
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-card border rounded-2xl p-4 text-center">
              <s.icon className={`mx-auto mb-2 ${s.accent}`} size={22} />
              <p className="text-xl font-display font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
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

        {/* Earnings by job type */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
            <FileText size={16} className="text-blue-500" /> Earnings by Job Type
          </h3>
          <div className="space-y-3">
            {earningsByType.map((r) => (
              <div key={r.type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="capitalize font-medium">{r.type}</span>
                  <span className="text-muted-foreground">{fmt(r.earnings)} · {r.count} jobs</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${totalEarnings > 0 ? (r.earnings / totalEarnings) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by address or customer..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors min-h-[40px] ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* All jobs table */}
        {filteredMoves.length === 0 ? (
          <div className="bg-card border rounded-2xl p-8 text-center">
            <Truck className="mx-auto text-muted-foreground mb-3 opacity-40" size={40} />
            <p className="font-medium text-sm">No jobs found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {moves.length === 0 ? 'You have no assigned jobs yet.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 bg-muted border-b text-xs text-muted-foreground font-medium">
              <div className="col-span-3">Route</div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1 text-right">Type</div>
              <div className="col-span-2 text-right">Payout</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            <div className="divide-y">
              {filteredMoves.map((m) => (
                <Link
                  key={m.id}
                  to={`/move/${m.id}`}
                  className="md:grid md:grid-cols-12 md:gap-2 px-5 py-3 hover:bg-muted/30 transition-colors block"
                >
                  <div className="md:col-span-3 mb-2 md:mb-0">
                    <p className="text-sm font-medium truncate">{m.pickup_address}</p>
                    <p className="text-xs text-muted-foreground truncate">→ {m.dropoff_address}</p>
                  </div>
                  <div className="md:col-span-2 text-sm text-muted-foreground mb-1 md:mb-0 truncate">
                    {m.customer_name || 'N/A'}
                  </div>
                  <div className="md:col-span-2 text-xs text-muted-foreground mb-1 md:mb-0">
                    {m.move_date ? format(parseISO(m.move_date), 'MMM d, yyyy') : '—'}
                  </div>
                  <div className="md:col-span-1 text-xs text-muted-foreground capitalize mb-1 md:mb-0">
                    {m.job_type?.replace('_', ' ') || '—'}
                  </div>
                  <div className="md:col-span-2 md:text-right font-semibold text-emerald-600 dark:text-emerald-400 mb-1 md:mb-0">
                    {fmt(m.driver_payout || 0)}
                  </div>
                  <div className="md:col-span-2 md:text-right">
                    <Badge className={STATUS_COLORS[m.status] || ''}>{m.status?.replace('_', ' ') || 'unknown'}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}