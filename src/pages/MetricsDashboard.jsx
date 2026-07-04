import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PullToRefresh from '@/components/go/PullToRefresh';
import { formatCurrency } from '@/lib/pricing';
import { BarChart3, CheckCircle2, DollarSign, MapPin, Loader2, Lock, Trophy, TrendingUp, Download, ArrowUpRight, ArrowDownRight, Minus, ChevronDown } from 'lucide-react';
import CompletedMovesChart from '@/components/admin/CompletedMovesChart';
import RevenueTrendChart from '@/components/admin/RevenueTrendChart';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const fmt = (n) => formatCurrency(n, 'USD');

const DATE_RANGES = [
  { key: '3m', label: '3M', months: 3 },
  { key: '6m', label: '6M', months: 6 },
  { key: '12m', label: '12M', months: 12 },
  { key: 'all', label: 'All', months: null },
];

export default function MetricsDashboard() {
  const { scrollRef } = useOutletContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const [expandedRegion, setExpandedRegion] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = { action: 'metrics_overview' };
      const range = DATE_RANGES.find((r) => r.key === dateRange);
      if (range?.months) payload.months_back = range.months;
      const res = await base44.functions.invoke('admin-dashboard', payload);
      setData(res.data);
    } catch (err) {
      if (String(err?.response?.status || err?.message || '').includes('403') ||
          String(err?.message || '').includes('Forbidden')) {
        setForbidden(true);
      }
    }
    setLoading(false);
  }, [dateRange]);

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

  const avgRevenuePerMove = totals.totalCompletedMoves > 0 ? totals.totalRevenue / totals.totalCompletedMoves : 0;

  // Month-over-month growth
  const lastMonth = monthlySeries.length >= 1 ? monthlySeries[monthlySeries.length - 1] : null;
  const prevMonth = monthlySeries.length >= 2 ? monthlySeries[monthlySeries.length - 2] : null;
  const movesGrowth = prevMonth && prevMonth.completed_moves > 0
    ? ((lastMonth.completed_moves - prevMonth.completed_moves) / prevMonth.completed_moves) * 100
    : null;
  const revenueGrowth = prevMonth && prevMonth.move_fee_revenue > 0
    ? ((lastMonth.move_fee_revenue - prevMonth.move_fee_revenue) / prevMonth.move_fee_revenue) * 100
    : null;

  const GrowthBadge = ({ pct }) => {
    if (pct === null) return null;
    const isUp = pct > 0;
    const isFlat = pct === 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isFlat ? 'text-muted-foreground' : isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {isFlat ? <Minus size={12} /> : isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {isFlat ? '0%' : `${Math.abs(pct).toFixed(1)}%`}
      </span>
    );
  };

  const stats = [
    {
      label: 'Completed Moves',
      value: totals.totalCompletedMoves,
      icon: CheckCircle2,
      accent: 'text-emerald-600',
      bg: 'bg-emerald-500/5 border-emerald-500/20',
      growth: movesGrowth,
    },
    {
      label: 'Move-Fee Revenue',
      value: fmt(totals.totalMoveFeeRevenue),
      icon: DollarSign,
      accent: 'text-blue-600',
      bg: 'bg-blue-500/5 border-blue-500/20',
      growth: revenueGrowth,
    },
    {
      label: 'Avg Revenue / Move',
      value: fmt(avgRevenuePerMove),
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

  const handleExportCSV = () => {
    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const monthHeaders = ['month', 'completed_moves', 'move_fee_revenue', 'total_revenue'];
    const monthRows = monthlySeries.map((r) => ({ month: r.month, completed_moves: r.completed_moves, move_fee_revenue: r.move_fee_revenue, total_revenue: r.total_revenue }));

    const regionHeaders = ['region', 'completed_moves', 'revenue', 'move_fee_revenue', 'driver_count'];
    const regionRows = topRegions.map((r) => ({ region: r.region, completed_moves: r.completed_moves, revenue: r.revenue, move_fee_revenue: r.move_fee_revenue, driver_count: r.driver_count }));

    const lines = [];
    lines.push('# Monthly Metrics');
    lines.push(monthHeaders.join(','));
    for (const row of monthRows) lines.push(monthHeaders.map((h) => escape(row[h])).join(','));
    lines.push('');
    lines.push('# Top Driver Regions');
    lines.push(regionHeaders.join(','));
    for (const row of regionRows) lines.push(regionHeaders.map((h) => escape(row[h])).join(','));

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV downloaded', description: 'Open it in Google Sheets (File → Import → Upload).' });
  };

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

        {/* Date range filter */}
        <div className="flex items-center gap-2 mt-6 mb-4">
          <span className="text-xs text-muted-foreground mr-1">Range:</span>
          {DATE_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => { setDateRange(r.key); setExpandedRegion(null); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                dateRange === r.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {stats.map((s, i) => (
            <div key={i} className={`border rounded-2xl p-4 flex items-center gap-3 ${s.bg}`}>
              <div className="w-10 h-10 rounded-xl bg-background/60 flex items-center justify-center shrink-0">
                <s.icon className={s.accent} size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-display font-bold truncate">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                {s.growth !== undefined && s.growth !== null && <div className="mt-0.5"><GrowthBadge pct={s.growth} /></div>}
              </div>
            </div>
          ))}
        </div>

        {/* CSV Export */}
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="min-h-[44px]">
            <Download size={14} className="mr-1" /> Export CSV
          </Button>
        </div>

        {/* Completed moves per month chart */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-600" /> Completed Moves Per Month
          </h3>
          <CompletedMovesChart chartData={monthlySeries} />
        </div>

        {/* Move-fee revenue trend chart */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" /> Move-Fee Revenue Trend
          </h3>
          <RevenueTrendChart chartData={monthlySeries} />
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
                <div key={r.region}>
                  <button
                    onClick={() => setExpandedRegion(expandedRegion === r.region ? null : r.region)}
                    className="flex items-center gap-3 w-full text-left"
                  >
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
                          <ChevronDown size={14} className={`text-muted-foreground transition-transform shrink-0 ${expandedRegion === r.region ? 'rotate-180' : ''}`} />
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
                  </button>
                  {expandedRegion === r.region && r.drivers?.length > 0 && (
                    <div className="ml-10 mt-2 mb-1 space-y-1">
                      {r.drivers.map((d) => (
                        <div key={d.id} className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-muted/50">
                          <div className="min-w-0 mr-2">
                            <p className="font-medium truncate">{d.name}</p>
                            {d.company_name && <p className="text-muted-foreground truncate">{d.company_name}</p>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-muted-foreground">{d.completed_moves} move{d.completed_moves !== 1 ? 's' : ''}</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(d.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}