import React, { useState, lazy, Suspense } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StatCard from '@/components/admin/StatCard';
const DriverPerformance = lazy(() => import('@/components/admin/DriverPerformance'));
const DriverTopPerformers = lazy(() => import('@/components/admin/DriverTopPerformers'));
const MoveStatusTracker = lazy(() => import('@/components/admin/MoveStatusTracker'));
const BulkPayoutPanel = lazy(() => import('@/components/admin/BulkPayoutPanel'));
const MoveCalendar = lazy(() => import('@/components/admin/MoveCalendar'));
const EarningsCharts = lazy(() => import('@/components/admin/EarningsCharts'));
import PullToRefresh from '@/components/go/PullToRefresh';
import LeadFinder from '@/components/admin/LeadFinder';
import LeadList from '@/components/admin/LeadList';
import SectionSkeleton from '@/components/admin/SectionSkeleton';
const MarketingPanel = lazy(() => import('@/components/admin/MarketingPanel'));
const AdminQuickLinks = lazy(() => import('@/components/admin/AdminQuickLinks'));
const ExpenseReviewPanel = lazy(() => import('@/components/admin/ExpenseReviewPanel'));
const RentalApprovalPanel = lazy(() => import('@/components/admin/RentalApprovalPanel'));
const InstantPayoutCard = lazy(() => import('@/components/admin/InstantPayoutCard'));
const TaxReportPanel = lazy(() => import('@/components/admin/TaxReportPanel'));
const BackgroundCheckPanel = lazy(() => import('@/components/admin/BackgroundCheckPanel'));
const AdminWorldMap = lazy(() => import('@/components/admin/AdminWorldMap'));
const RecruitmentPipeline = lazy(() => import('@/components/admin/RecruitmentPipeline'));
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  ShieldCheck, DollarSign, Truck, Package, Users, CheckCircle2,
  Loader2, UserCheck, UserX, Wallet, TrendingUp, AlertCircle, MapPin,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  quoted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  accepted: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  completed: 'bg-muted text-foreground',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

