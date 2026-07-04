import React, { useState, Suspense, lazy } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ShieldCheck, Loader2 } from 'lucide-react';
import PullToRefresh from '@/components/go/PullToRefresh';
import AdminTabs from '@/components/admin/AdminTabs';

export default function Admin() {
  const { scrollRef } = useOutletContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState(null);

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

  if (isLoading || !data) {
    return <div role="status" aria-label="Loading" aria-live="polite" className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
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

  const handleDriverAction = async (driverId, action) => {
    const driver = data?.pendingDrivers?.find((d) => d.id === driverId);
    setProcessingId(driverId);
    const prevPendingDrivers = data?.pendingDrivers || [];
    toast({ title: 'Processing...', description: `${action === 'approve_driver' ? 'Approving' : 'Rejecting'} ${driver?.full_name || 'driver'}` });
    if (data?.pendingDrivers) {
      queryClient.setQueryData(overviewQueryKey, (prev) => ({
        ...prev,
        pendingDrivers: prev.pendingDrivers.filter((d) => d.id !== driverId),
      }));
    }
    try {
      await base44.functions.invoke('admin-dashboard', { action, driver_id: driverId });
      toast({ title: `${driver?.full_name || 'Driver'} has been ${action === 'approve_driver' ? 'approved' : 'rejected'}` });
      queryClient.setQueryData(overviewQueryKey, (prev) => prev ? ({
        ...prev,
        stats: { ...prev.stats, pendingDrivers: Math.max(0, (prev.stats?.pendingDrivers || 0) - 1) },
      }) : prev);

      if (action === 'approve_driver') {
        try {
          const referralRes = await base44.functions.invoke('award-driver-referral-bonus', { driver_profile_id: driverId });
          if (referralRes.data?.awarded) {
            toast({ title: '🎉 Referral bonus awarded', description: `500 bonus points given to ${driver?.full_name || 'the driver'} and their referrer.` });
          }
        } catch (refErr) {
          console.error('Driver referral bonus failed:', refErr);
        }
      }
    } catch (err) {
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

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-emerald-500 rounded-xl p-2.5 flex items-center justify-center">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back, {user?.full_name || 'Admin'} — here's your platform overview.</p>
          </div>
        </div>

        <AdminTabs
          data={data}
          isFetching={isFetching}
          processingId={processingId}
          onDriverAction={handleDriverAction}
          onUpdateLeadStatus={handleUpdateLeadStatus}
          onRefresh={load}
          scrollRef={scrollRef}
        />
      </div>
    </PullToRefresh>
  );
}