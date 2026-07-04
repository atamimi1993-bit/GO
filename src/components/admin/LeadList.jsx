import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Building2, MapPin, Clock, ExternalLink, Star } from 'lucide-react';
import LeadVehicleMatcher from '@/components/admin/LeadVehicleMatcher';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  contacted: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  qualified: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  converted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  dismissed: 'bg-muted text-muted-foreground',
};

const PRIORITY_COLORS = {
  high: 'bg-red-500/10 text-red-600 dark:text-red-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  low: 'bg-muted text-muted-foreground',
};

const NEXT_STATUS = {
  new: 'contacted',
  contacted: 'qualified',
  qualified: 'converted',
};

export default function LeadList({ leads, onUpdateStatus }) {
  if (!leads || leads.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <h2 className="font-display font-bold text-lg mb-2">Leads</h2>
        <p className="text-sm text-muted-foreground text-center py-6">No leads yet. Use the AI Lead Finder above to generate leads.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg">Leads ({leads.length})</h2>
      </div>
      <div className="space-y-2">
        {leads.map((lead) => (
          <div key={lead.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3 rounded-xl bg-muted/30 border">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {lead.lead_type === 'business' ? (
                  <Building2 size={14} className="text-muted-foreground shrink-0" />
                ) : (
                  <User size={14} className="text-muted-foreground shrink-0" />
                )}
                <p className="font-medium truncate">{lead.lead_name}</p>
                <Badge className={PRIORITY_COLORS[lead.priority]}>
                  <Star size={10} className="mr-0.5" />{lead.priority}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1 flex-wrap">
                <MapPin size={12} className="shrink-0" /> {lead.location}
                {lead.move_timeline && lead.move_timeline !== 'Unknown' && (
                  <><span className="mx-1">·</span><Clock size={12} className="shrink-0" /> {lead.move_timeline}</>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{lead.moving_reason}</p>
              {lead.contact_info && lead.contact_info !== 'Not publicly available' && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{lead.contact_info}</p>
              )}
              {lead.source && lead.source.startsWith('http') && (
                <a
                  href={lead.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline inline-flex items-center gap-0.5 mt-1"
                >
                  <ExternalLink size={10} /> Source
                </a>
              )}
              {lead.status === 'converted' && (
                <LeadVehicleMatcher lead={lead} onAssigned={() => onUpdateStatus(lead.id, 'converted')} />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Badge className={STATUS_COLORS[lead.status]}>{lead.status}</Badge>
              {NEXT_STATUS[lead.status] && (
                <Button
                  size="sm"
                  className="min-h-[44px]"
                  variant="outline"
                  onClick={() => onUpdateStatus(lead.id, NEXT_STATUS[lead.status])}
                >
                  &rarr; {NEXT_STATUS[lead.status]}
                </Button>
              )}
              {lead.status !== 'dismissed' && lead.status !== 'converted' && (
                <Button
                  size="sm"
                  className="min-h-[44px]"
                  variant="ghost"
                  onClick={() => onUpdateStatus(lead.id, 'dismissed')}
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}