import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Upload, Loader2, X, CheckCircle2, Package } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function DamageReportForm({ move, user, onSubmitted }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reportType, setReportType] = useState('damaged');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [claimedValue, setClaimedValue] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file) => {
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
    if (!itemName.trim() || !description.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill in the item name and description.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const report = await base44.entities.DamageReport.create({
        move_request_id: move.id,
        customer_name: move.customer_name || user?.full_name || '',
        customer_email: move.customer_email || user?.email || '',
        driver_name: move.assigned_driver_name || '',
        report_type: reportType,
        item_name: itemName.trim(),
        description: description.trim(),
        claimed_value: parseFloat(claimedValue) || 0,
        evidence_photo_url: evidenceUrl,
        status: 'submitted',
      });

      await base44.functions.invoke('notify-admin-damage', { damage_report_id: report.id });

      toast({ title: 'Report submitted', description: 'Our admin team has been notified and will review your report.' });
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      toast({ title: 'Submission failed', description: err.message || 'Could not submit report.', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const reset = () => {
    setReportType('damaged');
    setItemName('');
    setDescription('');
    setClaimedValue('');
    setEvidenceUrl('');
    setOpen(false);
    setDone(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 justify-center bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-500/20 transition-colors min-h-[44px]"
      >
        <AlertTriangle size={16} /> Report Damaged or Lost Item
      </button>
    );
  }

  if (done) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600 mb-2" size={28} />
        <p className="font-medium text-sm text-emerald-700 dark:text-emerald-300">Report Submitted</p>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Your report has been sent to our admin team for review. We will follow up via email.
        </p>
        <Button variant="outline" size="sm" onClick={reset}>Close</Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-red-500/30 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-sm flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertTriangle size={16} /> Report Damaged or Lost Item
        </h3>
        <button onClick={reset} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { value: 'damaged', label: 'Damaged Item', icon: AlertTriangle },
          { value: 'lost', label: 'Lost Item', icon: Package },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setReportType(opt.value)}
            className={`flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              reportType === opt.value
                ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <opt.icon size={16} /> {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Item Name</Label>
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Leather sofa, 55 inch TV"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, the extent of damage, or when you noticed the item was missing..."
            className="mt-1 min-h-[100px]"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Estimated Value ($)</Label>
          <Input
            type="number"
            value={claimedValue}
            onChange={(e) => setClaimedValue(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Evidence Photo</Label>
          {evidenceUrl ? (
            <div className="mt-1 relative">
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
            <label className="mt-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 cursor-pointer hover:bg-muted transition-colors min-h-[44px]">
              {uploading ? (
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              ) : (
                <>
                  <Upload className="text-muted-foreground" size={24} />
                  <span className="text-xs text-muted-foreground">Tap to upload a photo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
            </label>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="w-full bg-red-500 hover:bg-red-600"
        >
          {submitting ? <Loader2 size={16} className="animate-spin mr-1" /> : <AlertTriangle size={16} className="mr-1" />}
          Submit Report
        </Button>
      </div>
    </div>
  );
}