import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Loader2, Thermometer, PenLine, Package } from 'lucide-react';
import TemperatureBadge, { SignatureBadge } from '@/components/go/TemperatureBadge';

const STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-700',
  accepted: 'bg-blue-500/10 text-blue-700',
  in_progress: 'bg-purple-500/10 text-purple-700',
  completed: 'bg-emerald-500/10 text-emerald-700',
  cancelled: 'bg-red-500/10 text-red-700',
  quoted: 'bg-cyan-500/10 text-cyan-700',
};

export default function DeliveryHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: moves = [], isLoading } = useQuery({
    queryKey: ['courierHistory', user?.email],
    queryFn: () => base44.entities.MoveRequest.filter({ job_type: 'courier', customer_email: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await base44.functions.invoke('export-delivery-history', {});
      const csv = res.data;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `delivery-history-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export downloaded!' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
    setExporting(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="min-h-[44px] min-w-[44px]">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">Delivery History</h1>
          <p className="text-muted-foreground text-sm">All your quick deliveries and receipts.</p>
        </div>
      </div>

      <Button className="w-full mb-4" variant="outline" onClick={handleExport} disabled={exporting || moves.length === 0}>
        {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} className="mr-1" />}
        {exporting ? 'Exporting...' : 'Export to CSV'}
      </Button>

      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div>
      ) : moves.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No deliveries yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {moves.map(m => (
            <button key={m.id} type="button" className="w-full text-left bg-card border rounded-xl p-4" onClick={() => navigate(`/move/${m.id}`)}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-semibold">{m.delivery_category?.replace(/_/g, ' ') || 'Delivery'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status] || 'bg-muted'}`}>{m.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-sm text-muted-foreground truncate">{m.pickup_address}</div>
              <div className="text-sm text-muted-foreground truncate">→ {m.dropoff_address}</div>
              {m.items_summary && <div className="text-xs text-muted-foreground mt-1 truncate">{m.items_summary}</div>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-sm font-bold">${(m.total_price || 0).toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">{new Date(m.created_date).toLocaleDateString()}</span>
                <TemperatureBadge show={m.temperature_controlled} small />
                <SignatureBadge show={m.requires_signature} small />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}