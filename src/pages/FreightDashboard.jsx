import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PullToRefresh from '@/components/go/PullToRefresh';
import PageHeader from '@/components/go/PageHeader';
import FreightJobCard from '@/components/admin/FreightJobCard';
import StatCard from '@/components/admin/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Container, Truck, UserCheck, Loader2, ShieldCheck, Package,
  Star, Phone,
} from 'lucide-react';
import { formatCurrency } from '@/lib/pricing';

const ACTIVE_STATUSES = ['accepted', 'in_progress'];

export default function FreightDashboard() {
  const navigate = useNavigate();
  const { scrollRef } = useOutletContext();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [cdlAccess, setCdlAccess] = useState(null);

  const load = useCallback(async () => {
    try {
      const [freightJobs, corporateJobs, cdlDrivers] = await Promise.all([
        base44.entities.MoveRequest.filter({ job_type: 'freight' }, '-created_date', 100),
        base44.entities.MoveRequest.filter({ job_type: 'corporate_logistics' }, '-created_date', 100),
        base44.entities.DriverProfile.filter({ cdl_certified: true }, '-created_date', 100),
      ]);
      const allJobs = [...freightJobs, ...corporateJobs].sort(
        (a, b) => new Date(b.created_date) - new Date(a.created_date)
      );
      setJobs(allJobs);
      setDrivers(cdlDrivers);
    } catch (err) {
      console.error('Freight dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAccess = async () => {
      if (user?.role === 'admin') { load(); return; }
      try {
        const profiles = user?.email ? await base44.entities.DriverProfile.filter({ email: user.email }) : [];
        if (profiles.length > 0 && profiles[0].cdl_certified) {
          load();
        } else {
          setCdlAccess(false);
          setLoading(false);
        }
      } catch {
        setCdlAccess(false);
        setLoading(false);
      }
    };
    checkAccess();
  }, [user, load]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  }

  if (user?.role !== 'admin' && cdlAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldCheck className="text-muted-foreground mb-3" size={48} />
        <h2 className="font-display font-bold text-lg mb-1">Access Denied</h2>
        <p className="text-muted-foreground text-sm">This dashboard is restricted to administrators and CDL-certified drivers.</p>
      </div>
    );
  }

  const driverMap = new Map(drivers.map(d => [d.id, d]));
  const activeJobs = jobs.filter(j => ACTIVE_STATUSES.includes(j.status));
  const assignedJobs = activeJobs.filter(j => j.assigned_driver_id);
  const unassignedJobs = activeJobs.filter(j => !j.assigned_driver_id);
  const totalRevenue = activeJobs.reduce((sum, j) => sum + (j.total_price || 0), 0);
  const availableCDLDrivers = drivers.filter(d => d.status === 'approved' && d.available);

  const filteredJobs = filter === 'assigned' ? assignedJobs
    : filter === 'unassigned' ? unassignedJobs
    : filter === 'completed' ? jobs.filter(j => j.status === 'completed')
    : activeJobs;

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="pb-4">
        <PageHeader title="Freight & Logistics" isRoot={false} />

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-500 rounded-xl p-2.5 flex items-center justify-center">
            <Container className="text-white" size={24} />
          </div>
          <p className="text-muted-foreground text-sm">Monitor active freight and corporate logistics jobs with CDL driver assignments.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Package} label="Active Jobs" value={activeJobs.length} sublabel={`${assignedJobs.length} assigned`} accent="blue" />
          <StatCard icon={Truck} label="Unassigned" value={unassignedJobs.length} sublabel="Awaiting driver" accent={unassignedJobs.length > 0 ? 'amber' : 'emerald'} />
          <StatCard icon={UserCheck} label="CDL Drivers" value={drivers.length} sublabel={`${availableCDLDrivers.length} available`} accent="emerald" />
          <StatCard icon={Container} label="Active Revenue" value={formatCurrency(totalRevenue)} accent="blue" />
        </div>

        {/* Job filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { key: 'all', label: `All Active (${activeJobs.length})` },
            { key: 'assigned', label: `Assigned (${assignedJobs.length})` },
            { key: 'unassigned', label: `Unassigned (${unassignedJobs.length})` },
            { key: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              aria-label={`Filter jobs: ${tab.label}`}
              aria-pressed={filter === tab.key}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                filter === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Jobs */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-2xl mb-6">
            <Container className="mx-auto text-muted-foreground mb-3" size={48} />
            <p className="text-muted-foreground">No {filter !== 'all' ? filter : 'active'} freight jobs right now.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {filteredJobs.map(job => (
              <FreightJobCard key={job.id} job={job} driver={job.assigned_driver_id ? driverMap.get(job.assigned_driver_id) : null} />
            ))}
          </div>
        )}

        {/* CDL Driver Roster */}
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck size={20} className="text-emerald-500" />
            <h2 className="font-display font-bold text-lg">CDL-Certified Drivers</h2>
            <Badge variant="secondary">{drivers.length}</Badge>
          </div>
          {drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No CDL-certified drivers registered yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {drivers.map(d => {
                const activeJobs = jobs.filter(j => j.assigned_driver_id === d.id && ACTIVE_STATUSES.includes(j.status));
                return (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <div className="bg-emerald-500/10 rounded-full w-10 h-10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {d.full_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{d.full_name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                          CDL {d.cdl_class}
                        </Badge>
                        {d.status === 'approved' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
                            {d.available ? 'Available' : 'Busy'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{d.status?.replace('_', ' ')}</Badge>
                        )}
                        {d.rating > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Star size={10} className="fill-amber-400 text-amber-400" /> {d.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeJobs.length} active job{activeJobs.length !== 1 ? 's' : ''}
                        {d.company_name && ` · ${d.company_name}`}
                      </p>
                    </div>
                    {d.phone && (
                      <a href={`tel:${d.phone}`} className="text-muted-foreground hover:text-emerald-600 shrink-0" aria-label={`Call ${d.full_name}`}>
                        <Phone size={16} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}