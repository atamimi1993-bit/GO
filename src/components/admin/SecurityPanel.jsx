import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO } from 'date-fns';
import {
  Shield, ShieldAlert, ShieldX, Loader2, Ban, CheckCircle2,
  Globe, Mail, AlertTriangle, Activity,
} from 'lucide-react';

const SEVERITY_STYLES = {
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

const EVENT_ICONS = {
  rate_limit_exceeded: ShieldAlert,
  failed_login: ShieldX,
  suspicious_input: AlertTriangle,
  unauthorized_access: Ban,
  blocked_request: ShieldX,
};

const EVENT_LABELS = {
  rate_limit_exceeded: 'Rate Limit Exceeded',
  failed_login: 'Failed Login',
  suspicious_input: 'Suspicious Input',
  unauthorized_access: 'Unauthorized Access',
  blocked_request: 'Blocked Request',
};

export default function SecurityPanel() {
  const { toast } = useToast();
  const constQueryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['security-events'],
    queryFn: () => base44.entities.SecurityEvent.filter({}, '-created_date', 100),
    staleTime: 30 * 1000,
  });

  const filteredEvents = filter === 'all'
    ? events
    : events.filter((e) => e.event_type === filter);

  const stats = {
    total: events.length,
    critical: events.filter((e) => e.severity === 'critical').length,
    high: events.filter((e) => e.severity === 'high').length,
    unresolved: events.filter((e) => !e.resolved).length,
  };

  // Group by IP to find repeat offenders
  const ipCounts = {};
  for (const e of events) {
    if (e.ip_address && e.ip_address !== 'unknown') {
      ipCounts[e.ip_address] = (ipCounts[e.ip_address] || 0) + 1;
    }
  }
  const topIps = Object.entries(ipCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const handleResolve = async (eventId) => {
    try {
      await base44.entities.SecurityEvent.update(eventId, { resolved: true });
      constQueryClient.invalidateQueries({ queryKey: ['security-events'] });
      toast({ title: 'Event resolved' });
    } catch (err) {
      toast({ title: 'Failed to resolve', description: err.message, variant: 'destructive' });
    }
  };

  const handleResolveAll = async () => {
    try {
      await base44.entities.SecurityEvent.updateMany(
        { resolved: false },
        { $set: { resolved: true } }
      );
      constQueryClient.invalidateQueries({ queryKey: ['security-events'] });
      toast({ title: 'All events resolved' });
    } catch (err) {
      toast({ title: 'Failed to resolve all', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border rounded-2xl p-4 text-center">
          <Activity className="mx-auto text-muted-foreground mb-1" size={20} />
          <p className="text-2xl font-display font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Events</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 text-center">
          <ShieldX className="mx-auto text-red-500 mb-1" size={20} />
          <p className="text-2xl font-display font-bold text-red-500">{stats.critical}</p>
          <p className="text-xs text-muted-foreground">Critical</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 text-center">
          <ShieldAlert className="mx-auto text-orange-500 mb-1" size={20} />
          <p className="text-2xl font-display font-bold text-orange-500">{stats.high}</p>
          <p className="text-xs text-muted-foreground">High Severity</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 text-center">
          <AlertTriangle className="mx-auto text-amber-500 mb-1" size={20} />
          <p className="text-2xl font-display font-bold text-amber-500">{stats.unresolved}</p>
          <p className="text-xs text-muted-foreground">Unresolved</p>
        </div>
      </div>

      {/* Top IPs */}
      {topIps.length > 0 && (
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-muted-foreground" />
            <h2 className="font-display font-bold text-lg">Repeat Offender IPs</h2>
          </div>
          <div className="space-y-2">
            {topIps.map(([ip, count]) => (
              <div key={ip} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-mono">{ip}</span>
                <Badge variant={count > 10 ? 'destructive' : 'secondary'}>{count} events</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter + resolve all */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 overflow-x-auto no-scrollbar flex-1">
          {['all', 'rate_limit_exceeded', 'failed_login', 'suspicious_input', 'unauthorized_access', 'blocked_request'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-card border text-muted-foreground hover:bg-accent'
              }`}
            >
              {f === 'all' ? 'All Events' : EVENT_LABELS[f] || f}
            </button>
          ))}
        </div>
        {stats.unresolved > 0 && (
          <Button variant="outline" size="sm" onClick={handleResolveAll} className="min-h-[40px]">
            <CheckCircle2 size={14} className="mr-1" /> Resolve All
          </Button>
        )}
      </div>

      {/* Event list */}
      <div className="bg-card border rounded-2xl p-5">
        <h2 className="font-display font-bold text-lg mb-4">Security Event Log</h2>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="mx-auto text-muted-foreground mb-2" size={32} />
            <p className="text-sm text-muted-foreground">No security events recorded. Your app is protected.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((e) => {
              const Icon = EVENT_ICONS[e.event_type] || Shield;
              return (
                <div key={e.id} className={`flex items-start gap-3 p-3 rounded-lg border ${e.resolved ? 'opacity-50' : ''}`}>
                  <Icon size={16} className="mt-0.5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{EVENT_LABELS[e.event_type] || e.event_type}</span>
                      <Badge className={SEVERITY_STYLES[e.severity]}>{e.severity}</Badge>
                      {e.resolved && <Badge variant="secondary">Resolved</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{e.details || 'No details'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono">{e.ip_address || '—'}</span>
                      {e.form_name && <span>· {e.form_name}</span>}
                      <span>· {format(parseISO(e.created_date), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  {!e.resolved && (
                    <Button size="sm" variant="ghost" onClick={() => handleResolve(e.id)} className="shrink-0 min-h-[36px]">
                      Resolve
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}