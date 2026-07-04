import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Download, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function monthKey(iso) {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Unknown';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function csvEscape(val) {
  const s = String(val ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function PayoutExportButton() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await base44.functions.invoke('admin-dashboard', { action: 'export_payouts' });
      const payouts = res.data?.payouts || [];

      if (payouts.length === 0) {
        toast({ title: 'No payouts to export', variant: 'destructive' });
        return;
      }

      // Group by month + driver for the summary
      const summary = {};
      for (const p of payouts) {
        const mk = monthKey(p.created_date);
        const key = `${mk}||${p.driver_name}`;
        if (!summary[key]) {
          summary[key] = {
            month: mk,
            driver_name: p.driver_name,
            company_name: p.company_name,
            bank_name: p.bank_name,
            bank_account_last4: p.bank_account_last4,
            count: 0,
            pending_count: 0,
            paid_count: 0,
            deducted_count: 0,
            total_amount: 0,
            deductions: 0,
            currency: p.currency,
          };
        }
        const row = summary[key];
        row.count += 1;
        row.total_amount += p.amount;
        row.deductions += p.deduction_amount || 0;
        if (p.status === 'pending' || p.status === 'processing') row.pending_count += 1;
        else if (p.status === 'paid') row.paid_count += 1;
        else if (p.status === 'deducted') row.deducted_count += 1;
      }

      const sorted = Object.values(summary).sort((a, b) => {
        if (a.month !== b.month) return a.month.localeCompare(b.month);
        return a.driver_name.localeCompare(b.driver_name);
      });

      const headers = [
        'Month', 'Driver Name', 'Company', 'Bank', 'Account Last 4',
        'Total Payouts', 'Pending', 'Paid', 'Deducted',
        'Total Amount', 'Deductions', 'Net Amount', 'Currency',
      ];

      const rows = sorted.map((r) => [
        r.month, r.driver_name, r.company_name, r.bank_name, r.bank_account_last4,
        r.count, r.pending_count, r.paid_count, r.deducted_count,
        r.total_amount.toFixed(2), r.deductions.toFixed(2),
        (r.total_amount - r.deductions).toFixed(2), r.currency,
      ]);

      // Add grand total row
      const grandTotal = sorted.reduce((acc, r) => {
        acc.total_amount += r.total_amount;
        acc.deductions += r.deductions;
        acc.count += r.count;
        return acc;
      }, { total_amount: 0, deductions: 0, count: 0 });

      rows.push([
        'TOTAL', '', '', '', '', grandTotal.count, '', '', '',
        grandTotal.total_amount.toFixed(2), grandTotal.deductions.toFixed(2),
        (grandTotal.total_amount - grandTotal.deductions).toFixed(2), '',
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map(csvEscape).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `driver-payout-summary-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export complete',
        description: `${payouts.length} payouts exported across ${sorted.length} driver-month rows.`,
      });
    } catch (err) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="min-h-[44px]"
      onClick={handleExport}
      disabled={exporting}
      aria-label="Export monthly payout summary as CSV"
    >
      {exporting
        ? <><Loader2 size={14} className="animate-spin mr-1" /> Exporting...</>
        : <><Download size={14} className="mr-1" /> Export CSV</>}
    </Button>
  );
}