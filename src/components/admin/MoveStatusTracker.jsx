import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Clock, Loader2, ChevronDown, ChevronRight, Package, Navigation, CheckCircle2,
  UserPlus, X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/pricing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_GROUPS = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-500', badge: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300' },
  { key: 'in_progress', label: 'In Progress', icon: Navigation, color: 'text-purple-500', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-500', badge: 'bg-muted text-foreground' },
];

// Also include accepted and quoted under "pending" umbrella for tracking
const STATUS_MAP = {
  pending: ['pending', 'quoted', 'accepted'],
  in_progress: ['in_progress'],
  completed: ['completed'],
};

const fmt = (n) => formatCurrency(n || 0, 'USD');

export default function MoveStatusTracker() {
  const { toast } = useToast();
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({ pending: true, in_progress: true, completed: false });
  const [showAll, setShowAll] = useState({});
  const [limit, setLimit] = useState(50);
  const [approvedDrivers, setApprovedDrivers] = useState([]);
  const [assigningMoveId, setAssigningMoveId] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState({});
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.MoveRequest.list('-created_date', limit);
      setMoves(data);
    } catch (err) {
      toast({ title: 'Failed to load moves', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, limit]);

  useEffect(() => { load(); }, [load]);

  // Load approved drivers for manual assignment
  useEffect(() => {
    base44.entities.DriverProfile.filter({ status: 'approved', available: true })
      .then(setApprovedDrivers)
      .catch(() => {});
  }, []);

  const handleManualAssign = async (moveId) => {
    const driverId = selectedDriver[moveId];
    if (!driverId) return;
    const driver = approvedDrivers.find((d) => d.id === driverId);
    if (!driver) return;
    setAssigning(true);
    try {
      await base44.entities.MoveRequest.update(moveId, {
        assigned_driver_id: driver.id,
        assigned_driver_name: driver.full_name,
        dispatched_at: new Date().toISOString(),
        status: 'accepted',
      });
      toast({ title: 'Driver assigned', description: `${driver.full_name} assigned to this move` });
      setAssigningMoveId(null);
      setSelectedDriver({});
      load();
    } catch (err) {
      toast({ title: 'Failed to assign driver', description: err.message, variant: 'destructive' });
    }
    setAssigning(false);
  };

  const grouped = STATUS_GROUPS.map((group) => ({
    ...group,
    moves: moves.filter((m) => STATUS_MAP[group.key].includes(m.status)),
  }));

  const toggleExpand = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleShowAll = (key) => setShowAll((prev) => ({ ...prev, [key]: !prev[key] }));

  const PREVIEW_COUNT = 5;

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Package size={20} className="text-emerald-500" />
        <h2 className="font-display font-bold text-lg">Move Status Tracker</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
      ) : (
        <div className="space-y-2">
          {grouped.map((group) => {
            const Icon = group.icon;
            const isExpanded = expanded[group.key];
            const visibleMoves = showAll[group.key] ? group.moves : group.moves.slice(0, PREVIEW_COUNT);
            const hasMore = group.moves.length > PREVIEW_COUNT;

            return (
              <div key={group.key} className="border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpand(group.key)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 outline-none rounded-lg"
                >
                  {isExpanded ? <ChevronDown size={16} className="text-muted-foreground shrink-0" /> : <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
                  <Icon size={18} className={group.color} />
                  <span className="font-medium text-sm">{group.label}</span>
                  <Badge className={`ml-auto ${group.badge}`}>{group.moves.length}</Badge>
                </button>

                {isExpanded && (
                  <div className="border-t">
                    {group.moves.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No {group.label.toLowerCase()} moves.</p>
                    ) : (
                      <>
                        <div className="divide-y">
                          {visibleMoves.map((m) => (
                            <div key={m.id} className="p-3 hover:bg-muted/30">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{m.pickup_address} → {m.dropoff_address}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {m.customer_name || 'Unknown'} · {m.move_date ? format(parseISO(m.move_date), 'MMM d, yyyy') : 'No date'}
                                    {m.assigned_driver_name ? ` · ${m.assigned_driver_name}` : ' · Unassigned'}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold shrink-0">{fmt(m.total_price)}</span>
                              </div>
                              {/* Manual driver assignment for unassigned moves */}
                              {!m.assigned_driver_id && approvedDrivers.length > 0 && (
                                <div className="mt-2">
                                  {assigningMoveId === m.id ? (
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={selectedDriver[m.id] || ''}
                                        onValueChange={(val) => setSelectedDriver({ ...selectedDriver, [m.id]: val })}
                                      >
                                        <SelectTrigger className="h-8 text-xs flex-1">
                                          <SelectValue placeholder="Select a driver..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {approvedDrivers.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>
                                              {d.full_name} · {d.vehicle_category}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        size="sm"
                                        className="h-8"
                                        disabled={!selectedDriver[m.id] || assigning}
                                        onClick={() => handleManualAssign(m.id)}
                                      >
                                        {assigning ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} className="mr-1" />}
                                        Assign
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAssigningMoveId(null); setSelectedDriver({}); }}>
                                        <X size={14} />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAssigningMoveId(m.id)}>
                                      <UserPlus size={12} className="mr-1" /> Assign Driver
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {hasMore && (
                          <button
                            onClick={() => toggleShowAll(group.key)}
                            className="w-full py-2 text-sm text-primary font-medium hover:underline"
                          >
                            {showAll[group.key] ? 'Show less' : `Show all ${group.moves.length} moves`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {moves.length >= limit && (
          <Button size="sm" variant="outline" className="w-full min-h-[44px]" onClick={() => setLimit((l) => l + 50)} aria-label="Load more moves">
            Load more moves
          </Button>
        )}
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={load} disabled={loading} aria-label="Refresh moves list">
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Clock size={14} className="mr-1" />}
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}