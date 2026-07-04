import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ShieldCheck, ShieldAlert, Shield, Clock, FileSearch } from 'lucide-react';

export default function BackgroundCheckStatus({ driverProfile, onUpdated }) {
  const [initiating, setInitiating] = useState(false);
  const { toast } = useToast();

  const status = driverProfile.background_check_status || 'not_started';
  const checkDate = driverProfile.background_check_date;

  const config = {
    not_started: { icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Not Started', desc: 'No background check has been initiated yet.' },
    pending: { icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', label: 'In Progress', desc: 'Your background check is being processed. You\'ll be notified when results are ready.' },
    clear: { icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', label: 'Cleared', desc: 'Your background check is complete and you\'re cleared to drive.' },
    consider: { icon: ShieldAlert, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', label: 'Under Review', desc: 'Some items require further review. Our team will reach out if needed.' },
    failed: { icon: ShieldAlert, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', label: 'Failed', desc: 'Your background check did not pass. Please contact support.' },
  };
  const c = config[status] || config.not_started;
  const Icon = c.icon;

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={c.color} size={18} />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm">Background Check</h3>
          <p className="text-xs text-muted-foreground">Trust & Safety Verification</p>
        </div>
        <Badge className={`ml-auto ${c.bg} ${c.color} border-transparent`}>{c.label}</Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{c.desc}</p>

      {checkDate && (
        <p className="text-xs text-muted-foreground mb-3">
          Last updated: {new Date(checkDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      )}

      {driverProfile.background_check_report_url && (
        <a href={driverProfile.background_check_report_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
          View Report
        </a>
      )}

      {status === 'not_started' && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300">
          A background check is required before you can accept certain jobs. Contact your admin to initiate one.
        </div>
      )}
    </div>
  );
}