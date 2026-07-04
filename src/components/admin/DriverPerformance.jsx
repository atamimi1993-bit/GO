import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Truck, DollarSign, TrendingUp, Loader2, Star } from 'lucide-react';

const MAX_ROWS = 20;

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DriverPerformance() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllDrivers, setShowAllDrivers] = useState(false);

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
  const visibleDrivers = showAllDrivers ? drivers : drivers.slice(0, MAX_ROWS);

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
        <>
          {/* Desktop / sm+ table view */}
          <div className="hidden sm:block overflow-x-auto -mx-2 px-2">
            <table role="table" className="w-full text-sm">
              <thead role="rowgroup">
                <tr role="row" className="text-left text-xs text-muted-foreground border-b">
                  <th role="columnheader" scope="col" className="pb-2 pr-3 font-medium">Driver</th>
                  <th role="columnheader" scope="col" className="pb-2 pr-3 font-medium text-right">Active</th>
                  <th role="columnheader" scope="col" className="pb-2 pr-3 font-medium text-right">Completed</th>
                  <th role="columnheader" scope="col" className="pb-2 pr-3 font-medium text-right">Total Jobs</th>
                  <th role="columnheader" scope="col" className="pb-2 pr-3 font-medium text-right">Earnings</th>
                  <th role="columnheader" scope="col" className="pb-2 pr-3 font-medium text-right">Pending</th>
                  <th role="columnheader" scope="col" className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {visibleDrivers.map((d) => (
                  <tr role="row" key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td role="cell" className="py-3 pr-3">
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
                    <td role="cell" className="py-3 pr-3 text-right">
                      {d.active_jobs > 0 ? (
                        <span className="font-semibold text-purple-600 dark:text-purple-400">{d.active_jobs}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td role="cell" className="py-3 pr-3 text-right text-muted-foreground">{d.completed_jobs}</td>
                    <td role="cell" className="py-3 pr-3 text-right font-medium">{d.total_jobs}</td>
                    <td role="cell" className="py-3 pr-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(d.total_earnings)}</td>
                    <td role="cell" className="py-3 pr-3 text-right text-amber-600 dark:text-amber-400">{fmt(d.pending_payouts)}</td>
                    <td role="cell" className="py-3 text-right">
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

          {/* Mobile card list view */}
          <div className="sm:hidden space-y-3">
            {visibleDrivers.map((d) => (
              <div key={d.id} className="border rounded-xl p-4 space-y-3">
                {/* Driver name + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
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
                </div>
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active</span>
                    {d.active_jobs > 0 ? (
                      <span className="font-semibold text-purple-600 dark:text-purple-400">{d.active_jobs}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="text-muted-foreground">{d.completed_jobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Jobs</span>
                    <span className="font-medium">{d.total_jobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Earnings</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(d.total_earnings)}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Pending Payouts</span>
                    <span className="text-amber-600 dark:text-amber-400">{fmt(d.pending_payouts)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {drivers.length > MAX_ROWS && !showAllDrivers && (
            <Button variant="outline" size="sm" className="w-full mt-2 min-h-[44px]" aria-label={`Show all ${drivers.length} drivers`} onClick={() => setShowAllDrivers(true)}>
              Show all {drivers.length} drivers
            </Button>
          )}
        </>
      )}
    </div>
  );
}