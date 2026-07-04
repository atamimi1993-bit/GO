import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2, ShieldCheck, ShieldAlert, Shield, Clock, FileSearch,
  Eye, Scan,
} from 'lucide-react';

export default function BackgroundCheckStatus({ driverProfile, onUpdated }) {
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();

  const status = driverProfile.background_check_status || 'not_started';
  const checkDate = driverProfile.background_check_date;
  const report = driverProfile.background_check_report;

  const config = {
    not_started: { icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Not Started', desc: 'No background screening has been run yet. An admin can initiate one from the Admin dashboard.' },
    pending: { icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', label: 'In Progress', desc: 'Your background screening is being processed. You\'ll be notified when results are ready.' },
    clear: { icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', label: 'Cleared', desc: 'Your background screening is complete and you\'re cleared to drive.' },
    consider: { icon: ShieldAlert, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', label: 'Under Review', desc: 'Some items require further review. Our team will reach out if needed.' },
    failed: { icon: ShieldAlert, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', label: 'Failed', desc: 'Your background screening did not pass. Please contact support.' },
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
          <h3 className="font-display font-bold text-sm">Background Screening</h3>
          <p className="text-xs text-muted-foreground">AI-Powered Public Records Check</p>
        </div>
        <Badge className={`ml-auto ${c.bg} ${c.color} border-transparent`}>{c.label}</Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{c.desc}</p>

      {checkDate && (
        <p className="text-xs text-muted-foreground mb-3">
          Last updated: {new Date(checkDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      )}

      {report && (
        <>
          <button
            onClick={() => setShowReport(!showReport)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline mb-2"
          >
            <Eye size={12} />
            {showReport ? 'Hide' : 'View'} Screening Report
          </button>
          {showReport && (
            <pre className="bg-muted rounded-xl p-3 text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto mb-3">
              {report}
            </pre>
          )}
        </>
      )}

      {status === 'not_started' && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <Scan size={14} className="shrink-0 mt-0.5" />
          <span>A background screening is required before you can accept certain jobs. This will be initiated by an admin once your profile is reviewed.</span>
        </div>
      )}
    </div>
  );
}