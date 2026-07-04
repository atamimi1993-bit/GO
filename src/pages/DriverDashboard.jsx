import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PullToRefresh from '@/components/go/PullToRefresh';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Truck, DollarSign, TrendingUp, Loader2, Star, ShieldCheck,
  Briefcase, Wallet, Search, ChevronDown, ChevronUp,
} from 'lucide-react';

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_BADGE = {
  approved: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  pending_review: 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400',
  suspended: 'bg-red-500/10 text-red-600 dark:text-red-400',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const SORT_KEYS = [
  { key: 'total_earnings', label: 'Earnings', icon: DollarSign },
  { key: 'active_jobs', label: 'Active Jobs', icon: TrendingUp },
  { key: 'completed_jobs', label: 'Completed', icon: Briefcase },
  { key: 'total_jobs', label: 'Total Jobs', icon: Truck },
  { key: 'rating', label: 'Rating', icon: Star },
  { key: 'pending_payouts', label: 'Pending Payout', icon: Wallet },
];

export default function DriverDashboard() {
  const { scrollRef } = useOutletContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('total_earnings');
  const [sortDir, setSortDir] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('admin-dashboard', { action: 'driver_performance' });
      setData(res.data);
    } catch (err) {
      toast({ title: 'Failed to load driver data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldCheck className="text-muted-foreground mb-3" size={48} />
        <h2 className="font-display font-bold text-lg mb-1">Access Denied</h2>
        <p className="text-muted-foreground text-sm">You need admin privileges to view this dashboard.</p>
      </div>
    );
  }

  const { drivers, totals } = data;

  // Filter + sort
  const filtered = drivers
    .filter((d) => statusFilter === 'all' || d.status === statusFilter)
    .filter((d) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        d.full_name?.toLowerCase().includes(q) ||
        d.company_name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const av = a[sortKey] || 0;
      const bv = b[sortKey] || 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });

  const topEarner = drivers.length > 0 ? [...drivers].sort((a, b) => b.total_earnings - a.total_earnings)[0] : null;
  const mostActive = drivers.length > 0 ? [...drivers].sort((a, b) => b.active_jobs - a.active_jobs)[0] : null;

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-500 rounded-xl p-2.5 flex items-center justify-center">
            <Truck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Driver Performance</h1>
            <p className="text-muted-foreground text-sm">
              Monitor total earnings and active jobs per driver, {user?.full_name || 'Admin'}.
            </p>
          </div>
        </div>

        {/* Aggregate stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-card border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className="text-emerald-500" />
              <span className="text-xs text-muted-foreground font-medium">Total Earnings</span>
            </div>
            <p className="text-xl md:text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">{fmt(totals.totalEarnings)}</p>
          </div>
          <div className="bg-card border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-purple-500" />
              <span className="text-xs text-muted-foreground font-medium">Active Jobs</span>
            </div>
            <p className="text-xl md:text-2xl font-display font-bold text-purple-600 dark:text-purple-400">{totals.activeJobs}</p>
          </div>
          <div className="bg-card border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase size={16} className="text-blue-500" />
              <span className="text-xs text-muted-foreground font-medium">Completed Jobs</span>
            </div>
            <p className="text-xl md:text-2xl font-display font-bold">{totals.completedJobs}</p>
          </div>
          <div className="bg-card border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-amber-500" />
              <span className="text-xs text-muted-foreground font-medium">Pending Payouts</span>
            </div>
            <p className="text-xl md:text-2xl font-display font-bold text-amber-600 dark:text-amber-400">{fmt(totals.pendingPayouts)}</p>
          </div>
        </div>

        {/* Highlight cards */}
        {topEarner && topEarner.total_earnings > 0 && (
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Star className="text-amber-500 fill-amber-400" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Top Earner</p>
                <p className="font-display font-bold text-sm truncate">{topEarner.full_name}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(topEarner.total_earnings)}</p>
              </div>
            </div>
            {mostActive && mostActive.active_jobs > 0 && (
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="text-purple-500" size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Most Active Now</p>
                  <p className="font-display font-bold text-sm truncate">{mostActive.full_name}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">{mostActive.active_jobs} active job{mostActive.active_jobs > 1 ? 's' : ''}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or company..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'approved', 'pending_review', 'suspended'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                aria-label={`Filter drivers: ${s === 'all' ? 'All Drivers' : s === 'pending_review' ? 'Pending' : s.charAt(0).toUpperCase() + s.slice(1)}`}
                aria-pressed={statusFilter === s}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors min-h-[44px] ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {s === 'all' ? 'All Drivers' : s === 'pending_review' ? 'Pending' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Sortable header */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          <span className="text-xs text-muted-foreground font-medium shrink-0">Sort by:</span>
          {SORT_KEYS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggleSort(opt.key)}
              aria-pressed={sortKey === opt.key}
              aria-label={`Sort by ${opt.label}, ${sortDir === 'desc' ? 'descending' : 'ascending'}`}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                sortKey === opt.key
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <opt.icon size={12} />
              {opt.label}
              {sortKey === opt.key && (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
            </button>
          ))}
        </div>

        {/* Driver list */}
        {filtered.length === 0 ? (
          <div className="bg-card border rounded-2xl p-8 text-center">
            <Truck className="mx-auto text-muted-foreground mb-3 opacity-40" size={40} />
            <p className="font-medium text-sm">No drivers found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {drivers.length === 0 ? 'No drivers have registered yet.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="bg-card border rounded-2xl overflow-hidden">
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 bg-muted border-b text-xs text-muted-foreground font-medium">
              <div className="col-span-3">Driver</div>
              <div className="col-span-1 text-right">Active</div>
              <div className="col-span-1 text-right">Done</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-2 text-right">Earnings</div>
              <div className="col-span-2 text-right">Pending</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            <div className="divide-y">
              {filtered.map((d, idx) => (
                <div key={d.id} className="md:grid md:grid-cols-12 md:gap-2 px-5 py-3 hover:bg-muted/30 transition-colors">
                  {/* Driver info */}
                  <div className="md:col-span-3 flex items-center gap-2 mb-2 md:mb-0">
                    <span className="text-xs text-muted-foreground font-medium w-5">{idx + 1}</span>
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {d.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{d.full_name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {d.rating > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Star size={10} className="fill-amber-400 text-amber-400" />
                            {d.rating.toFixed(1)}
                          </span>
                        )}
                        {d.company_name && <span className="truncate">· {d.company_name}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Active jobs */}
                  <div className="md:col-span-1 md:text-right flex justify-between md:block mb-1 md:mb-0">
                    <span className="md:hidden text-xs text-muted-foreground">Active</span>
                    {d.active_jobs > 0 ? (
                      <span className="font-semibold text-purple-600 dark:text-purple-400">{d.active_jobs}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </div>

                  {/* Completed */}
                  <div className="md:col-span-1 md:text-right flex justify-between md:block mb-1 md:mb-0">
                    <span className="md:hidden text-xs text-muted-foreground">Completed</span>
                    <span className="text-foreground">{d.completed_jobs}</span>
                  </div>

                  {/* Total jobs */}
                  <div className="md:col-span-1 md:text-right flex justify-between md:block mb-1 md:mb-0">
                    <span className="md:hidden text-xs text-muted-foreground">Total</span>
                    <span className="font-medium">{d.total_jobs}</span>
                  </div>

                  {/* Earnings */}
                  <div className="md:col-span-2 md:text-right flex justify-between md:block mb-1 md:mb-0">
                    <span className="md:hidden text-xs text-muted-foreground">Earnings</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(d.total_earnings)}</span>
                  </div>

                  {/* Pending payouts */}
                  <div className="md:col-span-2 md:text-right flex justify-between md:block mb-1 md:mb-0">
                    <span className="md:hidden text-xs text-muted-foreground">Pending</span>
                    <span className="text-amber-600 dark:text-amber-400">{fmt(d.pending_payouts)}</span>
                  </div>

                  {/* Status */}
                  <div className="md:col-span-2 md:text-right flex justify-between md:block md:justify-end">
                    <span className="md:hidden text-xs text-muted-foreground">Status</span>
                    <Badge variant="secondary" className={STATUS_BADGE[d.status] || ''}>
                      {d.status?.replace('_', ' ') || 'unknown'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}