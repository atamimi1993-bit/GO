import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Truck, DollarSign, Star, Briefcase, Loader2, Phone, Mail, Shield, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/pricing';
import PullToRefresh from '@/components/go/PullToRefresh';
import PageHeader from '@/components/go/PageHeader';

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  quoted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  accepted: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  completed: 'bg-muted text-foreground',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

const PAYOUT_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  paid: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  deducted: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

const fmt = (n) => formatCurrency(n || 0);

export default function DriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { scrollRef } = useOutletContext();
  const [driver, setDriver] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('completed');

  const load = useCallback(async () => {
    try {
      const [d, allJobs, p] = await Promise.all([
        base44.entities.DriverProfile.get(id),
        base44.entities.MoveRequest.filter({ assigned_driver_id: id }, '-created_date', 100),
        base44.entities.DriverPayout.filter({ driver_profile_id: id }, '-created_date', 100),
      ]);
      setDriver(d);
      setJobs(allJobs);
      setPayouts(p);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  if (!driver) return <div className="text-center py-20"><p className="text-muted-foreground">Driver not found.</p></div>;

  const completedJobs = jobs.filter(j => j.status === 'completed');
  const activeJobs = jobs.filter(j => ['accepted', 'in_progress'].includes(j.status));
  const totalPaid = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount - (p.deduction_amount || 0)), 0);
  const pendingPayouts = payouts.filter(p => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + p.amount, 0);

  const visibleJobs = tab === 'completed' ? completedJobs : tab === 'active' ? activeJobs : jobs;

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <PageHeader title="Driver Details" isRoot={false} />
          <Badge className={
            driver.status === 'approved'
              ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
              : driver.status === 'pending_review'
                ? 'bg-amber-500/10 text-yellow-700 dark:text-yellow-300'
                : 'bg-red-500/10 text-red-700 dark:text-red-300'
          }>
            {driver.status?.replace('_', ' ')}
          </Badge>
        </div>

        {/* Driver profile header */}
        <div className="bg-card border rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {driver.full_name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-lg truncate">{driver.full_name}</h2>
              {driver.company_name && <p className="text-sm text-muted-foreground truncate">{driver.company_name}</p>}
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium">{(driver.rating || 5.0).toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Mail size={14} className="text-muted-foreground shrink-0" />
              <span className="truncate">{driver.email}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Phone size={14} className="text-muted-foreground shrink-0" />
              <span className="truncate">{driver.phone}</span>
            </div>
            {driver.service_area && (
              <div className="flex items-center gap-2 min-w-0">
                <Truck size={14} className="text-muted-foreground shrink-0" />
                <span className="truncate">{driver.service_area}</span>
              </div>
            )}
            {driver.cdl_certified && (
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-muted-foreground shrink-0" />
                <span>CDL {driver.cdl_class}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-card border rounded-2xl p-3 text-center">
            <Briefcase className="mx-auto text-muted-foreground mb-1" size={18} />
            <p className="text-lg font-display font-bold">{driver.total_jobs || 0}</p>
            <p className="text-[10px] text-muted-foreground">Total Jobs</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 text-center">
            <CheckCircle2 className="mx-auto text-muted-foreground mb-1" size={18} />
            <p className="text-lg font-display font-bold">{completedJobs.length}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 text-center">
            <DollarSign className="mx-auto text-muted-foreground mb-1" size={18} />
            <p className="text-lg font-display font-bold">{fmt(driver.total_earnings || 0)}</p>
            <p className="text-[10px] text-muted-foreground">Earnings</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 text-center">
            <Clock className="mx-auto text-muted-foreground mb-1" size={18} />
            <p className="text-lg font-display font-bold">{fmt(pendingPayouts)}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'completed', label: `Completed (${completedJobs.length})` },
            { key: 'active', label: `Active (${activeJobs.length})` },
            { key: 'all', label: `All Jobs (${jobs.length})` },
            { key: 'payouts', label: `Payouts (${payouts.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t.key ? 'bg-emerald-500 text-white' : 'bg-card border text-muted-foreground hover:border-emerald-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'payouts' ? (
          <div className="space-y-2">
            {payouts.length === 0 ? (
              <div className="text-center py-12 bg-card border rounded-2xl">
                <DollarSign className="mx-auto text-muted-foreground mb-2" size={32} />
                <p className="text-sm text-muted-foreground">No payouts yet.</p>
              </div>
            ) : payouts.map(p => {
              const job = jobs.find(j => j.id === p.move_request_id);
              return (
                <div key={p.id} className="bg-card border rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{fmt(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(p.created_date), 'MMM d, yyyy')}</p>
                    {job && <p className="text-xs text-muted-foreground truncate">{job.pickup_address} → {job.dropoff_address}</p>}
                    {p.deduction_amount > 0 && <p className="text-xs text-red-500">−{fmt(p.deduction_amount)}: {p.deduction_reason}</p>}
                  </div>
                  <Badge className={PAYOUT_COLORS[p.status]}>{p.status}</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleJobs.length === 0 ? (
              <div className="text-center py-12 bg-card border rounded-2xl">
                <Truck className="mx-auto text-muted-foreground mb-2" size={32} />
                <p className="text-sm text-muted-foreground">No {tab === 'completed' ? 'completed' : tab === 'active' ? 'active' : ''} jobs yet.</p>
              </div>
            ) : visibleJobs.map(job => (
              <div key={job.id} className="bg-card border rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium truncate flex-1">{job.pickup_address} → {job.dropoff_address}</p>
                  <Badge className={STATUS_COLORS[job.status]}>{job.status?.replace('_', ' ')}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{job.customer_name || 'Unknown'} · {format(parseISO(job.move_date), 'MMM d, yyyy')}</span>
                  <span className="font-semibold text-foreground">{fmt(job.total_price)}</span>
                </div>
                {job.driver_payout > 0 && (
                  <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t">
                    <span className="text-muted-foreground">Driver payout</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmt(job.driver_payout)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}