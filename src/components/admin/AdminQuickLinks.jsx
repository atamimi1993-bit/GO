import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Navigation, DollarSign, Trophy, TrendingUp } from 'lucide-react';

const LINKS = [
  { label: 'My Moves', path: '/my-moves', icon: Package, desc: 'View and manage all move requests', accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { label: 'Tracking', path: '/tracking', icon: Navigation, desc: 'Live tracking hub for active moves', accent: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  { label: 'Revenue', path: '/revenue', icon: DollarSign, desc: 'Platform revenue and customer reviews', accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { label: 'Leaderboard', path: '/leaderboard', icon: Trophy, desc: 'Driver and customer rankings', accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { label: 'Financials', path: '/financials', icon: TrendingUp, desc: 'Financial dashboard and analytics', accent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
];

export default function AdminQuickLinks() {
  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <h2 className="font-display font-bold text-lg mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LINKS.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${link.accent}`}>
              <link.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">{link.label}</p>
              <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}