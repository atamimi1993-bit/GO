import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Route, TrendingDown, CheckCircle2, XCircle, Clock, Percent, DollarSign, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/pricing';

export default function BatchMetricsDashboard() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const result = await base44.entities.RouteBatch.list('-created_date', 200);
      setBatches(result || []);
    } catch {
      // silent
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="p-5 flex items-center justify-center min-h-[200px]">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const totalBatches = batches.length;
  const completedBatches = batches.filter((b) => b.status === 'completed');
  const acceptedBatches = batches.filter((b) => b.status === 'accepted' || b.status === 'completed');
  const offeredBatches = batches.filter((b) => b.status === 'offered');
  const declinedBatches = batches.filter((b) => b.status === 'declined');
  const expiredBatches = batches.filter((b) => b.status === 'expired');
  const violatedBatches = batches.filter((b) => b.violation_flagged === true);

  const totalSavings = completedBatches.reduce((sum, b) => sum + (b.estimated_savings || 0), 0);
  const avgSavings = completedBatches.length > 0 ? totalSavings / completedBatches.length : 0;
  const batchRate = totalBatches > 0 ? Math.round((acceptedBatches.length / totalBatches) * 100) : 0;
  const driverAcceptanceRate = totalBatches > 0 ? Math.round((acceptedBatches.length / (acceptedBatches.length + declinedBatches.length + expiredBatches.length || 1)) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Route size={16} className="text-violet-500" />
            <span className="text-xs text-muted-foreground">Batch Rate</span>
          </div>
          <p className="text-2xl font-bold">{batchRate}%</p>
          <p className="text-[10px] text-muted-foreground">{acceptedBatches.length} of {totalBatches} accepted</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-emerald-500" />
            <span className="text-xs text-muted-foreground">Avg Savings</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(avgSavings)}</p>
          <p className="text-[10px] text-muted-foreground">per batch</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-blue-500" />
            <span className="text-xs text-muted-foreground">Driver Accept Rate</span>
          </div>
          <p className="text-2xl font-bold">{driverAcceptanceRate}%</p>
          <p className="text-[10px] text-muted-foreground">{declinedBatches.length} declined</p>
        </Card>

        <Card className={`p-4 ${violatedBatches.length > 0 ? 'border-red-500/40' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className={violatedBatches.length > 0 ? 'text-red-500' : 'text-muted-foreground'} />
            <span className="text-xs text-muted-foreground">Arrival Violations</span>
          </div>
          <p className={`text-2xl font-bold ${violatedBatches.length > 0 ? 'text-red-500' : ''}`}>{violatedBatches.length}</p>
          <p className="text-[10px] text-muted-foreground">should be 0</p>
        </Card>
      </div>

      {/* Total savings */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown size={20} className="text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Total Platform Savings from Batching</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalSavings)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Completed Batches</p>
            <p className="text-xl font-bold">{completedBatches.length}</p>
          </div>
        </div>
      </Card>

      {/* Recent batches list */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-muted-foreground" />
          <h3 className="font-semibold text-sm">Recent Batch Routes</h3>
        </div>
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No batches created yet. The scanner runs every 5 minutes.</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {batches.slice(0, 20).map((batch) => (
              <div key={batch.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {batch.driver_name || 'Unassigned'} — {batch.job_count} stops
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {batch.first_job_date} at {batch.first_job_time || 'TBD'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(batch.estimated_savings || 0)}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    batch.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    batch.status === 'accepted' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                    batch.status === 'offered' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' :
                    batch.status === 'declined' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                    batch.status === 'expired' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {batch.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}