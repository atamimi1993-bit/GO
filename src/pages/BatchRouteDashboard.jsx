import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Route, MapPin, Clock, Truck, DollarSign, Loader2, ArrowLeft, Package, Crown, Navigation, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/pricing';
import PullToRefresh from '@/components/go/PullToRefresh';
import PageHeader from '@/components/go/PageHeader';
import BatchRouteMap from '@/components/go/BatchRouteMap';
import DriverNavigationCard from '@/components/go/DriverNavigationCard';

export default function BatchRouteDashboard() {
  const { scrollRef } = useOutletContext();
  const [batches, setBatches] = useState([]);
  const [batchJobs, setBatchJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);

  const load = useCallback(async () => {
    if (!driverProfile) return;
    try {
      // Find all RouteBatches assigned to this driver that are active
      const driverBatches = await base44.entities.RouteBatch.filter({
        driver_profile_id: driverProfile.id,
        status: { $in: ['accepted', 'offered'] },
      }, '-created_date', 50).catch(() => []);

      setBatches(driverBatches);

      // Load all jobs for each batch
      const jobsByBatch = {};
      for (const batch of driverBatches) {
        const jobIds = (batch.job_ids || '').split(',').filter(Boolean);
        if (jobIds.length === 0) continue;
        const jobs = await base44.entities.MoveRequest.filter({
          id: { $in: jobIds },
        }, '-created_date', 20).catch(() => []);
        jobsByBatch[batch.id] = jobs.sort((a, b) => (a.batch_stop_order || 0) - (b.batch_stop_order || 0));
      }
      setBatchJobs(jobsByBatch);

      // Auto-expand the first active batch
      if (driverBatches.length > 0 && !expandedBatch) {
        setExpandedBatch(driverBatches[0].id);
      }
    } catch {}
    setLoading(false);
  }, [driverProfile, expandedBatch]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const u = await base44.auth.me();
        const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
        if (profiles.length > 0) setDriverProfile(profiles[0]);
      } catch {}
      setLoading(false);
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (driverProfile) load();
  }, [driverProfile, load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (!driverProfile) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <Route className="mx-auto text-muted-foreground mb-4" size={40} />
        <h1 className="text-2xl font-display font-bold mb-3">No Driver Profile</h1>
        <p className="text-muted-foreground mb-6">Register as a driver to access batch routes.</p>
        <Link to="/driver-register">
          <Button>Register as Driver</Button>
        </Link>
      </div>
    );
  }

  const activeBatches = batches.filter((b) => b.status === 'accepted' || b.status === 'offered');

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="max-w-2xl mx-auto pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/driver-hub" className="shrink-0">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <PageHeader title="Batch Route Dashboard" />
        </div>

        {activeBatches.length === 0 ? (
          <div className="bg-card border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Route className="text-violet-500" size={28} />
            </div>
            <h2 className="font-semibold text-lg mb-2">No Active Batch Routes</h2>
            <p className="text-sm text-muted-foreground mb-4">
              When two or more jobs near each other in time and location are assigned to you, they'll appear here as an optimized multi-stop route.
            </p>
            <Link to="/available-jobs">
              <Button variant="outline">
                Browse Available Jobs
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeBatches.map((batch) => {
              const jobs = batchJobs[batch.id] || [];
              const isExpanded = expandedBatch === batch.id;
              const totalPayout = jobs.reduce((sum, j) => sum + (j.driver_payout || 0), 0);
              const batchBonus = batch.batch_completion_bonus || 15;
              const totalEarnings = totalPayout + batchBonus;

              return (
                <div key={batch.id} className="bg-card border-2 border-violet-500/30 rounded-2xl overflow-hidden">
                  {/* Batch header */}
                  <button
                    onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                    className="w-full bg-violet-600 text-white px-4 py-3 flex items-center gap-3 text-left"
                  >
                    <Route size={20} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm">
                        {jobs.length}-Stop Route — {batch.job_count} Jobs
                      </p>
                      <p className="text-xs text-violet-100">
                        {batch.first_job_date ? format(parseISO(batch.first_job_date + 'T00:00:00'), 'EEE, MMM d') : 'TBD'} at {batch.first_job_time || 'TBD'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm">{formatCurrency(totalEarnings)}</p>
                      <p className="text-[10px] text-violet-100">total earnings</p>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {/* Optimized route map */}
                      {jobs.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Navigation size={16} className="text-violet-500" />
                            <h3 className="text-sm font-semibold">Optimized Route Path</h3>
                          </div>
                          <BatchRouteMap jobs={jobs} />
                        </div>
                      )}

                      {/* Ordered stop list */}
                      <div className="space-y-3">
                        {jobs.map((job, idx) => (
                          <div key={job.id} className="relative">
                            {idx > 0 && (
                              <div className="absolute -top-3 left-5 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <div className="w-px h-3 bg-muted-foreground/30" />
                                <span className="px-1">travel</span>
                                <div className="flex-1" />
                              </div>
                            )}
                            <div className={`rounded-xl p-3 ${idx === 0 ? 'bg-violet-500/5' : 'bg-emerald-500/5'}`}>
                              {/* Stop number + time */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                  idx === 0 ? 'bg-violet-500 text-white' : 'bg-emerald-500 text-white'
                                }`}>
                                  {idx + 1}
                                </span>
                                <span className="font-semibold text-sm">
                                  {job.move_date ? format(parseISO(job.move_date + 'T00:00:00'), 'EEE, MMM d') : 'TBD'} at {job.move_time || 'TBD'}
                                </span>
                                {job.customer_tier === 'premier' && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-300 text-amber-950">
                                    <Crown size={8} strokeWidth={2.5} /> Premier
                                  </span>
                                )}
                              </div>

                              {/* Pickup */}
                              <div className="flex items-start gap-2 mb-1">
                                <MapPin size={14} className="text-violet-500 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pickup</p>
                                  <p className="text-xs font-medium truncate">{job.pickup_address || 'N/A'}</p>
                                </div>
                              </div>

                              {/* Dropoff */}
                              <div className="flex items-start gap-2 mb-2">
                                <MapPin size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Drop-off</p>
                                  <p className="text-xs font-medium truncate">{job.dropoff_address || 'N/A'}</p>
                                </div>
                              </div>

                              {/* Job details row */}
                              <div className="flex items-center gap-3 text-xs">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Truck size={12} /> {job.truck_size_needed?.replace('_', ' ') || 'Any'}
                                </span>
                                {job.total_weight_lbs > 0 && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Package size={12} /> {job.total_weight_lbs.toLocaleString()} lbs
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold ml-auto">
                                  <DollarSign size={12} /> {formatCurrency(job.driver_payout || 0, job.currency)}
                                </span>
                              </div>

                              {/* Navigation */}
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <DriverNavigationCard move={job} compact />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Earnings summary */}
                      <div className="bg-violet-500/10 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Job Payouts ({jobs.length} jobs)</span>
                          <span className="font-semibold">{formatCurrency(totalPayout)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Batch Completion Bonus</span>
                          <span className="font-semibold text-violet-600 dark:text-violet-400">+{formatCurrency(batchBonus)}</span>
                        </div>
                        <div className="flex items-center justify-between text-base pt-1 border-t border-violet-500/20">
                          <span className="font-bold">Total Earnings</span>
                          <span className="font-bold text-violet-600 dark:text-violet-400">{formatCurrency(totalEarnings)}</span>
                        </div>
                      </div>

                      {/* Estimated savings */}
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <DollarSign size={12} />
                        <span>Estimated platform savings: {formatCurrency(batch.estimated_savings || 0)}</span>
                      </div>

                      {/* Batch status badge */}
                      <div className="flex items-center justify-center">
                        <Badge className={
                          batch.status === 'accepted' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        }>
                          {batch.status === 'accepted' ? 'Route Accepted' : 'Pending Acceptance'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}