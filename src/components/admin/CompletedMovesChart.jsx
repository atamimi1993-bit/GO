import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MONTH_LABEL = (key) => {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label ? MONTH_LABEL(label) : ''}</p>
      <p className="text-muted-foreground">
        <span className="text-emerald-500">●</span> Completed Moves: {payload[0]?.value || 0}
      </p>
    </div>
  );
}

export default function CompletedMovesChart({ chartData }) {
  if (!chartData || chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No completed moves yet. Completed moves will appear here by month.
      </p>
    );
  }

  return (
    <div className="w-full h-72" role="img" aria-label="Bar chart showing completed moves per month">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="month"
            tickFormatter={MONTH_LABEL}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
          <Bar dataKey="completed_moves" name="Completed Moves" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill="#10b981" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}