import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PullToRefresh from '@/components/go/PullToRefresh';
import DemandAreaCard from '@/components/admin/DemandAreaCard';
import { Flame, MapPin, AlertTriangle, TrendingUp, Loader2, Lock, Users } from 'lucide-react';

export default function DemandHeatmap() {
  const { scrollRef } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all'); // all | gaps | undercovered

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('admin-dashboard', { action: 'demand_by_area' });
      setData(res.data);
    } catch (err) {
      if (String(err?.response?.status || err?.message || '').includes('403') ||
          String(err?.message || '').includes('Forbidden')) {
        setForbidden(true);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Lock className="text-muted-foreground" size={28} />
        </div>
        <h2 className="font-display font-bold text-lg mb-1">Admin Access Required</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          The demand heatmap is restricted to platform administrators.
        </p>
      </div>
    );
  }

  const areas = data?.areas || [];
  const totals = data?.totals || {};

  const filtered = areas.filter((a) => {
    if (filter === 'gaps') return a.coverage_gap;
    if (filter === 'undercovered') return a.driver_count <= 1 && a.active_demand > 0;
    return true;
  });

  const maxDemand = filtered.length > 0 ? filtered[0].total_demand : 1;

  const stats = [
    { label: 'Demand Areas', value: totals.totalAreas || 0, icon: MapPin, accent: 'text-blue-600', bg: 'bg-blue-500/5 border-blue-500/20' },
    { label: 'Total Demand', value: totals.totalDemand || 0, icon: TrendingUp, accent: 'text-emerald-600', bg: 'bg-emerald-500/5 border-emerald-500/20' },
    { label: 'Coverage Gaps', value: totals.coverageGaps || 0, icon: AlertTriangle, accent: 'text-orange-600', bg: 'bg-orange-500/5 border-orange-500/20' },
    { label: 'Unserviced Demand', value: totals.unservicedDemand || 0, icon: Flame, accent: 'text-red-600', bg: 'bg-red-500/5 border-red-500/20' },
  ];

  const FILTERS = [
    { key: 'all', label: 'All Areas' },
    { key: 'gaps', label: 'Coverage Gaps' },
    { key: 'undercovered', label: 'Undercovered' },
  ];

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-orange-500 rounded-xl p-2.5 flex items-center justify-center">
            <Flame className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Demand Heatmap</h1>
            <p className="text-muted-foreground text-sm">Where move demand is concentrated — focus driver recruitment where gaps exist.</p>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 mb-4">
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

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Demand areas */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((area, idx) => (
              <DemandAreaCard key={area.city} area={area} rank={areas.indexOf(area) + 1} maxDemand={maxDemand} />
            ))}
          </div>
        ) : (
          <div className="bg-card border rounded-2xl p-8 text-center">
            <Users className="mx-auto text-muted-foreground mb-3" size={32} />
            <p className="text-sm text-muted-foreground">
              {filter === 'gaps'
                ? 'No coverage gaps — all demand areas have at least one driver.'
                : filter === 'undercovered'
                  ? 'No undercovered areas right now.'
                  : 'No move demand data yet. Areas will appear here as move requests come in.'}
            </p>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}