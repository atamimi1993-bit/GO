import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Download, Loader2, Table, ExternalLink } from 'lucide-react';

export default function ExportToSheetsButton() {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const downloadCSV = (rows, headers, filename) => {
    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const csv = [headers.join(',')];
    for (const row of rows) {
      csv.push(headers.map((h) => escape(row[h])).join(','));
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await base44.functions.invoke('admin-dashboard', { action: 'export_financials' });
      const moves = res.data?.moves || [];
      if (moves.length === 0) {
        toast({ title: 'No data', description: 'There are no moves to export yet.' });
        setExporting(false);
        return;
      }

      const headers = [
        'move_id', 'created_date', 'move_date', 'status', 'job_type',
        'customer_name', 'customer_email', 'pickup_address', 'dropoff_address',
        'distance_miles', 'total_weight_lbs', 'service_level', 'truck_size_needed',
        'assigned_driver', 'driver_company',
        'base_cost', 'fuel_cost', 'tolls', 'bulky_item_fee', 'materials_fee',
        'carrying_fee', 'extra_service_fee', 'tax_amount', 'app_fee', 'total_price',
        'driver_payout', 'payment_option', 'paid', 'deposit_paid', 'tip_amount',
        'discount_amount', 'promo_code', 'cancellation_fee', 'needs_storage', 'storage_days',
      ];

      const dateStr = new Date().toISOString().split('T')[0];
      downloadCSV(moves, headers, `go-financials-${dateStr}.csv`);

      toast({
        title: 'Export ready!',
        description: 'CSV downloaded — open it in Google Sheets (File → Import → Upload).',
      });
    } catch (err) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    }
    setExporting(false);
  };

  const openGoogleSheets = () => {
    window.open('https://sheets.new', '_blank');
  };

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Table className="text-emerald-600 dark:text-emerald-400" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm">Export to Google Sheets</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download all move summaries and earnings as a CSV, then import into Google Sheets.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={openGoogleSheets} className="min-h-[44px]">
            <ExternalLink size={14} className="mr-1" /> New Sheet
          </Button>
          <Button size="sm" onClick={handleExport} disabled={exporting} className="bg-emerald-500 hover:bg-emerald-600 min-h-[44px]">
            {exporting ? <Loader2 size={14} className="animate-spin mr-1" /> : <Download size={14} className="mr-1" />}
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
}