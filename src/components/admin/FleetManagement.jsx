import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Truck, Wrench, Calendar, Gauge, Loader2, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FleetManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [truckLimit, setTruckLimit] = useState(50);
  const [editForm, setEditForm] = useState({ current_mileage: '', last_maintenance_date: '', next_maintenance_date: '', maintenance_notes: '' });

  const { data: trucks, isLoading } = useQuery({
    queryKey: ['fleetTrucks', truckLimit],
    queryFn: () => base44.entities.Truck.list('-created_date', truckLimit),
    staleTime: 60 * 1000,
  });

  const { data: drivers } = useQuery({
    queryKey: ['fleetDrivers'],
    queryFn: () => base44.entities.DriverProfile.list('-created_date', 50),
    staleTime: 60 * 1000,
  });

  const driverMap = {};
  for (const d of drivers || []) driverMap[d.id] = d;

  const today = new Date();

  const getMaintenanceStatus = (truck) => {
    if (!truck.next_maintenance_date) {
      if (truck.current_mileage > 0) {
        return { status: 'due', label: 'Due', color: 'amber', icon: AlertTriangle };
      }
      return { status: 'unknown', label: 'No records', color: 'slate', icon: Calendar };
    }
    const nextDate = parseISO(truck.next_maintenance_date);
    const daysUntil = differenceInDays(nextDate, today);
    if (daysUntil < 0) return { status: 'overdue', label: 'Overdue', color: 'red', icon: AlertTriangle };
    if (daysUntil <= 14) return { status: 'due_soon', label: `Due in ${daysUntil}d`, color: 'amber', icon: Calendar };
    return { status: 'ok', label: 'Up to date', color: 'emerald', icon: CheckCircle2 };
  };

  const colorClasses = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  };

  const filteredTrucks = (trucks || []).filter((t) => {
    if (!search) return true;
    const driver = driverMap[t.driver_profile_id];
    const q = search.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.make?.toLowerCase().includes(q) ||
      t.model?.toLowerCase().includes(q) ||
      t.license_plate?.toLowerCase().includes(q) ||
      driver?.full_name?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: (trucks || []).length,
    verified: (trucks || []).filter((t) => t.verified).length,
    overdue: (trucks || []).filter((t) => getMaintenanceStatus(t).status === 'overdue').length,
    dueSoon: (trucks || []).filter((t) => ['due', 'due_soon'].includes(getMaintenanceStatus(t).status)).length,
  };

  const handleEdit = (truck) => {
    setEditingId(truck.id);
    setEditForm({
      current_mileage: truck.current_mileage?.toString() || '',
      last_maintenance_date: truck.last_maintenance_date ? truck.last_maintenance_date.split('T')[0] : '',
      next_maintenance_date: truck.next_maintenance_date ? truck.next_maintenance_date.split('T')[0] : '',
      maintenance_notes: truck.maintenance_notes || '',
    });
  };

  const handleSave = async (truckId) => {
    try {
      const updates = {
        current_mileage: editForm.current_mileage ? Number(editForm.current_mileage) : 0,
        last_maintenance_date: editForm.last_maintenance_date || null,
        next_maintenance_date: editForm.next_maintenance_date || null,
        maintenance_notes: editForm.maintenance_notes || '',
      };
      await base44.entities.Truck.update(truckId, updates);
      toast({ title: 'Fleet record updated', description: 'Maintenance information saved.' });
      queryClient.invalidateQueries({ queryKey: ['fleetTrucks'] });
      setEditingId(null);
    } catch (err) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Truck size={20} className="text-blue-500" />
          <h2 className="font-display font-bold text-lg">Fleet Management</h2>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Truck size={20} className="text-blue-500" />
        <h2 className="font-display font-bold text-lg">Fleet Management</h2>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
          <Truck size={16} className="text-blue-500 mb-1" />
          <p className="text-lg font-display font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Trucks</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <CheckCircle2 size={16} className="text-emerald-500 mb-1" />
          <p className="text-lg font-display font-bold">{stats.verified}</p>
          <p className="text-xs text-muted-foreground">Verified</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <Calendar size={16} className="text-amber-500 mb-1" />
          <p className="text-lg font-display font-bold">{stats.dueSoon}</p>
          <p className="text-xs text-muted-foreground">Due Soon</p>
        </div>
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
          <AlertTriangle size={16} className="text-red-500 mb-1" />
          <p className="text-lg font-display font-bold">{stats.overdue}</p>
          <p className="text-xs text-muted-foreground">Overdue</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by truck, plate, or driver..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Truck list */}
      {filteredTrucks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No trucks found.</p>
      ) : (
        <div className="space-y-3">
          {filteredTrucks.map((truck) => {
            const driver = driverMap[truck.driver_profile_id];
            const maint = getMaintenanceStatus(truck);
            const MaintIcon = maint.icon;
            const isEditing = editingId === truck.id;

            return (
              <div key={truck.id} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {truck.photo_url || truck.exterior_photo_url ? (
                      <img src={truck.exterior_photo_url || truck.photo_url} alt={truck.name} className="w-12 h-12 rounded-lg object-cover border shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Truck size={20} className="text-blue-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{truck.name || `${truck.make} ${truck.model}`}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {truck.year} {truck.make} {truck.model} · {truck.license_plate}
                      </p>
                      {driver && (
                        <p className="text-xs text-muted-foreground truncate">Driver: {driver.full_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={colorClasses[maint.color]}>
                      <MaintIcon size={10} className="mr-0.5" />
                      {maint.label}
                    </Badge>
                    {truck.verified && (
                      <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={10} className="mr-0.5" /> Verified
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Gauge size={12} />
                    {truck.current_mileage ? `${truck.current_mileage.toLocaleString()} mi` : 'No mileage recorded'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Wrench size={12} />
                    {truck.last_maintenance_date ? `Last: ${format(parseISO(truck.last_maintenance_date), 'MMM d, yyyy')}` : 'No maintenance logged'}
                  </span>
                  <span className="flex items-center gap-1 capitalize">
                    ⛽ {truck.fuel_type || 'gasoline'}
                  </span>
                  <span className="capitalize">📦 {truck.size_category?.replace('_', ' ')}</span>
                </div>

                {truck.maintenance_notes && !isEditing && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">{truck.maintenance_notes}</p>
                )}

                {/* Edit form */}
                {isEditing ? (
                  <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Current Mileage (mi)</label>
                        <Input
                          type="number"
                          value={editForm.current_mileage}
                          onChange={(e) => setEditForm({ ...editForm, current_mileage: e.target.value })}
                          placeholder="0"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Last Maintenance</label>
                        <Input
                          type="date"
                          value={editForm.last_maintenance_date}
                          onChange={(e) => setEditForm({ ...editForm, last_maintenance_date: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Next Maintenance Due</label>
                      <Input
                        type="date"
                        value={editForm.next_maintenance_date}
                        onChange={(e) => setEditForm({ ...editForm, next_maintenance_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Maintenance Notes</label>
                      <Textarea
                        value={editForm.maintenance_notes}
                        onChange={(e) => setEditForm({ ...editForm, maintenance_notes: e.target.value })}
                        placeholder="Oil change, brake inspection, tire rotation, etc."
                        className="mt-1 min-h-[60px]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(truck.id)} className="bg-emerald-500 hover:bg-emerald-600" aria-label="Save maintenance record">
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} aria-label="Cancel editing">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleEdit(truck)} className="min-h-[36px]" aria-label="Update maintenance record for this truck">
                    <Wrench size={14} className="mr-1" /> Update Maintenance
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {(trucks || []).length >= truckLimit && (
        <Button variant="outline" size="sm" className="w-full mt-3 min-h-[44px]" onClick={() => setTruckLimit((l) => l + 50)} aria-label="Load more trucks">
          Load more trucks
        </Button>
      )}
    </div>
  );
}