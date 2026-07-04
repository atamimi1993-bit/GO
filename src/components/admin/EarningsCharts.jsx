import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, Loader2, TrendingUp, DollarSign, Truck } from 'lucide-react';

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const COLORS = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const CHART_COLORS = {
  earnings: '#10b981',
  active: '#a855f7',
  completed: '#3b82f6',
  pending: '#f59e0b',
};

export default function EarningsCharts() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('admin-dashboard', { action: 'driver_performance' })
      .then((res) => setData(res.data))
      .catch((err) => toast({ title: 'Failed to load chart data', description: err.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-primary" />
          <h2 className="font-display font-bold text-lg">Performance Charts</h2>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </div>
    );
  }

  if (!data || !data.drivers || data.drivers.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-primary" />
          <h2 className="font-display font-bold text-lg">Performance Charts</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">No driver data available yet.</p>
      </div>
    );
  }

  // Only include drivers with any activity
  const activeDrivers = data.drivers.filter((d) => d.total_jobs > 0 || d.total_earnings > 0);

  // Chart data: top 10 by earnings for readability
  const chartData = activeDrivers
    .slice(0, 10)
    .map((d) => ({
      name: d.full_name?.split(' ').map((w, i) => i === 0 ? w : w[0] + '.').join(' ') || 'Unknown',
      fullName: d.full_name || 'Unknown',
      earnings: Math.round(d.total_earnings || 0),
      active: d.active_jobs || 0,
      completed: d.completed_jobs || 0,
      pending: Math.round(d.pending_payouts || 0),
    }));

  // Pie data: job type distribution
  const jobStatusData = [
    { name: 'Active', value: data.totals.activeJobs, color: CHART_COLORS.active },
    { name: 'Completed', value: data.totals.completedJobs, color: CHART_COLORS.completed },
  ].filter((d) => d.value > 0);

  // Pie data: earnings vs pending payouts
  const earningsBreakdown = [
    { name: 'Paid Out', value: Math.round(data.totals.totalEarnings - data.totals.pendingPayouts), color: CHART_COLORS.earnings },
    { name: 'Pending', value: Math.round(data.totals.pendingPayouts), color: CHART_COLORS.pending },
  ].filter((d) => d.value > 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const driver = chartData.find((d) => d.name === label);
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold mb-1">{driver?.fullName || label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-muted-foreground">
            <span style={{ color: entry.color || entry.fill }}>●</span>{' '}
            {entry.name}: {entry.name.includes('arnings') || entry.name.includes('ending') ? fmt(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 size={20} className="text-primary" />
        <h2 className="font-display font-bold text-lg">Marketplace Performance</h2>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
          <DollarSign size={16} className="text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-display font-bold truncate">{fmt(data.totals.totalEarnings)}</p>
            <p className="text-xs text-muted-foreground">Total Earnings</p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-2">
          <DollarSign size={16} className="text-amber-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-display font-bold truncate">{fmt(data.totals.pendingPayouts)}</p>
            <p className="text-xs text-muted-foreground">Pending Payouts</p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center gap-2">
          <TrendingUp size={16} className="text-purple-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-display font-bold truncate">{data.totals.activeJobs}</p>
            <p className="text-xs text-muted-foreground">Active Jobs</p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center gap-2">
          <Truck size={16} className="text-blue-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-display font-bold truncate">{data.totals.completedJobs}</p>
            <p className="text-xs text-muted-foreground">Completed Jobs</p>
          </div>
        </div>
      </div>

      {/* Earnings by driver bar chart */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <DollarSign size={14} className="text-emerald-500" /> Earnings by Driver
        </h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No earnings data yet.</p>
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={50} className="fill-muted-foreground" />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                <Bar dataKey="earnings" name="Earnings" fill={CHART_COLORS.earnings} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Job volumes by driver */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Truck size={14} className="text-blue-500" /> Job Volumes by Driver
        </h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No job data yet.</p>
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={50} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="fill-muted-foreground" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="active" name="Active" stackId="jobs" fill={CHART_COLORS.active} radius={[0, 0, 0, 0]} />
                <Bar dataKey="completed" name="Completed" stackId="jobs" fill={CHART_COLORS.completed} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Two pie charts side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Job status distribution */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Job Status Distribution</h3>
          {jobStatusData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No jobs yet.</p>
          ) : (
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={jobStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}`}>
                    {jobStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Earnings breakdown */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Payout Breakdown</h3>
          {earningsBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payout data yet.</p>
          ) : (
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={earningsBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${fmt(value)}`}>
                    {earningsBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}