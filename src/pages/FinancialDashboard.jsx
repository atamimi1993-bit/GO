import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PullToRefresh from '@/components/go/PullToRefresh';
import { formatCurrency } from '@/lib/pricing';
import { DollarSign, Percent, Wallet, Loader2, Lock, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const MONTH_LABEL = (key) => {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

const fmt = (n) => formatCurrency(n, 'USD');

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label ? MONTH_LABEL(label) : ''}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-muted-foreground">
          <span style={{ color: entry.color }}>●</span>{' '}
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function FinancialDashboard() {
  const { scrollRef } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [data, setData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('admin-dashboard', { action: 'financials' });
      setData(res.data);
    } catch (err) {
      if (String(err?.response?.status || err?.message || '').includes('403') ||
          String(err?.message || '').includes('Forbidden')) {
        setForbidden(true);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

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
          The financial dashboard is restricted to platform administrators.
        </p>
      </div>
    );
  }

  const { series, totals } = data;
  const chartData = (series || []).map((row) => ({
    month: row.month,
    'Platform Earnings': Math.round(row.platform_earnings || 0),
    'App Fee (25%)': Math.round(row.app_fee_income || 0),
    'Driver Payouts': Math.round(row.driver_payouts || 0),
  }));

  const stats = [
    {
      label: 'Total Platform Earnings',
      value: fmt(totals.platformEarnings),
      icon: DollarSign,
      accent: 'text-emerald-600',
      bg: 'bg-emerald-500/5 border-emerald-500/20',
    },
    {
      label: 'App Fee Income (25%)',
      value: fmt(totals.appFeeIncome),
      icon: Percent,
      accent: 'text-blue-600',
      bg: 'bg-blue-500/5 border-blue-500/20',
    },
    {
      label: 'Total Driver Payouts',
      value: fmt(totals.driverPayouts),
      icon: Wallet,
      accent: 'text-purple-600',
      bg: 'bg-purple-500/5 border-purple-500/20',
    },
  ];

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-display font-bold mb-1">Financial Dashboard</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Platform earnings, app fee revenue, and driver payouts over time.
        </p>

        {/* Stat tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
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

        {/* Combined area chart over time */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> Earnings & Payouts Over Time
          </h3>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No financial activity yet. Completed moves and payouts will appear here.
            </p>
          ) : (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gFee" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gPayouts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={MONTH_LABEL}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(v) => fmt(v)}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    width={70}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="Platform Earnings"
                    stroke="#10b981"
                    fill="url(#gEarnings)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="App Fee (25%)"
                    stroke="#3b82f6"
                    fill="url(#gFee)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Driver Payouts"
                    stroke="#a855f7"
                    fill="url(#gPayouts)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}