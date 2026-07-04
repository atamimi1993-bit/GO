import React from 'react';

export default function StatCard({ icon: Icon, label, value, sublabel, accent = 'emerald' }) {
  const accentMap = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };
  return (
    <div className="bg-card border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
            <Icon size={18} aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="text-2xl font-display font-bold">{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
    </div>
  );
}