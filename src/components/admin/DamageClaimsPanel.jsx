import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Loader2, ChevronDown, ChevronRight, Search, ShieldAlert, Package, CheckCircle2, Clock, Gavel } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  submitted: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
    dot: 'bg-yellow-500',
    step: 0,
  },
  under_review: {
    label: 'Under Investigation',
    icon: Search,
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
    step: 1,
  },
  resolved: {
    label: 'Settled',
    icon: CheckCircle2,
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    step: 2,
  },
  rejected: {
    label: 'Rejected',
    icon: Gavel,
    color: 'bg-red-500/10 text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
    step: -1,
  },
};

const STATUSES = ['submitted', 'under_review', 'resolved', 'rejected'];

function StatusTracker({ currentStatus }) {
  const steps = ['submitted', 'under_review', 'resolved'];
  const currentStep = STATUS_CONFIG[currentStatus]?.step ?? 0;
  const isRejected = currentStatus === 'rejected';

  return (
    <div className="flex items-center gap-1 mt-2">
      {isRejected ? (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <Gavel size={12} />
          <span className="font-medium">Claim rejected</span>
        </div>
      ) : (
        steps.map((s, i) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          const isActive = i <= currentStep;
          const isCurrent = i === currentStep;
          return (
            <React.Fragment key={s}>
              <div className="flex items-center gap-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                    isActive ? `${cfg.color} ring-1 ring-current` : 'bg-muted text-muted-foreground'
                  } ${isCurrent ? 'animate-pulse' : ''}`}
                >
                  <Icon size={12} />
                </div>
                <span className={`text-[10px] font-medium hidden sm:inline ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {cfg.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-4 sm:w-8 ${i < currentStep ? cfg.dot : 'bg-muted'}`} />
              )}
            </React.Fragment>
          );
        })
      )}
    </div>
  );
}

function DamageClaimCard({ report, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(report.status);
  const [resolutionNotes, setResolutionNotes] = useState(report.resolution_notes || '');
  const { toast } = useToast();

  const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.submitted;
  const StatusIcon = cfg.icon;
  const fmtMoney = (n) => `$${(n || 0).toFixed(2)}`;

  const handleSave = async () => {
    setUpdating(true);
    try {
      await base44.entities.DamageReport.update(report.id, {
        status: newStatus,
        resolution_notes: resolutionNotes.trim(),
      });
      toast({ title: 'Claim updated', description: `Status set to ${STATUS_CONFIG[newStatus]?.label || newStatus}` });
      onUpdate();
    } catch (err) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={`rounded-xl border ${report.status === 'rejected' ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-card'} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
          <StatusIcon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{report.item_name}</p>
            <Badge className={cfg.color}>{cfg.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {report.report_type === 'lost' ? 'Lost item' : 'Damaged'} · {report.customer_name || 'Unknown customer'}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {report.driver_name && <span>Driver: {report.driver_name}</span>}
            <span>Value: {fmtMoney(report.claimed_value)}</span>
          </div>
          <StatusTracker currentStatus={report.status} />
        </div>
        {expanded ? <ChevronDown size={16} className="text-muted-foreground shrink-0 mt-1" /> : <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
            <p className="text-sm whitespace-pre-wrap">{report.description || 'No description provided.'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-muted-foreground">Move ID</p>
              <p className="font-mono truncate">{report.move_request_id?.slice(-12) || 'N/A'}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Submitted</p>
              <p>{report.created_date ? format(new Date(report.created_date), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Customer Email</p>
              <p className="truncate">{report.customer_email || 'N/A'}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Claimed Value</p>
              <p>{fmtMoney(report.claimed_value)}</p>
            </div>
          </div>

          {report.evidence_photo_url && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Evidence Photo</p>
              <img
                src={report.evidence_photo_url}
                alt="Damage evidence"
                className="max-h-40 rounded-lg border"
              />
            </div>
          )}

          {report.driver_responded && report.driver_statement && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Driver Response</p>
              <p className="text-sm whitespace-pre-wrap">{report.driver_statement}</p>
              {report.driver_evidence_photo_url && (
                <img
                  src={report.driver_evidence_photo_url}
                  alt="Driver evidence"
                  className="max-h-32 rounded-lg border mt-2"
                />
              )}
            </div>
          )}

          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Update Claim Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const sc = STATUS_CONFIG[s];
                const SIcon = sc.icon;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewStatus(s)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      newStatus === s
                        ? `${sc.color} ring-1 ring-current`
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <SIcon size={12} /> {sc.label}
                  </button>
                );
              })}
            </div>
            <Textarea
              placeholder="Add resolution notes (e.g. 'Driver found at fault, $150 refund issued to customer')..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={updating || (newStatus === report.status && resolutionNotes === (report.resolution_notes || ''))}>
                {updating ? <Loader2 size={14} className="animate-spin mr-1" /> : <CheckCircle2 size={14} className="mr-1" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DamageClaimsPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');

  const { data: reports = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['damage-claims'],
    queryFn: async () => {
      const res = await base44.entities.DamageReport.list('-created_date', 100);
      return res;
    },
    staleTime: 30 * 1000,
  });

  const counts = useMemo(() => {
    const c = { all: reports.length, submitted: 0, under_review: 0, resolved: 0, rejected: 0 };
    reports.forEach((r) => {
      if (c[r.status] !== undefined) c[r.status]++;
    });
    return c;
  }, [reports]);

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.status === filter);

  const totalClaimedValue = useMemo(() =>
    reports.reduce((sum, r) => sum + (r.claimed_value || 0), 0), [reports]);

  const pendingDriverResponse = useMemo(() =>
    reports.filter((r) => r.status !== 'resolved' && r.status !== 'rejected' && !r.driver_responded).length, [reports]);

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={20} className="text-red-500" />
        <h2 className="font-display font-bold text-lg">Damage Claims Management</h2>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="ml-auto">
          {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} className="mr-1" />}
          Refresh
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <p className="text-xl font-display font-bold">{counts.all}</p>
          <p className="text-xs text-muted-foreground">Total Claims</p>
        </div>
        <div className="rounded-xl bg-yellow-500/5 p-3 text-center">
          <p className="text-xl font-display font-bold text-yellow-700 dark:text-yellow-300">{counts.submitted}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-xl bg-blue-500/5 p-3 text-center">
          <p className="text-xl font-display font-bold text-blue-700 dark:text-blue-300">{counts.under_review}</p>
          <p className="text-xs text-muted-foreground">Under Investigation</p>
        </div>
        <div className="rounded-xl bg-emerald-500/5 p-3 text-center">
          <p className="text-xl font-display font-bold text-emerald-700 dark:text-emerald-300">{counts.resolved}</p>
          <p className="text-xs text-muted-foreground">Settled</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 -mx-1 px-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${
            filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          All ({counts.all})
        </button>
        {STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${
                filter === s ? `${cfg.color} ring-1 ring-current` : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {cfg.label} ({counts[s]})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No damage claims {filter !== 'all' ? `with status "${STATUS_CONFIG[filter]?.label}"` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((report) => (
            <DamageClaimCard
              key={report.id}
              report={report}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['damage-claims'] });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}