export default function Admin() {
  const { scrollRef } = useOutletContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const queryClient = useQueryClient();
  const overviewQueryKey = ['admin-dashboard-overview'];

  const { data, isLoading, isFetching, error: queryError, refetch } = useQuery({
    queryKey: overviewQueryKey,
    queryFn: async () => {
      const res = await base44.functions.invoke('admin-dashboard', { action: 'overview' });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const load = async () => { await refetch(); };

  const error = queryError
    ? (() => {
        const status = queryError?.response?.status;
        if (status === 401) return { title: 'Authentication Required', message: 'Please log in again to view this dashboard.' };
        if (status === 403) return { title: 'Access Denied', message: 'You need admin privileges to view this dashboard.' };
        return { title: 'Failed to Load', message: queryError?.message || 'Something went wrong. Please try again.' };
      })()
    : null;

  const loading = isLoading;

  const handleDriverAction = async (driverId, action) => {
    const driver = data?.pendingDrivers?.find((d) => d.id === driverId);
    setProcessingId(driverId);
    const prevPendingDrivers = data?.pendingDrivers || [];
    // Brief processing toast
    toast({ title: 'Processing...', description: `${action === 'approve_driver' ? 'Approving' : 'Rejecting'} ${driver?.full_name || 'driver'}` });
    // Optimistically remove the driver from the pending list
    if (data?.pendingDrivers) {
      queryClient.setQueryData(overviewQueryKey, (prev) => ({
        ...prev,
        pendingDrivers: prev.pendingDrivers.filter((d) => d.id !== driverId),
      }));
    }
    try {
      await base44.functions.invoke('admin-dashboard', { action, driver_id: driverId });
      toast({ title: `${driver?.full_name || 'Driver'} has been ${action === 'approve_driver' ? 'approved' : 'rejected'}` });
      // Optimistically decrement the pending drivers count instead of a full re-fetch
      queryClient.setQueryData(overviewQueryKey, (prev) => prev ? ({
        ...prev,
        stats: { ...prev.stats, pendingDrivers: Math.max(0, (prev.stats?.pendingDrivers || 0) - 1) },
      }) : prev);
    } catch (err) {
      // Restore the original pending drivers list on error
      queryClient.setQueryData(overviewQueryKey, (prev) => ({ ...prev, pendingDrivers: prevPendingDrivers }));
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateLeadStatus = async (leadId, status) => {
    try {
      await base44.functions.invoke('admin-dashboard', { action: 'update_lead_status', lead_id: leadId, status });
      await refetch();
    } catch (err) {
      toast({ title: 'Failed to update lead', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldCheck className="text-muted-foreground mb-3" size={48} />
        <h2 className="font-display font-bold text-lg mb-1">{error.title}</h2>
        <p className="text-muted-foreground text-sm mb-4 max-w-xs">{error.message}</p>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
          Retry
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
    );
  }

  const { stats, movesByStatus, recentMoves, pendingDrivers, allDrivers, recentPayouts, recentUsers } = data;
  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-500 rounded-xl p-2.5 flex items-center justify-center">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back, {user?.full_name || 'Admin'} — here's your platform overview.</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard icon={DollarSign} label="Total Revenue" value={fmt(stats.totalRevenue)} sublabel={`${fmt(stats.collectedRevenue)} collected`} accent="emerald" />
          <StatCard icon={Package} label="Total Moves" value={stats.totalMoves} sublabel={`${movesByStatus.in_progress} in progress`} accent="blue" />
          <StatCard icon={Truck} label="Drivers" value={stats.totalDrivers} sublabel={`${stats.pendingDrivers} pending review`} accent={stats.pendingDrivers > 0 ? 'amber' : 'emerald'} />
          <StatCard icon={Users} label="Users" value={stats.totalUsers} accent="purple" />
          <StatCard icon={Wallet} label="Pending Payouts" value={fmt(stats.pendingPayouts)} sublabel={`${fmt(stats.paidPayouts)} paid out`} accent="amber" />
          <StatCard icon={TrendingUp} label="Completed Moves" value={movesByStatus.completed} accent="emerald" />
          <StatCard icon={AlertCircle} label="Cancelled" value={movesByStatus.cancelled} accent="red" />
          <StatCard icon={Truck} label="Trucks Registered" value={stats.totalTrucks} accent="blue" />
        </div>

        {/* Quick access links */}
        <Suspense fallback={<SectionSkeleton />}>
          <AdminQuickLinks />
        </Suspense>

        {/* Move status tracker */}
        <Suspense fallback={<SectionSkeleton />}>
          <MoveStatusTracker />
        </Suspense>

        {/* Global operations map */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={20} className="text-emerald-600" />
            <h2 className="font-display font-bold text-lg">Global Operations Map</h2>
          </div>
          {!showMap ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Load the map to view all active moves and driver locations (geocodes up to 30 addresses).</p>
              <Button onClick={() => setShowMap(true)} variant="outline">
                <MapPin size={16} className="mr-1" /> Load Map
              </Button>
            </div>
          ) : (
            <Suspense fallback={<SectionSkeleton />}>
              <AdminWorldMap />
            </Suspense>
          )}
        </div>

        {/* Move calendar */}
        <Suspense fallback={<SectionSkeleton />}>
          <MoveCalendar scrollRef={scrollRef} />
        </Suspense>

        {/* Performance charts */}
        <Suspense fallback={<SectionSkeleton />}>
          <EarningsCharts />
        </Suspense>

        {/* Driver performance */}
        <Suspense fallback={<SectionSkeleton />}>
          <DriverPerformance />
        </Suspense>

        {/* Top performers ranking */}
        <Suspense fallback={<SectionSkeleton />}>
          <DriverTopPerformers />
        </Suspense>

        {/* Marketing & promotions */}
        <Suspense fallback={<SectionSkeleton />}>
          <MarketingPanel />
        </Suspense>

        {/* Driver recruitment pipeline */}
        <Suspense fallback={<SectionSkeleton />}>
          <RecruitmentPipeline />
        </Suspense>

        {/* Pending vehicle listing approvals */}
        <Suspense fallback={<SectionSkeleton />}>
          <RentalApprovalPanel scrollRef={scrollRef} />
        </Suspense>

        {/* Driver expense receipts */}
        <Suspense fallback={<SectionSkeleton />}>
          <ExpenseReviewPanel />
        </Suspense>

        {/* Instant platform payout */}
        <Suspense fallback={<SectionSkeleton />}>
          <InstantPayoutCard />
        </Suspense>

        {/* Bulk payout processing */}
        <Suspense fallback={<SectionSkeleton />}>
          <BulkPayoutPanel scrollRef={scrollRef} />
        </Suspense>

        {/* AI Lead Finder */}
        <LeadFinder onLeadsGenerated={load} />

        <LeadList leads={data.leads} onUpdateStatus={handleUpdateLeadStatus} />

        {/* Move status breakdown */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <h2 className="font-display font-bold text-lg mb-4">Moves by Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(movesByStatus).map(([status, count]) => (
              <div key={status} className="text-center p-3 rounded-xl bg-muted/50">
                <p className="text-2xl font-display font-bold">{count}</p>
                <Badge className={`mt-1 ${STATUS_COLORS[status]}`}>{status.replace('_', ' ')}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Pending driver approvals */}
        {pendingDrivers.length > 0 && (
          <div className="bg-card border rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck size={20} className="text-amber-500" />
              <h2 className="font-display font-bold text-lg">Pending Driver Approvals</h2>
            </div>
            <div className="space-y-3">
              {pendingDrivers.map((d) => (
                <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{d.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.email} · {d.phone}</p>
                    <p className="text-xs text-muted-foreground">License: {d.license_number} · Service area: {d.service_area || 'N/A'}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600"
                      disabled={processingId === d.id}
                      onClick={() => handleDriverAction(d.id, 'approve_driver')}
                    >
                      {processingId === d.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processingId === d.id}
                      onClick={() => handleDriverAction(d.id, 'reject_driver')}
                    >
                      <UserX size={14} />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent moves */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-display font-bold text-lg mb-4">Recent Moves</h2>
            <div className="space-y-2">
              {recentMoves.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No moves yet.</p>
              ) : recentMoves.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.pickup_address} → {m.dropoff_address}</p>
                    <p className="text-xs text-muted-foreground">{m.customer_name || 'Unknown'} · {format(parseISO(m.move_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold">{fmt(m.total_price)}</span>
                    <Badge className={STATUS_COLORS[m.status]}>{m.status?.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent payouts */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-display font-bold text-lg mb-4">Recent Payouts</h2>
            <div className="space-y-2">
              {recentPayouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No payouts yet.</p>
              ) : recentPayouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{fmt(p.amount)}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.notes || 'No notes'}</p>
                  </div>
                  <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced tools (deferred for mobile performance) */}
        <div className="mb-6">
          <Button
            variant="outline"
            className="w-full min-h-[44px]"
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? 'Hide advanced tools' : 'Show advanced tools'}
          </Button>
          {showAdvanced && (
            <>
              <Suspense fallback={<SectionSkeleton />}>
                <TaxReportPanel />
              </Suspense>
              <Suspense fallback={<SectionSkeleton />}>
                <BackgroundCheckPanel drivers={allDrivers} />
              </Suspense>
            </>
          )}
        </div>

        {/* Recent users */}
        <div className="bg-card border rounded-2xl p-5 mt-6">
          <h2 className="font-display font-bold text-lg mb-4">Recent Users</h2>
          <div className="space-y-2">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No users yet.</p>
            ) : recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name || 'Unnamed'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}