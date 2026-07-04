import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { MapPin, Loader2, Building2 } from 'lucide-react';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const COLORS = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function MovesByCityChart() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    base44.functions.invoke('admin-dashboard', { action: 'moves_by_city' })
      .then((res) => setData(res.data))
      .catch((err) => toast({ title: 'Failed to load city data', description: err.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!data || !data.cities || data.cities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">No completed moves by city yet.</p>
    );
  }

  const chartData = data.cities.map((c, i) => ({
    name: c.city,
    moves: c.completed_moves,
    revenue: Math.round(c.revenue || 0),
    fill: COLORS[i % COLORS.length],
  }));

  const topCity = chartData[0];
  const summary = chartData.map((c) => c.name + ' ' + c.moves + ' moves').join(', ');

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold mb-1">{item.name}</p>
        <p className="text-muted-foreground"><span style={{ color: item.fill }}>●</span> {item.moves} completed moves</p>
        <p className="text-muted-foreground"><span style={{ color: item.fill }}>●</span> {fmt(item.revenue)} revenue</p>
      </div>
    );
  };

  return (
    <div>
      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
          <Building2 size={16} className="text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-display font-bold truncate">{topCity?.name || '—'}</p>
            <p className="text-xs text-muted-foreground">Fastest-growing city</p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center gap-2">
          <MapPin size={16} className="text-blue-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-display font-bold truncate">{data.totalCompleted}</p>
            <p className="text-xs text-muted-foreground">Total completed moves</p>
          </div>
        </div>
      </div>

      <div className="w-full h-72 min-w-[300px] overflow-x-auto" role="img" aria-label="Bar chart showing completed moves by city">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} className="fill-muted-foreground" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={isMobile ? 60 : 80} className="fill-muted-foreground" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
            <Bar dataKey="moves" name="Completed Moves" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="sr-only">Completed moves by city: {summary}.</p>
      </div>
    </div>
  );
}