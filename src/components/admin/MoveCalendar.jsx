import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2,
  Truck, MapPin, X,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, parseISO } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  quoted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-500/30',
  accepted: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-purple-500/30',
  completed: 'bg-muted text-foreground border-border',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
};

const DAY_CAPACITY = 5; // moves per day considered "fully booked"

export default function MoveCalendar({ scrollRef }) {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [moves, setMoves] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const load = async () => {
      try {
        const [allMoves, allDrivers] = await Promise.all([
          base44.entities.MoveRequest.list('-created_date', 500),
          base44.entities.DriverProfile.list('-created_date', 500),
        ]);
        setMoves(allMoves);
        setDrivers(allDrivers);
      } catch (err) {
        toast({ title: 'Failed to load calendar', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  // Group moves by date string
  const movesByDate = useMemo(() => {
    const map = {};
    for (const m of moves) {
      if (!m.move_date) continue;
      const key = format(parseISO(m.move_date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  }, [moves]);

  const monthMoves = useMemo(() => {
    return Object.entries(movesByDate)
      .filter(([key]) => isSameMonth(parseISO(key), currentMonth))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [movesByDate, currentMonth]);

  const approvedDriverCount = (drivers || []).filter((d) => d.status === 'approved').length;
  const capacity = Math.max(DAY_CAPACITY, approvedDriverCount);

  // Build calendar days for the current month view (includes padding from adjacent months)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekChunks = [];
  for (let i = 0; i < days.length; i += 7) {
    weekChunks.push(days.slice(i, i + 7));
  }

  const today = new Date();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDayMoves = (day) => {
    const key = format(day, 'yyyy-MM-dd');
    return movesByDate[key] || [];
  };

  const getDayStatus = (day) => {
    const dayMoves = getDayMoves(day).filter((m) => m.status !== 'cancelled');
    if (dayMoves.length === 0) return 'open';
    if (dayMoves.length >= capacity) return 'full';
    return 'partial';
  };

  const handlePrev = () => setCurrentMonth((d) => addMonths(d, -1));
  const handleNext = () => setCurrentMonth((d) => addMonths(d, 1));
  const handleToday = () => { setCurrentMonth(new Date()); setSelectedDay(null); };

  const selectedDayMoves = selectedDay ? getDayMoves(selectedDay).sort((a, b) => (a.move_time || '').localeCompare(b.move_time || '')) : [];

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon size={20} className="text-primary" />
          <h2 className="font-display font-bold text-lg">Move Calendar</h2>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarIcon size={20} className="text-primary" />
          <h2 className="font-display font-bold text-lg">Move Calendar</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="min-h-[44px]" onClick={handleToday}>Today</Button>
          <Button size="icon" variant="outline" className="min-h-[44px] min-w-[44px]" onClick={handlePrev}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button size="icon" variant="outline" className="min-h-[44px] min-w-[44px]" onClick={handleNext}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Open ({'< ' + capacity} moves)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Partially booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Fully booked ({capacity}+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Truck size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground">Capacity: {capacity} moves/day ({approvedDriverCount} drivers)</span>
        </div>
      </div>

      {/* Calendar grid — desktop view */}
      <div className="hidden sm:block overflow-x-auto -mx-2 px-2">
        <div role="grid" className="min-w-[640px] space-y-1">
          {/* Weekday headers */}
          <div role="row" className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => (
              <div role="columnheader" key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells grouped by week */}
          {weekChunks.map((week, wi) => (
            <div role="row" key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day) => {
                const inMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, today);
                const dayMoves = getDayMoves(day).filter((m) => m.status !== 'cancelled');
                const status = getDayStatus(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);

                const dotColor = status === 'full' ? 'bg-red-500' : status === 'partial' ? 'bg-amber-500' : 'bg-emerald-500';
                const cellBorder = isSelected ? 'ring-2 ring-primary' : status === 'full' ? 'border-red-500/30' : status === 'partial' ? 'border-amber-500/30' : 'border-border';

                return (
                  <button
                    role="gridcell"
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    aria-label={`${format(day, 'EEEE, MMMM d')}, ${dayMoves.length} move${dayMoves.length !== 1 ? 's' : ''}, ${getDayStatus(day) === 'full' ? 'fully booked' : getDayStatus(day) === 'partial' ? 'partially booked' : 'open'}`}
                    aria-pressed={isSelected}
                    className={`relative min-h-[80px] p-1.5 rounded-lg border text-left transition-colors hover:bg-muted/50 ${cellBorder} ${!inMonth ? 'opacity-40' : ''} ${isToday ? 'ring-1 ring-primary' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      {dayMoves.length > 0 && (
                        <span className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                          <span className="text-xs font-semibold">{dayMoves.length}</span>
                        </span>
                      )}
                    </div>
                    {/* Move preview dots */}
                    {inMonth && dayMoves.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayMoves.slice(0, 3).map((m) => (
                          <div key={m.id} className={`text-[10px] truncate px-1 py-0.5 rounded ${STATUS_COLORS[m.status] || ''}`}>
                            {m.move_time || 'TBD'} {m.customer_name || ''}
                          </div>
                        ))}
                        {dayMoves.length > 3 && (
                          <p className="text-[10px] text-muted-foreground px-1">+{dayMoves.length - 3} more</p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile card list view */}
      {isMobile && (
        <div className="sm:hidden">
          {monthMoves.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No moves scheduled this month.</p>
          ) : (
            <div className="space-y-4">
              {monthMoves.map(([dateKey, dayMoves]) => {
              const date = parseISO(dateKey);
              const sortedMoves = [...dayMoves].sort((a, b) => (a.move_time || '').localeCompare(b.move_time || ''));
              return (
                <div key={dateKey}>
                  <button
                    onClick={() => setSelectedDay(date)}
                    aria-label={format(date, 'EEEE, MMM d')}
                    className="w-full text-left mb-2 min-h-[44px] flex items-center"
                  >
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {format(date, 'EEEE, MMM d')}
                    </h3>
                  </button>
                  <div className="space-y-2">
                    {sortedMoves.map(m => (
                      <div key={m.id} className="p-3 rounded-xl bg-muted/50 border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{m.move_time || 'Time TBD'}</span>
                          <Badge className={STATUS_COLORS[m.status]}>{m.status?.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{m.pickup_address} → {m.dropoff_address}</p>
                        <p className="text-xs text-muted-foreground">{m.customer_name || 'Unknown'} · {m.assigned_driver_name || 'Unassigned'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      {/* Selected day detail */}
      {selectedDay && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm">
              {format(selectedDay, 'EEEE, MMMM d, yyyy')}
            </h3>
            <Button size="icon" variant="ghost" className="h-11 w-11" onClick={() => setSelectedDay(null)}>
              <X size={16} />
            </Button>
          </div>

          {selectedDayMoves.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <MapPin size={16} /> No moves scheduled for this day.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto overscroll-none">
              {selectedDayMoves.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium">{m.move_time || 'Time TBD'}</span>
                      <Badge className={STATUS_COLORS[m.status]}>{m.status?.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{m.pickup_address} → {m.dropoff_address}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.customer_name || 'Unknown'} · {m.assigned_driver_name || 'Unassigned'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">${(m.total_price || 0).toFixed(2)}</p>
                    {m.paid && <Badge variant="secondary" className="text-xs">Paid</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}