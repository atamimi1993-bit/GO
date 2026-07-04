import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import PullToRefresh from '@/components/go/PullToRefresh';
import PageHeader from '@/components/go/PageHeader';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { LineChart as LineChartIcon, DollarSign, TrendingUp, Truck, Users, Loader2 } from 'lucide-react';

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (curr, prev) => {
  if (!prev || prev === 0) return curr > 0 ? '+100%' : '0%';
  const diff = ((curr - prev) / prev) * 100;
  return `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%`;
};

function SummaryTile({ icon: Icon, label, value, growth, accent }) {
  const isPositive = growth?.startsWith('+');
  return (
    <div className={`p-4 rounded-xl border ${accent}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} className="opacity-80" />
        {growth && (
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {growth}
          </span>
        )}
      </div>
      <p className="text-2xl font-display font-bold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label, isCurrency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1">Week of {label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-muted-foreground">
          <span style={{ color: entry.color || entry.stroke || entry.fill }}>●</span>{' '}
          {entry.name}: {isCurrency ? fmt(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function GrowthDashboard() {
  const { scrollRef } = useOutletContext();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('admin-dashboard', { action: 'weekly_growth' });
      setData(res.data);
    } catch (err) {
      toast({ title: 'Failed to load growth data', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
    );
  }

  if (!data) return null;

  const { series, thisWeek, lastWeek } = data;

  const earningsSummary = series.map((w) => `Week of ${w.label}: ${fmt(w.earnings)}`).join(', ');
  const movesSummary = series.map((w) => `Week of ${w.label}: ${w.new_moves} new, ${w.active_moves} active`).join(', ');
  const driverSummary = series.map((w) => `Week of ${w.label}: ${w.new_drivers} new, ${w.active_drivers} active`).join(', ');

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="pb-4">
        <PageHeader title="Growth Dashboard" isRoot={false} />
        <p className="text-muted-foreground text-sm mb-6">Platform growth over the last 12 weeks.</p>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <SummaryTile
            icon={DollarSign}
            label="This Week Earnings"
            value={fmt(thisWeek.earnings)}
            growth={fmtPct(thisWeek.earnings, lastWeek.earnings)}
            accent="bg-emerald-500/5 border-emerald-500/20"
          />
          <SummaryTile
            icon={TrendingUp}
            label="Active Moves"
            value={thisWeek.active_moves}
            growth={fmtPct(thisWeek.active_moves, lastWeek.active_moves)}
            accent="bg-purple-500/5 border-purple-500/20"
          />
          <SummaryTile
            icon={Truck}
            label="Completed This Week"
            value={thisWeek.completed_moves}
            growth={fmtPct(thisWeek.completed_moves, lastWeek.completed_moves)}
            accent="bg-blue-500/5 border-blue-500/20"
          />
          <SummaryTile
            icon={Users}
            label="New Drivers"
            value={thisWeek.new_drivers}
            growth={fmtPct(thisWeek.new_drivers, lastWeek.new_drivers)}
            accent="bg-amber-500/5 border-amber-500/20"
          />
        </div>

        {/* Weekly Earnings */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={20} className="text-emerald-600" />
            <h2 className="font-display font-bold text-lg">Weekly Earnings</h2>
          </div>
          {series.every((w) => w.earnings === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">No earnings data yet.</p>
          ) : (
            <div className="w-full h-64 min-w-[300px] overflow-x-auto" role="img" aria-label="Area chart showing weekly earnings">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gWeeklyEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} className="fill-muted-foreground" width={70} />
                  <Tooltip content={<ChartTooltip isCurrency />} />
                  <Area type="monotone" dataKey="earnings" name="Earnings" stroke="#10b981" fill="url(#gWeeklyEarnings)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              <p className="sr-only">Weekly earnings: {earningsSummary}.</p>
            </div>
          )}
        </div>

        {/* Active & New Moves */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <LineChartIcon size={20} className="text-purple-600" />
            <h2 className="font-display font-bold text-lg">Active & New Moves</h2>
          </div>
          {series.every((w) => w.new_moves === 0 && w.active_moves === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">No move activity yet.</p>
          ) : (
            <div className="w-full h-64 min-w-[300px] overflow-x-auto" role="img" aria-label="Line chart showing active and new moves per week">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="new_moves" name="New Moves" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="active_moves" name="Active Moves" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="sr-only">Moves per week: {movesSummary}.</p>
            </div>
          )}
        </div>

        {/* Driver Performance */}
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={20} className="text-amber-600" />
            <h2 className="font-display font-bold text-lg">Driver Growth</h2>
          </div>
          {series.every((w) => w.new_drivers === 0 && w.active_drivers === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">No driver activity yet.</p>
          ) : (
            <div className="w-full h-64 min-w-[300px] overflow-x-auto" role="img" aria-label="Bar chart showing new and active drivers per week">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="new_drivers" name="New Drivers" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="active_drivers" name="Active Drivers" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="sr-only">Driver growth per week: {driverSummary}.</p>
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}