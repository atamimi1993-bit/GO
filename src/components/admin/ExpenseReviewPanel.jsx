import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Receipt, Loader2, CheckCircle2, XCircle, Fuel, Milestone, Wrench, FileQuestion, Calculator,
} from 'lucide-react';

const EXPENSE_ICONS = {
  gas: Fuel,
  tolls: Milestone,
  maintenance: Wrench,
  other: FileQuestion,
};

const STATUS_STYLES = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  approved: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
  denied: 'bg-red-500/10 text-red-700 dark:text-red-300',
  estimated: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
};

export default function ExpenseReviewPanel() {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [approveAmounts, setApproveAmounts] = useState({});

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.ExpenseReceipt.filter({}, '-created_date', 100);
      setReceipts(data);
    } catch {
      setReceipts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (receipt) => {
    setProcessingId(receipt.id);
    try {
      const amount = approveAmounts[receipt.id] !== undefined
        ? parseFloat(approveAmounts[receipt.id])
        : receipt.use_estimate
          ? receipt.estimated_amount || receipt.amount
          : receipt.amount;
      await base44.entities.ExpenseReceipt.update(receipt.id, {
        status: 'approved',
        approved_amount: amount,
      });
      toast({ title: 'Expense approved', description: `$${amount.toFixed(2)} approved for ${receipt.driver_name}.` });
      load();
    } catch (err) {
      toast({ title: 'Approval failed', description: err.message, variant: 'destructive' });
    }
    setProcessingId(null);
  };

  const handleDeny = async (receipt) => {
    setProcessingId(receipt.id);
    try {
      await base44.entities.ExpenseReceipt.update(receipt.id, { status: 'denied' });
      toast({ title: 'Expense denied', description: `Receipt from ${receipt.driver_name} has been denied.` });
      load();
    } catch (err) {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    }
    setProcessingId(null);
  };

  const handleEstimate = async (receipt) => {
    setProcessingId(receipt.id);
    try {
      // Standard estimate: gas at $0.65/mile estimate, tolls flat $15, maintenance $0.15/mile
      const estimates = { gas: 45, tolls: 15, maintenance: 30, other: 20 };
      const estimated = estimates[receipt.expense_type] || 20;
      await base44.entities.ExpenseReceipt.update(receipt.id, {
        estimated_amount: estimated,
        use_estimate: true,
        status: 'estimated',
      });
      toast({ title: 'Estimate generated', description: `Estimated $${estimated.toFixed(2)} for ${receipt.expense_type}.` });
      load();
    } catch (err) {
      toast({ title: 'Estimate failed', description: err.message, variant: 'destructive' });
    }
    setProcessingId(null);
  };

  const pending = receipts.filter((r) => r.status === 'pending' || r.status === 'estimated');
  const reviewed = receipts.filter((r) => r.status === 'approved' || r.status === 'denied');

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt size={20} className="text-orange-500" />
          <h2 className="font-display font-bold text-lg">Expense Receipts</h2>
        </div>
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-orange-500 rounded-lg p-1.5">
          <Receipt size={18} className="text-white" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg">Driver Expense Receipts</h2>
          <p className="text-xs text-muted-foreground">Review submitted receipts and approve reimbursements.</p>
        </div>
      </div>

      {/* Pending receipts */}
      {pending.length === 0 && reviewed.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No expense submissions yet.</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3 mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Pending Review ({pending.length})</h3>
              {pending.map((r) => {
                const Icon = EXPENSE_ICONS[r.expense_type] || Receipt;
                return (
                  <div key={r.id} className="border rounded-xl p-4 bg-muted/30">
                    <div className="flex items-start gap-3 mb-3">
                      {r.receipt_photo_url ? (
                        <img src={r.receipt_photo_url} alt="Receipt" className="w-20 h-20 object-cover rounded-lg border shrink-0" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg border flex items-center justify-center shrink-0 bg-muted">
                          <Calculator className="text-muted-foreground" size={24} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={14} className="text-muted-foreground" />
                          <span className="font-medium text-sm capitalize">{r.expense_type}</span>
                          <Badge className={STATUS_STYLES[r.status]}>{r.status}</Badge>
                          {r.use_estimate && <Badge variant="outline" className="text-blue-600">Estimate</Badge>}
                        </div>
                        <p className="text-sm font-semibold">{r.driver_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Claimed: ${r.amount.toFixed(2)}
                          {r.estimated_amount > 0 && ` · Estimated: $${r.estimated_amount.toFixed(2)}`}
                        </p>
                        {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                      </div>
                    </div>

                    {/* Approve amount input */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-muted-foreground shrink-0">Approve $</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={(r.use_estimate ? r.estimated_amount : r.amount).toFixed(2)}
                          value={approveAmounts[r.id] || ''}
                          onChange={(e) => setApproveAmounts({ ...approveAmounts, [r.id]: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        {!r.use_estimate && r.status !== 'estimated' && (
                          <Button size="sm" className="min-h-[44px]" variant="outline" onClick={() => handleEstimate(r)} disabled={processingId === r.id}>
                            <Calculator size={12} className="mr-1" /> Estimate
                          </Button>
                        )}
                        <Button size="sm" className="min-h-[44px] bg-emerald-500 hover:bg-emerald-600" onClick={() => handleApprove(r)} disabled={processingId === r.id}>
                          {processingId === r.id ? <Loader2 size={12} className="animate-spin mr-1" /> : <CheckCircle2 size={12} className="mr-1" />}
                          Approve
                        </Button>
                        <Button size="sm" className="min-h-[44px]" variant="outline" onClick={() => handleDeny(r)} disabled={processingId === r.id}>
                          <XCircle size={12} className="mr-1" /> Deny
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reviewed receipts */}
          {reviewed.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Reviewed ({reviewed.length})</h3>
              {reviewed.map((r) => {
                const Icon = EXPENSE_ICONS[r.expense_type] || Receipt;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon size={16} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">{r.expense_type} — {r.driver_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Claimed: ${r.amount.toFixed(2)}
                          {r.approved_amount > 0 && ` · Approved: $${r.approved_amount.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                    <Badge className={STATUS_STYLES[r.status]}>{r.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}