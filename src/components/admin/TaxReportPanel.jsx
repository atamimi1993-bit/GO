import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Loader2, Download, DollarSign, Users } from 'lucide-react';
import MobileSelect from '@/components/go/MobileSelect';

export default function TaxReportPanel() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('generate-1099-report', { year });
      setReport(res.data);
    } catch (err) {
      toast({ title: 'Report failed', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const downloadCSV = () => {
    if (!report?.results) return;
    const rows = [
      ['Driver Name', 'Email', 'Phone', 'Total Earnings', 'Payout Count', '1099 Required'],
      ...report.results.map(r => [
        `"${r.driver_name}"`,
        `"${r.email}"`,
        `"${r.phone || ''}"`,
        r.total_earnings.toFixed(2),
        r.payout_count,
        r.needs_1099 ? 'Yes' : 'No',
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `1099-report-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v) => '$' + Number(v || 0).toFixed(2);

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={20} className="text-blue-600" />
        <h2 className="font-display font-bold text-lg">1099 Tax Report</h2>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <MobileSelect
          value={String(year)}
          onValueChange={(v) => { setYear(parseInt(v)); setReport(null); }}
          options={[currentYear, currentYear - 1].map(y => ({ value: String(y), label: String(y) }))}
          placeholder="Select year"
          className="min-h-[44px]"
        />
        <Button onClick={generate} disabled={loading} className="min-h-[44px]">
          {loading ? <Loader2 size={16} className="animate-spin mr-1" /> : <FileText size={16} className="mr-1" />}
          Generate Report
        </Button>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <DollarSign size={16} className="mx-auto text-emerald-600 mb-1" />
              <p className="text-xl font-display font-bold">{fmt(report.total_earnings)}</p>
              <p className="text-xs text-muted-foreground">Total Paid</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <Users size={16} className="mx-auto text-blue-600 mb-1" />
              <p className="text-xl font-display font-bold">{report.drivers_needing_1099}</p>
              <p className="text-xs text-muted-foreground">Need 1099 ($600+)</p>
            </div>
          </div>

          {report.results.length > 0 && (
            <>
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={downloadCSV} className="min-h-[36px]">
                  <Download size={14} className="mr-1" /> Download CSV
                </Button>
              </div>
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-2 pr-3">Driver</th>
                      <th className="pb-2 pr-3">Earnings</th>
                      <th className="pb-2 pr-3">Payouts</th>
                      <th className="pb-2">1099</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.results.map(r => (
                      <tr key={r.driver_id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <p className="font-medium">{r.driver_name}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                        </td>
                        <td className="py-2 pr-3 font-semibold">{fmt(r.total_earnings)}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{r.payout_count}</td>
                        <td className="py-2">
                          {r.needs_1099
                            ? <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Required</Badge>
                            : <Badge variant="secondary">Not needed</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {report.results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No paid driver earnings found for {year}.
            </p>
          )}
        </>
      )}
    </div>
  );
}