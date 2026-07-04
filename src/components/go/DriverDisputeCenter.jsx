import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ShieldAlert, Upload, Loader2, X, CheckCircle2, Camera, MessageSquare, Package, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_STYLES = {
  submitted: 'bg-red-500/10 text-red-600 dark:text-red-400',
  under_review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rejected: 'bg-muted text-muted-foreground',
};

export default function DriverDisputeCenter({ driverProfile }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!driverProfile?.id) { setLoading(false); return; }
    try {
      const data = await base44.entities.DamageReport.filter(
        { driver_profile_id: driverProfile.id },
        '-created_date',
        50
      );
      setReports(data);
    } catch {
      setReports([]);
    }
    setLoading(false);
  }, [driverProfile?.id]);

  useEffect(() => { load(); }, [load]);

  const pendingCount = reports.filter(r => !r.driver_responded && r.status !== 'rejected').length;

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={18} className="text-amber-500" />
          <h3 className="font-display font-bold text-sm">Dispute Center</h3>
        </div>
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
      </div>
    );
  }

  if (reports.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-amber-500" />
          <h3 className="font-display font-bold text-sm">Dispute Center</h3>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">{pendingCount} pending</Badge>
        )}
      </div>

      <div className="space-y-3">
        {reports.map(report => (
          <DisputeCard
            key={report.id}
            report={report}
            expanded={expandedId === report.id}
            onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
            onResponded={load}
          />
        ))}
      </div>
    </div>
  );
}

function DisputeCard({ report, expanded, onToggle, onResponded }) {
  const { toast } = useToast();
  const [statement, setStatement] = useState(report.driver_statement || '');
  const [evidenceUrl, setEvidenceUrl] = useState(report.driver_evidence_photo_url || '');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setEvidenceUrl(res.file_url);
      toast({ title: 'Photo uploaded' });
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload photo. Please try again.', variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!statement.trim()) {
      toast({ title: 'Statement required', description: 'Please describe your side of the story.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.DamageReport.update(report.id, {
        driver_statement: statement.trim(),
        driver_evidence_photo_url: evidenceUrl,
        driver_responded: true,
        driver_response_date: new Date().toISOString(),
        status: report.status === 'submitted' ? 'under_review' : report.status,
      });
      toast({ title: 'Response submitted', description: 'Your evidence has been recorded for review.' });
      onResponded();
    } catch (err) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const responded = report.driver_responded;

  return (
    <div className={`border rounded-xl overflow-hidden ${responded ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
      <button
        onClick={onToggle}
        aria-label={expanded ? 'Collapse dispute details' : 'Expand dispute details'}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${responded ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
          {report.report_type === 'lost' ? <Package size={16} /> : <AlertTriangle size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{report.item_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {report.customer_name} · {report.report_type}
          </p>
        </div>
        <Badge className={STATUS_STYLES[report.status] || 'bg-muted'}>
          {responded ? 'Responded' : report.status?.replace('_', ' ')}
        </Badge>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Customer's claim */}
          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
              <AlertTriangle size={12} /> Customer's Claim
            </p>
            <p className="text-sm">{report.description}</p>
            {report.evidence_photo_url && (
              <img src={report.evidence_photo_url} alt="Customer evidence" className="mt-2 w-full max-h-40 object-contain rounded-lg border" />
            )}
            {report.claimed_value > 0 && (
              <p className="text-xs text-muted-foreground mt-2">Claimed value: <span className="font-medium text-foreground">${report.claimed_value.toFixed(2)}</span></p>
            )}
          </div>

          {/* Driver's response */}
          {responded ? (
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> Your Response
              </p>
              <p className="text-sm">{report.driver_statement}</p>
              {report.driver_evidence_photo_url && (
                <img src={report.driver_evidence_photo_url} alt="Driver evidence" className="mt-2 w-full max-h-40 object-contain rounded-lg border" />
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Submitted: {report.driver_response_date ? new Date(report.driver_response_date).toLocaleString() : '—'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium flex items-center gap-1 mb-1">
                  <MessageSquare size={14} /> Your Statement
                </label>
                <Textarea
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="Describe what happened from your perspective. Include any relevant details about the item's condition before, during, and after the move..."
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium flex items-center gap-1 mb-1">
                  <Camera size={14} /> Evidence Photo
                </label>
                {evidenceUrl ? (
                  <div className="relative">
                    <img src={evidenceUrl} alt="Evidence" className="w-full max-h-48 object-contain rounded-xl border" />
                    <button
                      onClick={() => setEvidenceUrl('')}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                      aria-label="Remove photo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 cursor-pointer hover:bg-muted transition-colors min-h-[44px]">
                    {uploading ? (
                      <Loader2 className="animate-spin text-muted-foreground" size={24} />
                    ) : (
                      <>
                        <Upload className="text-muted-foreground" size={24} />
                        <span className="text-xs text-muted-foreground">Upload evidence photo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    />
                  </label>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || uploading}
                className="w-full bg-amber-500 hover:bg-amber-600"
              >
                {submitting ? <Loader2 size={16} className="animate-spin mr-1" /> : <ShieldAlert size={16} className="mr-1" />}
                Submit Evidence
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}