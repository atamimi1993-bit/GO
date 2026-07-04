import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, subWeeks, isAfter } from 'date-fns';
import {
  TrendingUp, Briefcase, DollarSign, Star, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend,
} from 'recharts';

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const MONTH_AGO = () => subWeeks(new Date(), 4);

function inLastMonth(dateStr) {
  if (!dateStr) return false;
  try {
    return isAfter(parseISO(dateStr), MONTH_AGO());
  } catch {
    return false;
  }
}

export default function DriverMonthlyChart({ driverProfile }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    if (!driverProfile?.id) {
      setLoading(false);
      return;
    }
    try {
      const [moves, payouts, ratings] = await Promise.all([
        base44.entities.MoveRequest.filter({ assigned_driver_id: driverProfile.id }, '-created_date', 200).catch(() => []),
        base44.entities.DriverPayout.filter({ driver_profile_id: driverProfile.id }, '-created_date', 200).catch(() => []),
        base44.entities.Rating.filter({ direction: 'customer_to_driver', ratee_id: driverProfile.id }, '-created_date', 100).catch(() => []),
      ]);

      const monthMoves = moves.filter((m) => m.status === 'completed' && inLastMonth(m.updated_date || m.created_date));
      const monthPayouts = payouts.filter((p) => inLastMonth(p.created_date));
      const monthRatings = ratings.filter((r) => inLastMonth(r.created_date));

      const totalJobs = monthMoves.length;
      const totalEarnings = monthPayouts.reduce((s, p) => s + (p.amount - (p.deduction_amount || 0)), 0);
      const avgRating = monthRatings.length > 0
        ? monthRatings.reduce((s, r) => s + (r.stars || 0), 0) / monthRatings.length
        : 0;

      // Weekly breakdown for chart
      const weeks = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = subWeeks(new Date(), i);
        const weekLabel = i === 0 ? 'This week' : `${i}w ago`;
        const weekMoves = monthMoves.filter((m) => {
          const d = parseISO(m.updated_date || m.created_date);
          return isAfter(d, subWeeks(new Date(), i + 1)) && isAfter(d, subWeeks(new Date(), i + 1)) && !isAfter(d, i === 0 ? new Date() : subWeeks(new Date(), i - 1 < 0 ? 0 : i - 1));
        });
        // simpler: check if within [i weeks ago, (i-1) weeks ago]
        const inWeek = (dateStr) => {
          if (!dateStr) return false;
          try {
            const d = parseISO(dateStr);
            const start = subWeeks(new Date(), i + 1);
            const end = i === 0 ? new Date() : subWeeks(new Date(), i);
            return isAfter(d, start) && !isAfter(d, end);
          } catch { return false; }
        };
        const wMoves = monthMoves.filter((m) => inWeek(m.updated_date || m.created_date));
        const wPayouts = monthPayouts.filter((p) => inWeek(p.created_date));
        const wRatings = monthRatings.filter((r) => inWeek(r.created_date));
        const wEarnings = wPayouts.reduce((s, p) => s + (p.amount - (p.deduction_amount || 0)), 0);
        const wRating = wRatings.length > 0 ? wRatings.reduce((s, r) => s + (r.stars || 0), 0) / wRatings.length : null;
        weeks.push({
          label: weekLabel,
          earnings: Math.round(wEarnings),
          jobs: wMoves.length,
          rating: wRating !== null ? Number(wRating.toFixed(2)) : null,
        });
      }

      setData({ totalJobs, totalEarnings, avgRating, weeks });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [driverProfile?.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6 flex justify-center py-8">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: 'Completed Jobs', value: data.totalJobs, icon: Briefcase, accent: 'text-blue-500' },
    { label: 'Total Earnings', value: fmt(data.totalEarnings), icon: DollarSign, accent: 'text-emerald-600' },
    { label: 'Avg Rating', value: data.avgRating > 0 ? data.avgRating.toFixed(1) : '—', icon: Star, accent: 'text-yellow-500' },
  ];

  const hasData = data.weeks.some((w) => w.earnings > 0 || w.jobs > 0 || w.rating !== null);

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={18} className="text-emerald-600" />
        <h3 className="font-display font-bold text-sm">Past Month Performance</h3>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {stats.map((s, i) => (
          <div key={i} className="bg-muted/50 rounded-xl p-3 text-center">
            <s.icon size={18} className={`mx-auto mb-1 ${s.accent}`} />
            <p className="text-lg font-display font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      {hasData ? (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data.weeks}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              formatter={(value, name) => {
                if (name === 'Earnings') return fmt(value);
                if (name === 'Avg Rating') return value !== null ? `${value}★` : '—';
                return value;
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar yAxisId="left" dataKey="earnings" name="Earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="jobs" name="Jobs" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" dataKey="rating" name="Avg Rating" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="py-8 text-center">
          <Briefcase className="mx-auto text-muted-foreground mb-2 opacity-40" size={32} />
          <p className="text-sm text-muted-foreground">No completed jobs in the past month yet.</p>
        </div>
      )}
    </div>
  );
}