import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Receipt, Camera, Loader2, Fuel, Milestone, Wrench, FileQuestion,
  CheckCircle2, XCircle, Clock, TrendingUp, Upload, Briefcase,
} from 'lucide-react';

const EXPENSE_TYPES = [
  { value: 'gas', label: 'Gas', icon: Fuel, color: 'text-orange-500' },
  { value: 'tolls', label: 'Tolls', icon: Milestone, color: 'text-blue-500' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'text-purple-500' },
  { value: 'other', label: 'Other', icon: FileQuestion, color: 'text-gray-500' },
];

const STATUS_STYLES = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  approved: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
  denied: 'bg-red-500/10 text-red-700 dark:text-red-300',
  estimated: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
};

export default function ExpenseSubmission({ driverProfile }) {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [form, setForm] = useState({
    expense_type: 'gas',
    amount: '',
    description: '',
    move_request_id: '',
    use_estimate: false,
  });

  const load = useCallback(async () => {
    if (!driverProfile?.id) return;
    try {
      const [data, jobs] = await Promise.all([
        base44.entities.ExpenseReceipt.filter(
          { driver_profile_id: driverProfile.id },
          '-created_date',
          50
        ),
        base44.entities.MoveRequest.filter(
          { assigned_driver_id: driverProfile.id, status: { $in: ['accepted', 'in_progress'] } },
          '-move_date',
          20
        ).catch(() => []),
      ]);
      setReceipts(data);
      setActiveJobs(jobs || []);
      // Auto-select the current active job if none chosen yet
      if (jobs?.length > 0 && !form.move_request_id) {
        setForm((prev) => ({ ...prev, move_request_id: jobs[0].id }));
      }
    } catch {
      setReceipts([]);
    }
    setLoading(false);
  }, [driverProfile]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(res.file_url);
      toast({ title: 'Receipt uploaded' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.use_estimate && !photoUrl) {
      toast({ title: 'Receipt photo required', description: 'Upload a photo or choose the estimate option instead.', variant: 'destructive' });
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({ title: 'Enter an amount', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.ExpenseReceipt.create({
        driver_profile_id: driverProfile.id,
        driver_name: driverProfile.full_name,
        expense_type: form.expense_type,
        amount: parseFloat(form.amount),
        receipt_photo_url: form.use_estimate ? '' : photoUrl,
        description: form.description,
        move_request_id: form.move_request_id || undefined,
        use_estimate: form.use_estimate,
        status: form.use_estimate ? 'estimated' : 'pending',
      });
      toast({ title: 'Expense submitted!', description: form.use_estimate ? 'Your estimate request has been sent for review.' : 'Your receipt has been submitted for review.' });
      setForm({ expense_type: 'gas', amount: '', description: '', move_request_id: '', use_estimate: false });
      setPhotoUrl('');
      setShowForm(false);
      load();
    } catch (err) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 rounded-lg p-1.5">
            <Receipt size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Expense Receipts</h2>
            <p className="text-xs text-muted-foreground">Submit gas, tolls, and other expenses for reimbursement.</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : <><Upload size={14} className="mr-1" /> Submit</>}
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-xl p-4 mb-4 space-y-4 bg-muted/30">
          {/* Expense type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Expense Type</label>
            <div className="grid grid-cols-4 gap-2">
              {EXPENSE_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, expense_type: t.value })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${form.expense_type === t.value ? 'border-primary bg-primary/5' : 'border-input'}`}
                  >
                    <Icon size={18} className={t.color} />
                    <span className="text-xs">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium mb-1 block">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Current job (auto-linked) */}
          <div>
            <label className="text-sm font-medium mb-1 block">Linked Job</label>
            {activeJobs.length > 0 ? (
              <select
                value={form.move_request_id}
                onChange={(e) => setForm({ ...form, move_request_id: e.target.value })}
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {activeJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.pickup_address} → {j.dropoff_address}
                    {j.status === 'in_progress' ? ' (in progress)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 h-11 rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                <Briefcase size={14} /> No active job — receipt will be unlinked
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1 block">Description (optional)</label>
            <textarea
              placeholder="e.g. Refueled at Shell on I-95"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={2}
            />
          </div>

          {/* Estimate toggle */}
          <label className="flex items-start gap-2 p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.use_estimate}
              onChange={(e) => setForm({ ...form, use_estimate: e.target.checked })}
              className="mt-0.5"
            />
            <div>
              <span className="text-sm font-medium flex items-center gap-1"><TrendingUp size={14} className="text-blue-500" /> Use estimate rate instead</span>
              <p className="text-xs text-muted-foreground mt-0.5">If you don't have a receipt, we'll calculate a standard rate based on your mileage and route.</p>
            </div>
          </label>

          {/* Photo upload */}
          {!form.use_estimate && (
            <div>
              <label className="text-sm font-medium mb-1 block">Receipt Photo</label>
              {photoUrl ? (
                <div className="relative">
                  <img src={photoUrl} alt="Receipt" className="w-full max-h-48 object-contain rounded-lg border" />
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => setPhotoUrl('')}>
                    Remove photo
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-input rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                  {uploading ? (
                    <Loader2 className="animate-spin text-muted-foreground" size={24} />
                  ) : (
                    <Camera className="text-muted-foreground" size={24} />
                  )}
                  <span className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Take or upload a photo'}</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
                </label>
              )}
            </div>
          )}

          <Button className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={handleSubmit} disabled={submitting || uploading}>
            {submitting ? <Loader2 size={16} className="animate-spin mr-1" /> : <Receipt size={16} className="mr-1" />}
            Submit Expense
          </Button>
        </div>
      )}

      {/* Submitted receipts */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
      ) : receipts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No expense submissions yet.</p>
      ) : (
        <div className="space-y-2">
          {receipts.map((r) => {
            const Icon = EXPENSE_TYPES.find((t) => t.value === r.expense_type)?.icon || Receipt;
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon size={18} className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">{r.expense_type} — ${r.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.use_estimate ? 'Estimate rate' : 'Receipt attached'}
                      {r.move_request_id ? ` · Linked to job` : ' · Unlinked'}
                      {r.description ? ` · ${r.description}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.status === 'approved' && <span className="text-xs font-medium text-emerald-600">${(r.approved_amount || r.amount).toFixed(2)}</span>}
                  <Badge className={STATUS_STYLES[r.status]}>
                    {r.status === 'pending' && <Clock size={10} className="mr-1" />}
                    {r.status === 'approved' && <CheckCircle2 size={10} className="mr-1" />}
                    {r.status === 'denied' && <XCircle size={10} className="mr-1" />}
                    {r.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}