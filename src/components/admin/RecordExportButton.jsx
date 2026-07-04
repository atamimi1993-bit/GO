import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Download, Loader2, FileText, Wallet } from 'lucide-react';
import { format } from 'date-fns';

function csvEscape(val) {
  const s = String(val ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function RecordExportButton() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const [finRes, payRes] = await Promise.all([
        base44.functions.invoke('admin-dashboard', { action: 'export_financials' }),
        base44.functions.invoke('admin-dashboard', { action: 'export_payouts' }),
      ]);

      const moves = finRes.data?.moves || [];
      const payouts = payRes.data?.payouts || [];
      const dateStr = format(new Date(), 'yyyy-MM-dd');

      let moveCount = 0;
      let payoutCount = 0;

      // Move records CSV
      if (moves.length > 0) {
        const moveHeaders = [
          'Move ID', 'Created', 'Move Date', 'Status', 'Job Type',
          'Customer Name', 'Customer Email', 'Pickup', 'Dropoff',
          'Distance (mi)', 'Weight (lbs)', 'Service Level', 'Truck Size',
          'Assigned Driver', 'Driver Company',
          'Base Cost', 'Fuel', 'Tolls', 'Bulky Item Fee', 'Materials Fee',
          'Carrying Fee', 'Extra Service Fee', 'Tax', 'App Fee',
          'Total Price', 'Driver Payout', 'Payment Option',
          'Paid', 'Deposit Paid', 'Tip', 'Discount', 'Promo Code',
          'Cancellation Fee', 'Needs Storage', 'Storage Days',
        ];
        const moveRows = moves.map((m) => [
          m.move_id, m.created_date, m.move_date, m.status, m.job_type,
          m.customer_name, m.customer_email, m.pickup_address, m.dropoff_address,
          m.distance_miles, m.total_weight_lbs, m.service_level, m.truck_size_needed,
          m.assigned_driver, m.driver_company,
          m.base_cost, m.fuel_cost, m.tolls, m.bulky_item_fee, m.materials_fee,
          m.carrying_fee, m.extra_service_fee, m.tax_amount, m.app_fee,
          m.total_price, m.driver_payout, m.payment_option,
          m.paid, m.deposit_paid, m.tip_amount, m.discount_amount, m.promo_code,
          m.cancellation_fee, m.needs_storage, m.storage_days,
        ]);
        downloadCsv(`move-records-${dateStr}.csv`, moveHeaders, moveRows);
        moveCount = moves.length;
      }

      // Payout records CSV
      if (payouts.length > 0) {
        const payHeaders = [
          'Payout ID', 'Created', 'Amount', 'Currency', 'Status',
          'Deduction Amount', 'Deduction Reason', 'Notes',
          'Driver Name', 'Company', 'Bank Name', 'Account Type', 'Account Last 4',
          'Move Date', 'Customer Name', 'Pickup', 'Dropoff', 'Job Type',
        ];
        const payRows = payouts.map((p) => [
          p.payout_id, p.created_date, p.amount, p.currency, p.status,
          p.deduction_amount, p.deduction_reason, p.notes,
          p.driver_name, p.company_name, p.bank_name, p.bank_account_type, p.bank_account_last4,
          p.move_date, p.customer_name, p.pickup_address, p.dropoff_address, p.job_type,
        ]);
        downloadCsv(`payout-reports-${dateStr}.csv`, payHeaders, payRows);
        payoutCount = payouts.length;
      }

      if (moveCount === 0 && payoutCount === 0) {
        toast({ title: 'Nothing to export', description: 'No move records or payouts found.', variant: 'destructive' });
        return;
      }

      toast({
        title: 'Records downloaded',
        description: `${moveCount} move records and ${payoutCount} payout records saved as CSV files.`,
      });
    } catch (err) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full min-h-[44px]"
      onClick={handleExport}
      disabled={exporting}
      aria-label="Download all move records and payout reports as CSV"
    >
      {exporting
        ? <><Loader2 size={16} className="animate-spin mr-2" /> Preparing files...</>
        : <><Download size={16} className="mr-2" /> Download Records (Moves + Payouts)</>}
    </Button>
  );
}