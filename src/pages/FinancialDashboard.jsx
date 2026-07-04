import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PullToRefresh from '@/components/go/PullToRefresh';
import { formatCurrency } from '@/lib/pricing';
import { DollarSign, Percent, Wallet, Loader2, Lock, TrendingUp } from 'lucide-react';

const FinancialAreaChart = lazy(() => import('@/components/admin/FinancialAreaChart'));

const fmt = (n) => formatCurrency(n, 'USD');

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
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>}>
            <FinancialAreaChart chartData={chartData} />
          </Suspense>
        </div>
      </div>
    </PullToRefresh>
  );
}