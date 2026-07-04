import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import StatCard from '@/components/admin/StatCard';
import SectionSkeleton from '@/components/admin/SectionSkeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, CheckCircle2, Wallet, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const fmtMoney = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtMoney2 = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTH_LABEL = (key) => {
  try {
    const [y, m] = key.split('-');
    return format(parseISO(`${y}-${m}-01`), 'MMM yy');
  } catch {
    return key;
  }
};

export default function GrowthSummary() {
  const [showAllDrivers, setShowAllDrivers] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-growth-summary'],
    queryFn: async () => {
      const [finRes, perfRes] = await Promise.all([
        base44.functions.invoke('admin-dashboard', { action: 'financials' }),
        base44.functions.invoke('admin-dashboard', { action: 'driver_performance' }),
      ]);
      return { financials: finRes.data, driverPerf: perfRes.data };
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) return <SectionSkeleton />;
  if (error) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">Couldn't load growth data.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }
  if (!data) return null;

  const { financials, driverPerf } = data;
  const series = (financials?.series || []).map((r) => ({
    ...r,
    label: MONTH_LABEL(r.month),
    net_revenue: (r.platform_earnings || 0) - (r.driver_payouts || 0),
  }));
  const totals = financials?.totals || {};
  const drivers = driverPerf?.drivers || [];
  const driverTotals = driverPerf?.totals || {};

  const thisMonth = series[series.length - 1] || null;
  const lastMonth = series[series.length - 2] || null;
  const momRevenue = thisMonth && lastMonth
    ? ((thisMonth.platform_earnings - lastMonth.platform_earnings) / (lastMonth.platform_earnings || 1)) * 100
    : null;

  const chartData = series.slice(-12);

  const visibleDrivers = showAllDrivers ? drivers : drivers.slice(0, 6);

  return (
    <div className="space-y-6 mb-6">
      <div className="flex items-center gap-2">
        <TrendingUp size={22} className="text-emerald-600" />
        <div>
          <h2 className="font-display font-bold text-lg">Growth Summary</h2>
          <p className="text-xs text-muted-foreground">Monthly platform revenue, completed moves, and driver payout breakdown.</p>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={DollarSign}
          label="Platform Revenue"
          value={fmtMoney(totals.platformEarnings || 0)}
          sublabel={momRevenue !== null ? `${momRevenue >= 0 ? '↑' : '↓'} ${Math.abs(momRevenue).toFixed(1)}% vs last month` : 'all-time'}
          accent="emerald"
        />
        <StatCard
          icon={CheckCircle2}
          label="Moves Completed"
          value={driverTotals.completedJobs || 0}
          sublabel={`${driverTotals.activeJobs || 0} active now`}
          accent="blue"
        />
        <StatCard
          icon={Wallet}
          label="Driver Payouts"
          value={fmtMoney(totals.driverPayouts || 0)}
          sublabel={`${fmtMoney(driverTotals.pendingPayouts || 0)} pending`}
          accent="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="Net Platform Income"
          value={fmtMoney((totals.platformEarnings || 0) - (totals.driverPayouts || 0))}
          sublabel={`incl. ${fmtMoney(totals.appFeeIncome || 0)} app fees`}
          accent="purple"
        />
      </div>

      {/* Monthly revenue vs payouts chart */}
      <div className="bg-card border rounded-2xl p-5">
        <h3 className="font-display font-bold text-sm mb-4">Monthly Revenue vs Driver Payouts</h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet.</p>
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" interval={0} angle={-30} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={fmtMoney} width={70} />
                <Tooltip
                  formatter={(v) => fmtMoney2(v)}
                  contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="platform_earnings" name="Platform Revenue" fill="hsl(152 76% 40%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="driver_payouts" name="Driver Payouts" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Driver payout breakdown */}
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm">Driver Payout Breakdown</h3>
          <Badge variant="secondary">{drivers.length} drivers</Badge>
        </div>
        {drivers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No driver payout data yet.</p>
        ) : (
          <div className="space-y-2">
            {visibleDrivers.map((d, i) => {
              const sharePct = (driverTotals.totalEarnings || 0) > 0
                ? ((d.total_earnings || 0) / driverTotals.totalEarnings) * 100
                : 0;
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.completed_jobs} completed · {d.active_jobs} active
                      {d.company_name ? ` · ${d.company_name}` : ''}
                    </p>
                    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(sharePct, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{fmtMoney(d.total_earnings || 0)}</p>
                    {d.pending_payouts > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">{fmtMoney(d.pending_payouts)} pending</p>
                    )}
                  </div>
                </div>
              );
            })}
            {drivers.length > 6 && (
              <Button
                variant="ghost"
                className="w-full min-h-[44px] text-sm"
                onClick={() => setShowAllDrivers((s) => !s)}
              >
                {showAllDrivers ? <ChevronUp size={16} className="mr-1" /> : <ChevronDown size={16} className="mr-1" />}
                {showAllDrivers ? 'Show less' : `Show all ${drivers.length} drivers`}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}