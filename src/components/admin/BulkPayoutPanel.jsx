import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import PullToRefresh from '@/components/go/PullToRefresh';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Wallet, Loader2, CheckCircle2, ChevronDown, ChevronUp, DollarSign,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BulkPayoutPanel({ scrollRef }) {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [expandedDrivers, setExpandedDrivers] = useState(new Set());

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('admin-dashboard', { action: 'pending_payouts' });
      setData(res.data);
      setSelected(new Set());
    } catch (err) {
      toast({ title: 'Failed to load payouts', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDriver = (driverId, payoutIds) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = payoutIds.every((pid) => next.has(pid));
      if (allSelected) {
        payoutIds.forEach((pid) => next.delete(pid));
      } else {
        payoutIds.forEach((pid) => next.add(pid));
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!data) return;
    setSelected(new Set(data.payouts.map((p) => p.id)));
  };

  const clearAll = () => setSelected(new Set());

  const toggleExpand = (driverId) => {
    setExpandedDrivers((prev) => {
      const next = new Set(prev);
      if (next.has(driverId)) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
  };

  const handleBulkPayout = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setProcessing(true);
    try {
      const res = await base44.functions.invoke('admin-dashboard', { action: 'bulk_payout', payout_ids: ids });
      toast({
        title: 'Payouts processed',
        description: `${res.data.processed} payout${res.data.processed !== 1 ? 's' : ''} marked as paid.`,
      });
      await load();
    } catch (err) {
      toast({ title: 'Bulk payout failed', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={20} className="text-amber-500" />
          <h2 className="font-display font-bold text-lg">Bulk Payout Processing</h2>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </div>
    );
  }

  if (!data || data.payouts.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={20} className="text-amber-500" />
          <h2 className="font-display font-bold text-lg">Bulk Payout Processing</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">No pending payouts to process.</p>
      </div>
    );
  }

  // Group payouts by driver
  const grouped = {};
  for (const p of data.payouts) {
    if (!grouped[p.driver_profile_id]) {
      grouped[p.driver_profile_id] = { driver_name: p.driver_name, company_name: p.company_name, payouts: [] };
    }
    grouped[p.driver_profile_id].payouts.push(p);
  }
  const driverGroups = Object.entries(grouped);

  const selectedTotal = data.payouts
    .filter((p) => selected.has(p.id))
    .reduce((s, p) => s + p.amount, 0);

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={20} className="text-amber-500" />
          <h2 className="font-display font-bold text-lg">Bulk Payout Processing</h2>
        </div>

        {/* Summary bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-display font-bold text-amber-600 dark:text-amber-400">
                {fmt(selectedTotal)}
              </p>
              <p className="text-xs text-muted-foreground">{selected.size} selected</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <p className="text-sm font-medium">{data.count} pending</p>
              <p className="text-xs text-muted-foreground">{fmt(data.grandTotal)} total</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={selected.size === data.payouts.length ? clearAll : selectAll}>
              {selected.size === data.payouts.length ? 'Clear All' : 'Select All'}
            </Button>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600"
              disabled={selected.size === 0 || processing}
              onClick={handleBulkPayout}
            >
              {processing
                ? <><Loader2 size={14} className="animate-spin mr-1" /> Processing...</>
                : <><DollarSign size={14} className="mr-1" /> Pay {selected.size} ({fmt(selectedTotal)})</>}
            </Button>
          </div>
        </div>

        {/* Driver groups */}
        <div className="space-y-2">
          {driverGroups.map(([driverId, group]) => {
            const payoutIds = group.payouts.map((p) => p.id);
            const allSelected = payoutIds.every((pid) => selected.has(pid));
            const someSelected = payoutIds.some((pid) => selected.has(pid));
            const groupTotal = group.payouts.reduce((s, p) => s + p.amount, 0);
            const expanded = expandedDrivers.has(driverId);

            return (
              <div key={driverId} className="rounded-xl border overflow-hidden">
                {/* Driver header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(driverId)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleDriver(driverId, payoutIds)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select all payouts for ${group.driver_name}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.driver_name}</p>
                    {group.company_name && <p className="text-xs text-muted-foreground truncate">{group.company_name}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">{fmt(groupTotal)}</p>
                    <p className="text-xs text-muted-foreground">{group.payouts.length} payout{group.payouts.length !== 1 ? 's' : ''}</p>
                  </div>
                  {expanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
                </button>

                {/* Payout list */}
                {expanded && (
                  <div className="border-t divide-y">
                    {group.payouts.map((p) => {
                      const isSel = selected.has(p.id);
                      return (
                        <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                          <Checkbox
                            checked={isSel}
                            onCheckedChange={() => toggleSelect(p.id)}
                            aria-label={`Select payout from ${p.pickup} to ${p.dropoff}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{p.pickup} → {p.dropoff}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.customer_name || 'Unknown customer'}
                              {p.move_date && ` · ${format(parseISO(p.move_date), 'MMM d, yyyy')}`}
                            </p>
                          </div>
                          <p className="font-semibold text-sm shrink-0">{fmt(p.amount)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PullToRefresh>
  );
}