import React from 'react';
import { Crown } from 'lucide-react';

export default function PremierBadge({ compact = false, className = '' }) {
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 ${className}`}
      >
        <Crown size={10} strokeWidth={2.5} />
        Premier
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 ${className}`}
    >
      <Crown size={14} strokeWidth={2.5} />
      GO Premier
    </div>
  );
}