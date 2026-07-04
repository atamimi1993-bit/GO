import React from 'react';
import { MapPin, Flame, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/pricing';

const fmt = (n) => formatCurrency(n, 'USD');

const STATUS_LABELS = [
  { key: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { key: 'quoted', label: 'Quoted', color: 'bg-blue-500' },
  { key: 'accepted', label: 'Accepted', color: 'bg-emerald-500' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-purple-500' },
  { key: 'completed', label: 'Completed', color: 'bg-muted-foreground' },
];

export default function DemandAreaCard({ area, rank, maxDemand }) {
  const barWidth = maxDemand > 0 ? (area.total_demand / maxDemand) * 100 : 0;
  const isHotspot = area.active_demand >= 3 && area.driver_count === 0;
  const isUndercovered = area.active_demand > 0 && area.driver_count <= 1;

  return (
    <div className={`bg-card border rounded-2xl p-4 ${isHotspot ? 'border-orange-500/40 bg-orange-500/5' : 'border-border'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${rank === 1 ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-muted text-muted-foreground'}`}>
          {rank === 1 ? <Flame size={14} /> : rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-muted-foreground shrink-0" />
            <p className="font-medium text-sm truncate">{area.city}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{area.total_demand} total move{area.total_demand !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-0.5">
              <Users size={11} /> {area.driver_count} driver{area.driver_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">{fmt(area.revenue_potential + area.collected_revenue)}</p>
          <p className="text-xs text-muted-foreground">{fmt(area.collected_revenue)} collected</p>
        </div>
      </div>

      {/* Demand bar */}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
        {STATUS_LABELS.map((s) => {
          const count = area[s.key] || 0;
          if (count === 0) return null;
          const pct = (count / area.total_demand) * 100;
          return <div key={s.key} className={s.color} style={{ width: `${pct}%` }} title={`${s.label}: ${count}`} />;
        })}
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {STATUS_LABELS.map((s) => {
          const count = area[s.key] || 0;
          if (count === 0) return null;
          return (
            <span key={s.key} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              {s.label}: {count}
            </span>
          );
        })}
      </div>

      {/* Recruitment flag */}
      {isHotspot && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-orange-600 dark:text-orange-400 font-medium">
          <AlertTriangle size={13} />
          Hotspot — {area.active_demand} active demand, 0 drivers covering this area
        </div>
      )}
      {isUndercovered && !isHotspot && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <TrendingUp size={13} />
          Undercovered — {area.active_demand} active demand vs {area.driver_count} driver{area.driver_count !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}