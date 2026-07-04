import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MONTH_LABEL = (key) => {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label ? MONTH_LABEL(label) : ''}</p>
      <p className="text-muted-foreground">
        <span className="text-blue-500">●</span> Move-Fee Revenue: {fmt(payload[0]?.value)}
      </p>
    </div>
  );
}

export default function RevenueTrendChart({ chartData }) {
  if (!chartData || chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No revenue data yet. Move-fee revenue will appear here as moves are completed.
      </p>
    );
  }

  return (
    <div className="w-full h-72" role="img" aria-label="Area chart showing move-fee revenue per month">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gMoveFee" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
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
          <Area
            type="monotone"
            dataKey="move_fee_revenue"
            name="Move-Fee Revenue"
            stroke="#3b82f6"
            fill="url(#gMoveFee)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}