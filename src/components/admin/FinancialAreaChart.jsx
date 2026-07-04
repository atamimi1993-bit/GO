import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

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
      {payload.map((entry, i) => (
        <p key={i} className="text-muted-foreground">
          <span style={{ color: entry.color }}>●</span>{' '}
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function FinancialAreaChart({ chartData }) {
  if (!chartData || chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No financial activity yet. Completed moves and payouts will appear here.
      </p>
    );
  }

  return (
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
  );
}