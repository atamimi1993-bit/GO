import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Truck, DollarSign, TrendingUp, Loader2, Star } from 'lucide-react';

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DriverPerformance() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('admin-dashboard', { action: 'driver_performance' })
      .then((res) => setData(res.data))
      .catch((err) => toast({ title: 'Failed to load driver performance', description: err.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Truck size={20} className="text-emerald-500" />
          <h2 className="font-display font-bold text-lg">Driver Performance</h2>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { drivers, totals } = data;

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Truck size={20} className="text-emerald-500" />
        <h2 className="font-display font-bold text-lg">Driver Performance</h2>
      </div>

      {/* Aggregate summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <DollarSign size={16} className="text-emerald-500 mb-1" />
          <p className="text-lg font-display font-bold">{fmt(totals.totalEarnings)}</p>
          <p className="text-xs text-muted-foreground">Total Earnings</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <DollarSign size={16} className="text-amber-500 mb-1" />
          <p className="text-lg font-display font-bold">{fmt(totals.pendingPayouts)}</p>
          <p className="text-xs text-muted-foreground">Pending Payouts</p>
        </div>
        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
          <TrendingUp size={16} className="text-purple-500 mb-1" />
          <p className="text-lg font-display font-bold">{totals.activeJobs}</p>
          <p className="text-xs text-muted-foreground">Active Jobs</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
          <TrendingUp size={16} className="text-blue-500 mb-1" />
          <p className="text-lg font-display font-bold">{totals.completedJobs}</p>
          <p className="text-xs text-muted-foreground">Completed Jobs</p>
        </div>
      </div>

      {/* Per-driver table */}
      {drivers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No drivers yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="pb-2 pr-3 font-medium">Driver</th>
                <th className="pb-2 pr-3 font-medium text-right">Active</th>
                <th className="pb-2 pr-3 font-medium text-right">Completed</th>
                <th className="pb-2 pr-3 font-medium text-right">Total Jobs</th>
                <th className="pb-2 pr-3 font-medium text-right">Earnings</th>
                <th className="pb-2 pr-3 font-medium text-right">Pending</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {d.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{d.full_name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {d.rating > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Star size={10} className="fill-amber-400 text-amber-400" />
                              {d.rating.toFixed(1)}
                            </span>
                          )}
                          {d.company_name && <span className="truncate">· {d.company_name}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {d.active_jobs > 0 ? (
                      <span className="font-semibold text-purple-600 dark:text-purple-400">{d.active_jobs}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right text-muted-foreground">{d.completed_jobs}</td>
                  <td className="py-3 pr-3 text-right font-medium">{d.total_jobs}</td>
                  <td className="py-3 pr-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(d.total_earnings)}</td>
                  <td className="py-3 pr-3 text-right text-amber-600 dark:text-amber-400">{fmt(d.pending_payouts)}</td>
                  <td className="py-3 text-right">
                    <Badge
                      variant="secondary"
                      className={
                        d.status === 'approved'
                          ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
                          : d.status === 'pending_review'
                            ? 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }
                    >
                      {d.status.replace('_', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}