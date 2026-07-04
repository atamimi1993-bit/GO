import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, ShieldAlert, Clock, FileSearch, UserCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SectionSkeleton from '@/components/admin/SectionSkeleton';

export default function BackgroundCheckPanel({ drivers }) {
  const [processing, setProcessing] = useState(null);
  const [localDrivers, setLocalDrivers] = useState(drivers || []);
  const [filter, setFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => { setLocalDrivers(drivers || []); }, [drivers]);

  const initiate = async (driverId) => {
    setProcessing(driverId);
    try {
      const res = await base44.functions.invoke('initiate-background-check', { driver_id: driverId });
      setLocalDrivers(prev => prev.map(d => d.id === driverId ? { ...d, background_check_status: 'pending', background_check_date: new Date().toISOString() } : d));
      toast({ title: 'Background check initiated', description: res.data.message || 'Driver has been notified.' });
    } catch (err) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
    setProcessing(null);
  };

  const setManualStatus = async (driverId, status) => {
    setProcessing(driverId);
    try {
      await base44.functions.invoke('initiate-background-check', { driver_id: driverId, manual_status: status });
      setLocalDrivers(prev => prev.map(d => d.id === driverId ? { ...d, background_check_status: status, background_check_date: new Date().toISOString() } : d));
      toast({ title: 'Status updated', description: `Marked as ${status}` });
    } catch (err) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
    setProcessing(null);
  };

  const statusConfig = {
    not_started: { icon: FileSearch, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Not Started' },
    pending: { icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', label: 'In Progress' },
    clear: { icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', label: 'Cleared' },
    consider: { icon: ShieldAlert, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', label: 'Under Review' },
    failed: { icon: ShieldAlert, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', label: 'Failed' },
  };

  const filtered = localDrivers.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'needs_action') return ['not_started', 'pending', 'consider'].includes(d.background_check_status || 'not_started');
    return (d.background_check_status || 'not_started') === filter;
  });

  const counts = {
    not_started: localDrivers.filter(d => (d.background_check_status || 'not_started') === 'not_started').length,
    pending: localDrivers.filter(d => d.background_check_status === 'pending').length,
    clear: localDrivers.filter(d => d.background_check_status === 'clear').length,
    consider: localDrivers.filter(d => d.background_check_status === 'consider').length,
    failed: localDrivers.filter(d => d.background_check_status === 'failed').length,
  };

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={20} className="text-blue-600" />
        <h2 className="font-display font-bold text-lg">Background Checks</h2>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All' },
          { key: 'needs_action', label: 'Needs Action' },
          { key: 'not_started', label: `Not Started (${counts.not_started})` },
          { key: 'pending', label: `Pending (${counts.pending})` },
          { key: 'clear', label: `Cleared (${counts.clear})` },
          { key: 'consider', label: `Review (${counts.consider})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No drivers in this category.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const s = d.background_check_status || 'not_started';
            const cfg = statusConfig[s];
            const Icon = cfg.icon;
            return (
              <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{d.full_name}</p>
                    <Badge className={`${cfg.bg} ${cfg.color} border-transparent`}>
                      <Icon size={10} className="mr-1" />{cfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{d.email}</p>
                  {d.background_check_date && (
                    <p className="text-xs text-muted-foreground">Checked: {new Date(d.background_check_date).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {s === 'not_started' && (
                    <Button size="sm" onClick={() => initiate(d.id)} disabled={processing === d.id} className="min-h-[36px]">
                      {processing === d.id ? <Loader2 size={14} className="animate-spin" /> : <FileSearch size={14} />}
                      Initiate
                    </Button>
                  )}
                  {s !== 'clear' && s !== 'not_started' && (
                    <Button size="sm" onClick={() => setManualStatus(d.id, 'clear')} disabled={processing === d.id} className="bg-emerald-500 hover:bg-emerald-600 min-h-[36px]">
                      {processing === d.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      Mark Clear
                    </Button>
                  )}
                  {s !== 'failed' && s !== 'not_started' && (
                    <Button size="sm" variant="outline" onClick={() => setManualStatus(d.id, 'failed')} disabled={processing === d.id} className="min-h-[36px]">
                      <ShieldAlert size={14} />
                      Fail
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}