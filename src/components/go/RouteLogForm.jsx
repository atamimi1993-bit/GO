import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Route, Clock, MapPin, Loader2, CheckCircle2, Gauge } from 'lucide-react';
import { format } from 'date-fns';

function toLocalInputValue(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInputValue(localValue) {
  if (!localValue) return null;
  return new Date(localValue).toISOString();
}

export default function RouteLogForm({ move, driverProfile, onSaved }) {
  const [routeLog, setRouteLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [mileage, setMileage] = useState('');
  const [distanceUnit, setDistanceUnit] = useState(move?.distance_unit || 'mi');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const load = async () => {
    try {
      const logs = await base44.entities.RouteLog.filter({ move_request_id: move.id });
      if (logs.length > 0) {
        const log = logs[0];
        setRouteLog(log);
        setStartTime(toLocalInputValue(log.start_time));
        setEndTime(toLocalInputValue(log.end_time));
        setMileage(log.actual_mileage?.toString() || '');
        setDistanceUnit(log.distance_unit || 'mi');
        setNotes(log.notes || '');
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [move.id]);

  const handleSave = async () => {
    if (!startTime || !endTime || !mileage) {
      toast({ title: 'Missing fields', description: 'Start time, end time, and mileage are required.', variant: 'destructive' });
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      toast({ title: 'Invalid times', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        move_request_id: move.id,
        driver_profile_id: driverProfile.id,
        driver_name: driverProfile.full_name,
        start_time: fromLocalInputValue(startTime),
        end_time: fromLocalInputValue(endTime),
        actual_mileage: parseFloat(mileage),
        distance_unit: distanceUnit,
        notes: notes.trim() || undefined,
      };
      if (routeLog) {
        await base44.entities.RouteLog.update(routeLog.id, payload);
      } else {
        const created = await base44.entities.RouteLog.create(payload);
        setRouteLog(created);
      }
      toast({ title: 'Route log saved', description: 'Mileage and timestamps recorded for audit.' });
      if (onSaved) onSaved();
    } catch (err) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  const durationMin = startTime && endTime && new Date(endTime) > new Date(startTime)
    ? Math.round((new Date(endTime) - new Date(startTime)) / 60000)
    : 0;
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;

  return (
    <div className="bg-card border rounded-2xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Route size={18} className="text-emerald-600" />
        <h3 className="font-display font-bold text-sm">Route Mileage & Time Log</h3>
        {routeLog && (
          <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} /> Logged
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs flex items-center gap-1 mb-1">
              <Clock size={12} /> Start Time
            </Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1 mb-1">
              <Clock size={12} /> End Time
            </Label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs flex items-center gap-1 mb-1">
              <Gauge size={12} /> Actual Mileage
            </Label>
            <Input
              type="number"
              step="0.1"
              placeholder="0.0"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Unit</Label>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Set distance unit to miles"
                aria-pressed={distanceUnit === 'mi'}
                onClick={() => setDistanceUnit('mi')}
                className={`flex-1 py-2 min-h-[44px] rounded-md text-sm font-medium border transition-colors ${distanceUnit === 'mi' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-border'}`}
              >
                Miles
              </button>
              <button
                type="button"
                aria-label="Set distance unit to kilometers"
                aria-pressed={distanceUnit === 'km'}
                onClick={() => setDistanceUnit('km')}
                className={`flex-1 py-2 min-h-[44px] rounded-md text-sm font-medium border transition-colors ${distanceUnit === 'km' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-border'}`}
              >
                KM
              </button>
            </div>
          </div>
        </div>

        {durationMin > 0 && (
          <div className="bg-muted rounded-xl p-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock size={14} /> Total Duration
            </span>
            <span className="font-medium">
              {hours > 0 ? `${hours}h ` : ''}{mins}m
            </span>
          </div>
        )}

        <div>
          <Label className="text-xs mb-1 block">Notes (optional)</Label>
          <Textarea
            placeholder="Route conditions, detours, delays..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {routeLog?.created_date && (
          <p className="text-xs text-muted-foreground">
            Log submitted {format(new Date(routeLog.created_date), 'MMM d, yyyy h:mm a')}
          </p>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-emerald-500 hover:bg-emerald-600"
        >
          {saving
            ? <><Loader2 size={16} className="animate-spin mr-1" /> Saving...</>
            : routeLog
              ? <><CheckCircle2 size={16} className="mr-1" /> Update Route Log</>
              : <><Route size={16} className="mr-1" /> Save Route Log</>}
        </Button>
      </div>
    </div>
  );
}