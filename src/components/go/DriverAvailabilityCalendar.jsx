import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';

export default function DriverAvailabilityCalendar({ driverProfile }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(async () => {
    if (!driverProfile) return;
    try {
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const entries = await base44.entities.DriverAvailability.filter({
        driver_profile_id: driverProfile.id,
        date: { $gte: monthStart, $lte: monthEnd },
      });
      setAvailability(entries);
    } catch {}
    setLoading(false);
  }, [driverProfile, currentMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const getEntry = (date) => availability.find((a) => isSameDay(parseISO(a.date), date));

  const toggleDate = async (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = getEntry(date);
    setToggling(dateStr);

    try {
      if (existing) {
        const newStatus = existing.status === 'available' ? 'unavailable' : 'available';
        await base44.entities.DriverAvailability.update(existing.id, {
          status: newStatus,
        });
        setAvailability((prev) =>
          prev.map((a) => (a.id === existing.id ? { ...a, status: newStatus } : a))
        );
      } else {
        const created = await base44.entities.DriverAvailability.create({
          driver_profile_id: driverProfile.id,
          driver_name: driverProfile.full_name,
          date: dateStr,
          status: 'available',
        });
        setAvailability((prev) => [...prev, created]);
      }
    } catch {}
    setToggling(null);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Pad start to align with weekday
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const padding = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const today = new Date();

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={18} className="text-emerald-500" />
        <h3 className="font-display font-bold text-sm">Availability Calendar</h3>
      </div>

      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
          <ChevronLeft size={18} />
        </Button>
        <span className="font-medium text-sm">{format(currentMonth, 'MMMM yyyy')}</span>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight size={18} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={20} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {padding.map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((day) => {
              const entry = getEntry(day);
              const isAvailable = entry?.status === 'available';
              const isPast = day < today && !isSameDay(day, today);
              const dateStr = format(day, 'yyyy-MM-dd');
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => !isPast && toggleDate(day)}
                  disabled={isPast || toggling === dateStr}
                  className={`aspect-square rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                    isPast
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : isAvailable
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {toggling === dateStr ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    format(day, 'd')
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" /> Available
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-muted" /> Unavailable
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Tap a date to toggle availability. Marked-unavailable dates help prevent double-booking.
          </p>
        </>
      )}
    </div>
  );
}