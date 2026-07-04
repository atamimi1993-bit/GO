import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  TriangleAlert, CircleCheck, Truck, Wallet, ShieldCheck, Gauge, Loader2,
} from 'lucide-react';
import { PRICING_CONFIG } from '@/lib/pricing';

const round2 = (n) => Math.round((n || 0) * 100) / 100;

function StatCard({ icon: Icon, label, value, sub, tone = 'neutral' }) {
  if (!Icon) return null;

  const toneMap = {
    neutral: 'text-foreground',
    good: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
    bad: 'text-destructive',
  };
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-2 min-w-[160px]">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-medium">
        <Icon size={14} strokeWidth={2} />
        {label}
      </div>
      <div className={`text-2xl font-mono font-semibold ${toneMap[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function MarginPayoutDashboard() {
  const [jobCount, setJobCount] = useState(30);

  const { data: moves, isLoading } = useQuery({
    queryKey: ['margin-payout-jobs'],
    queryFn: async () => {
      const res = await base44.entities.MoveRequest.filter(
        { paid: true, status: 'completed' },
        '-updated_date',
        100
      );
      return res || [];
    },
    staleTime: 60 * 1000,
  });

  const jobs = useMemo(() => {
    if (!moves || moves.length === 0) return [];

    let reservePool = 850;
    const processed = moves.slice(0, jobCount).map((m, i) => {
      const jobValue = round2(m.total_price - (m.tax_amount || 0) - (m.booking_fee || 0) - (m.materials_fee || 0) - (m.fuel_cost || 0) - (m.tolls || 0));
      const driverPayout = round2(m.driver_payout || (jobValue * PRICING_CONFIG.DRIVER_PAYOUT_PCT));
      const platformFeeGross = round2(m.app_fee || (jobValue * PRICING_CONFIG.PLATFORM_FEE_PCT));
      const processingFee = round2(jobValue * PRICING_CONFIG.CARD_PROCESSING_PCT + PRICING_CONFIG.CARD_PROCESSING_FLAT);
      const reserveContribution = round2(jobValue * PRICING_CONFIG.RESERVE_POOL_PCT);

      reservePool += reserveContribution;

      const totalCosts = round2(processingFee + reserveContribution);
      const netProfit = round2(platformFeeGross - totalCosts);
      const netProfitPct = jobValue > 0 ? round2(netProfit / jobValue) : 0;
      const reconciles = round2(driverPayout + platformFeeGross) === jobValue;

      return {
        id: `GO-${m.id.slice(-6).toUpperCase()}`,
        moveId: m.id,
        day: i + 1,
        jobValue,
        driverPayout,
        platformFeeGross,
        processingFee,
        reserveContribution,
        netProfit,
        netProfitPct,
        reconciles,
        reservePoolAfter: round2(reservePool),
        date: m.updated_date,
      };
    });
    return processed;
  }, [moves, jobCount]);

  const stats = useMemo(() => {
    if (jobs.length === 0) return null;
    const avgNetProfitPct = round2(jobs.reduce((a, j) => a + j.netProfitPct, 0) / jobs.length);
    const totalDriverPay = round2(jobs.reduce((a, j) => a + j.driverPayout, 0));
    const totalPlatformFee = round2(jobs.reduce((a, j) => a + j.platformFeeGross, 0));
    const totalNetProfit = round2(jobs.reduce((a, j) => a + j.netProfit, 0));
    const reservePoolNow = jobs[jobs.length - 1]?.reservePoolAfter ?? 0;
    const brokenJobs = jobs.filter((j) => !j.reconciles);
    const netStatus = avgNetProfitPct >= PRICING_CONFIG.TARGET_NET_PROFIT_PCT ? 'good' : avgNetProfitPct >= 0.20 ? 'warn' : 'bad';

    return { avgNetProfitPct, totalDriverPay, totalPlatformFee, totalNetProfit, reservePoolNow, brokenJobs, netStatus };
  }, [jobs]);

  const chartData = jobs.map((j) => ({ day: j.day, netProfitPct: round2(j.netProfitPct * 100) }));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!moves || moves.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <Truck className="mx-auto text-muted-foreground mb-3" size={32} />
        <p className="text-sm text-muted-foreground">No completed jobs yet. Margin data will appear once jobs are paid and completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest font-medium mb-1">
            <Truck size={14} />
            GO Movers — Margin &amp; Payout Ledger
          </div>
          <h2 className="font-display font-bold text-lg">Margin &amp; Payout Dashboard</h2>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Target net profit</div>
          <div className="font-mono text-xl font-semibold text-emerald-600 dark:text-emerald-400">
            {(PRICING_CONFIG.TARGET_NET_PROFIT_PCT * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          icon={Gauge}
          label="Avg Net Profit"
          value={`${(stats.avgNetProfitPct * 100).toFixed(1)}%`}
          sub={`Target ${(PRICING_CONFIG.TARGET_NET_PROFIT_PCT * 100).toFixed(0)}%`}
          tone={stats.netStatus}
        />
        <StatCard
          icon={Wallet}
          label={`Platform Fee (${(PRICING_CONFIG.PLATFORM_FEE_PCT * 100).toFixed(0)}%)`}
          value={`$${stats.totalPlatformFee.toFixed(2)}`}
          sub={`${jobs.length} jobs`}
        />
        <StatCard
          icon={Truck}
          label={`Driver Payouts (${(PRICING_CONFIG.DRIVER_PAYOUT_PCT * 100).toFixed(0)}%)`}
          value={`$${stats.totalDriverPay.toFixed(2)}`}
          sub="Protected floor — never adjusted"
          tone="good"
        />
        <StatCard
          icon={ShieldCheck}
          label="Reserve Pool"
          value={`$${stats.reservePoolNow.toFixed(2)}`}
          sub="Absorbs refunds — pooled"
        />
        <StatCard
          icon={stats.brokenJobs.length ? TriangleAlert : CircleCheck}
          label="Split Integrity"
          value={stats.brokenJobs.length ? `${stats.brokenJobs.length} flagged` : 'All reconcile'}
          tone={stats.brokenJobs.length ? 'bad' : 'good'}
        />
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-medium">
            Net Profit % — trailing {jobCount} jobs
          </h3>
          <div className="flex gap-2">
            {[15, 30, 60].map((n) => (
              <button
                key={n}
                onClick={() => setJobCount(n)}
                className={`text-xs px-3 py-1 rounded font-mono transition-colors ${
                  jobCount === n
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} unit="%" />
            <ReferenceLine
              y={PRICING_CONFIG.TARGET_NET_PROFIT_PCT * 100}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              label={{ value: 'target', fill: 'hsl(var(--primary))', fontSize: 11, position: 'insideTopRight' }}
            />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12, color: 'hsl(var(--card-foreground))' }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Line
              type="monotone"
              dataKey="netProfitPct"
              stroke="hsl(var(--chart-4))"
              strokeWidth={2}
              dot={{ r: 2, fill: 'hsl(var(--chart-4))' }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts */}
      {stats.brokenJobs.length > 0 && (
        <div className="space-y-2">
          {stats.brokenJobs.slice(0, 5).map((j) => (
            <div key={j.id} className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm">
              <TriangleAlert size={16} className="text-destructive shrink-0" />
              <span className="text-destructive font-mono">{j.id}</span>
              <span className="text-destructive/80">split does not reconcile — driver + platform ≠ job value. Investigate immediately.</span>
            </div>
          ))}
        </div>
      )}

      {/* Ledger table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-medium">Job Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                <th className="text-left px-4 py-3">Job</th>
                <th className="text-right px-3 py-3">Job Value</th>
                <th className="text-right px-3 py-3">Driver</th>
                <th className="text-right px-3 py-3">Platform</th>
                <th className="text-right px-3 py-3">Costs</th>
                <th className="text-right px-3 py-3">Net %</th>
                <th className="text-center px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(-12).reverse().map((j) => (
                <tr key={j.id} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="px-4 py-3 text-muted-foreground">{j.id}</td>
                  <td className="px-3 py-3 text-right">${j.jobValue.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right text-emerald-600 dark:text-emerald-400">${j.driverPayout.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right">${j.platformFeeGross.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">
                    ${(j.processingFee + j.reserveContribution).toFixed(2)}
                  </td>
                  <td className={`px-3 py-3 text-right ${
                    j.netProfitPct >= PRICING_CONFIG.TARGET_NET_PROFIT_PCT ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {(j.netProfitPct * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-center">
                    {j.reconciles ? (
                      <CircleCheck size={15} className="text-emerald-600 dark:text-emerald-400 inline" />
                    ) : (
                      <TriangleAlert size={15} className="text-destructive inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
        Driver payout is calculated once per job and never modified by refunds, disputes, processing
        fees, or promotions — those are absorbed by the pooled reserve shown above. Data reflects
        completed, paid moves from the live MoveRequest table.
      </p>
    </div>
  );
}