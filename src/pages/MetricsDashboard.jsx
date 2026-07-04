import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PullToRefresh from '@/components/go/PullToRefresh';
import { formatCurrency } from '@/lib/pricing';
import { BarChart3, CheckCircle2, DollarSign, MapPin, Loader2, Lock, Trophy, TrendingUp } from 'lucide-react';
import CompletedMovesChart from '@/components/admin/CompletedMovesChart';

const fmt = (n) => formatCurrency(n, 'USD');

export default function MetricsDashboard() {
  const { scrollRef } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('admin-dashboard', { action: 'metrics_overview' });
      setData(res.data);
    } catch (err) {
      if (String(err?.response?.status || err?.message || '').includes('403') ||
          String(err?.message || '').includes('Forbidden')) {
        setForbidden(true);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (forbidden || !data) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Lock className="text-muted-foreground" size={28} />
        </div>
        <h2 className="font-display font-bold text-lg mb-1">Admin Access Required</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          The metrics dashboard is restricted to platform administrators.
        </p>
      </div>
    );
  }

  const { monthlySeries, topRegions, totals } = data;

  const stats = [
    {
      label: 'Completed Moves',
      value: totals.totalCompletedMoves,
      icon: CheckCircle2,
      accent: 'text-emerald-600',
      bg: 'bg-emerald-500/5 border-emerald-500/20',
    },
    {
      label: 'Move-Fee Revenue',
      value: fmt(totals.totalMoveFeeRevenue),
      icon: DollarSign,
      accent: 'text-blue-600',
      bg: 'bg-blue-500/5 border-blue-500/20',
    },
    {
      label: 'Total Move Revenue',
      value: fmt(totals.totalRevenue),
      icon: TrendingUp,
      accent: 'text-purple-600',
      bg: 'bg-purple-500/5 border-purple-500/20',
    },
    {
      label: 'Active Driver Regions',
      value: topRegions.length,
      icon: MapPin,
      accent: 'text-amber-600',
      bg: 'bg-amber-500/5 border-amber-500/20',
    },
  ];

  const maxMoves = topRegions.length > 0 ? topRegions[0].completed_moves : 1;

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-emerald-500 rounded-xl p-2.5 flex items-center justify-center">
            <BarChart3 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Metrics Dashboard</h1>
            <p className="text-muted-foreground text-sm">Completed moves, driver regions, and platform revenue from move fees.</p>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 mb-6">
          {stats.map((s, i) => (
            <div key={i} className={`border rounded-2xl p-4 flex items-center gap-3 ${s.bg}`}>
              <div className="w-10 h-10 rounded-xl bg-background/60 flex items-center justify-center shrink-0">
                <s.icon className={s.accent} size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-display font-bold truncate">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Completed moves per month chart */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-600" /> Completed Moves Per Month
          </h3>
          <CompletedMovesChart chartData={monthlySeries} />
        </div>

        {/* Top-performing driver regions */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" /> Top-Performing Driver Regions
          </h3>
          {topRegions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No completed moves yet. Driver regions will appear here as moves are completed.
            </p>
          ) : (
            <div className="space-y-3">
              {topRegions.map((r, idx) => (
                <div key={r.region} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium text-sm truncate flex items-center gap-1">
                        <MapPin size={12} className="text-muted-foreground shrink-0" />
                        {r.region}
                      </p>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="text-muted-foreground">{r.completed_moves} moves</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(r.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${(r.completed_moves / maxMoves) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.driver_count} driver{r.driver_count !== 1 ? 's' : ''} · {fmt(r.move_fee_revenue)} in move fees
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}