import React, { useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/pricing';

const MONTH_LABEL = (key) => {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

const addMonths = (key, n) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/**
 * Simple linear regression: y = a*x + b
 * Returns slope (a) and intercept (b).
 */
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Builds a weighted average of the last N months for a smoothed forecast.
 */
function movingAverage(values, window = 3) {
  const slice = values.slice(-window);
  if (slice.length === 0) return 0;
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p) => p.dataKey === 'actual');
  const forecast = payload.find((p) => p.dataKey === 'forecast');
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label ? MONTH_LABEL(label) : ''}</p>
      {actual?.value != null && (
        <p className="text-blue-500">● Actual: {fmt(actual.value)}</p>
      )}
      {forecast?.value != null && (
        <p className="text-orange-500">● Forecast: {fmt(forecast.value)}</p>
      )}
    </div>
  );
}

export default function RevenueForecastChart({ moves = [] }) {
  const { chartData, projectedNext, projectedQuarter, confidence } = useMemo(() => {
    const completed = moves.filter((m) => m.status === 'completed' && m.created_date);

    // Group actual revenue by month
    const monthlyMap = {};
    for (const m of completed) {
      const d = new Date(m.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + (Number(m.total_price) || 0);
    }

    const sortedMonths = Object.keys(monthlyMap).sort();
    if (sortedMonths.length === 0) {
      return { chartData: [], projectedNext: 0, projectedQuarter: 0, confidence: 'low' };
    }

    // Build actual data points with x indices for regression
    const actualPoints = sortedMonths.map((key, i) => ({ x: i, y: monthlyMap[key], month: key }));
    const { slope, intercept } = linearRegression(actualPoints);

    // Blend linear regression with moving average for a more stable forecast
    const recentValues = sortedMonths.map((k) => monthlyMap[k]);
    const ma = movingAverage(recentValues, Math.min(3, recentValues.length));

    // Build chart data: actual months + 3 forecast months
    const chartData = sortedMonths.map((key) => ({
      month: key,
      actual: monthlyMap[key],
      forecast: null,
    }));

    const lastIdx = sortedMonths.length - 1;
    const lastKey = sortedMonths[lastIdx];

    const forecasts = [];
    for (let i = 1; i <= 3; i++) {
      const forecastKey = addMonths(lastKey, i);
      const linearPredict = slope * (lastIdx + i) + intercept;
      // Weighted blend: 60% linear trend + 40% moving average, clamp to non-negative
      const blended = Math.max(0, linearPredict * 0.6 + ma * 0.4);
      chartData.push({ month: forecastKey, actual: null, forecast: blended });
      forecasts.push(blended);
    }

    // Connect the last actual point to the first forecast for visual continuity
    if (chartData.length > sortedMonths.length) {
      chartData[sortedMonths.length - 1].forecast = monthlyMap[lastKey];
    }

    const projectedNext = forecasts[0] || 0;
    const projectedQuarter = forecasts.reduce((s, v) => s + v, 0);

    // Confidence heuristic based on data volume
    const dataPoints = completed.length;
    const monthCount = sortedMonths.length;
    let confidence = 'low';
    if (monthCount >= 6 && dataPoints >= 30) confidence = 'high';
    else if (monthCount >= 3 && dataPoints >= 10) confidence = 'medium';

    return { chartData, projectedNext, projectedQuarter, confidence };
  }, [moves]);

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No revenue data yet. Forecasts will appear once completed moves are recorded.
      </p>
    );
  }

  const confidenceColor = {
    high: 'bg-emerald-500/10 text-emerald-600',
    medium: 'bg-amber-500/10 text-amber-600',
    low: 'bg-red-500/10 text-red-600',
  }[confidence];

  const confidenceLabel = {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence',
  }[confidence];

  return (
    <div>
      {/* Forecast summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Sparkles size={14} className="text-orange-500" /> Next Month
          </div>
          <p className="text-lg font-display font-bold text-orange-600 dark:text-orange-400">
            {formatCurrency(projectedNext)}
          </p>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <TrendingUp size={14} className="text-blue-500" /> 3-Month Projection
          </div>
          <p className="text-lg font-display font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(projectedQuarter)}
          </p>
        </div>
        <div className={`${confidenceColor} border border-current/20 rounded-xl p-3`}>
          <div className="text-xs text-muted-foreground mb-1">Forecast Confidence</div>
          <p className="text-lg font-display font-bold capitalize">{confidenceLabel}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-72" role="img" aria-label="Revenue forecast chart with 3-month projection">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
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
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual Revenue"
              stroke="#3b82f6"
              fill="url(#gActual)"
              strokeWidth={2}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ fill: '#f97316', r: 3 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Forecast blends linear trend analysis with 3-month moving average. Not financial advice.
      </p>
    </div>
  );
}