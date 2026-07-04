import React from 'react';
import { TrendingUp, Zap, Flame } from 'lucide-react';

const LEVEL_STYLES = {
  normal: { bg: 'bg-muted', text: 'text-muted-foreground', icon: TrendingUp },
  moderate: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: TrendingUp },
  high: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: Flame },
  peak: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', icon: Zap },
};

export default function SurgeBadge({ surge, compact = false }) {
  if (!surge || surge.level === 'normal') return null;
  const style = LEVEL_STYLES[surge.level] || LEVEL_STYLES.normal;
  const Icon = style.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon size={12} />
        {surge.label} · {surge.multiplier}×
      </span>
    );
  }

  return (
    <div className={`rounded-xl border p-3 ${style.bg} ${style.text}`}>
      <div className="flex items-center gap-2">
        <Icon size={16} />
        <span className="font-display font-bold text-sm">{surge.label}</span>
        <span className="ml-auto font-display font-black text-lg">{surge.multiplier}×</span>
      </div>
      <p className="text-xs mt-1 opacity-90">
        {surge.reasons.join(' · ')}
      </p>
    </div>
  );
}