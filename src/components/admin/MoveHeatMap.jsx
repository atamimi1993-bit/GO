import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Loader2, MapPin, Flame } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = [
  { key: 'early', label: '6–9 AM', start: 6, end: 9 },
  { key: 'morning', label: '9 AM–12 PM', start: 9, end: 12 },
  { key: 'midday', label: '12–3 PM', start: 12, end: 15 },
  { key: 'afternoon', label: '3–6 PM', start: 15, end: 18 },
  { key: 'evening', label: '6–9 PM', start: 18, end: 21 },
  { key: 'night', label: '9 PM–12 AM', start: 21, end: 24 },
];

// Parses move_time ("HH:MM" or "h:mm AM/PM") and returns 24h hour
function parseHour(moveTime) {
  if (!moveTime) return null;
  const str = String(moveTime).trim().toUpperCase();
  let match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) {
    match = str.match(/^(\d{1,2})\s*(AM|PM)?$/);
    if (!match) return null;
  }
  let h = parseInt(match[1], 10);
  const period = match[3] || match[2];
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h;
}

function getSlotKey(hour) {
  if (hour == null) return null;
  for (const slot of TIME_SLOTS) {
    if (hour >= slot.start && hour < slot.end) return slot.key;
  }
  return null;
}

// Extracts a city/state label from an address
function getLocationLabel(address) {
  if (!address) return 'Unknown';
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(', ');
  if (parts.length === 1) return parts[0];
  return address.slice(0, 30);
}

function getIntensity(count, max) {
  if (max === 0 || count === 0) return 0;
  return Math.min(1, count / max);
}

const HEAT_COLORS = [
  'bg-muted/50',
  'bg-emerald-500/20',
  'bg-emerald-500/40',
  'bg-emerald-500/60',
  'bg-emerald-500/80',
  'bg-emerald-500',
];

function getHeatClass(intensity) {
  if (intensity === 0) return HEAT_COLORS[0];
  if (intensity <= 0.2) return HEAT_COLORS[1];
  if (intensity <= 0.4) return HEAT_COLORS[2];
  if (intensity <= 0.6) return HEAT_COLORS[3];
  if (intensity <= 0.8) return HEAT_COLORS[4];
  return HEAT_COLORS[5];
}

export default function MoveHeatMap() {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.MoveRequest.list('-created_date', 200);
      setMoves(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  // Build time × day heatmap grid
  const grid = {};
  for (const slot of TIME_SLOTS) {
    grid[slot.key] = {};
    for (const day of DAYS) {
      grid[slot.key][day] = 0;
    }
  }

  let hasTimeData = false;
  for (const m of moves) {
    if (!m.move_date) continue;
    const date = new Date(m.move_date);
    if (isNaN(date.getTime())) continue;
    const dayLabel = DAYS[date.getDay()];
    const hour = parseHour(m.move_time);
    const slotKey = getSlotKey(hour);
    if (slotKey) {
      grid[slotKey][dayLabel]++;
      hasTimeData = true;
    } else if (!m.move_time) {
      // Fallback: use created_date hour if no move_time
      const created = new Date(m.created_date);
      if (!isNaN(created.getTime())) {
        const fallbackHour = created.getHours();
        const fallbackSlot = getSlotKey(fallbackHour);
        if (fallbackSlot) {
          grid[fallbackSlot][dayLabel]++;
          hasTimeData = true;
        }
      }
    }
  }

  const maxCount = Math.max(
    ...TIME_SLOTS.flatMap((slot) => DAYS.map((day) => grid[slot.key][day])),
    1
  );

  // Build location demand list
  const locationMap = {};
  for (const m of moves) {
    const loc = getLocationLabel(m.pickup_address);
    if (!locationMap[loc]) locationMap[loc] = { count: 0, revenue: 0 };
    locationMap[loc].count++;
    locationMap[loc].revenue += Number(m.total_price) || 0;
  }

  const topLocations = Object.entries(locationMap)
    .map(([loc, data]) => ({ location: loc, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const maxLocCount = topLocations[0]?.count || 1;

  return (
    <div>
      {/* Peak Moving Times Heatmap */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-orange-500" />
          <h3 className="font-display font-bold text-sm">Peak Moving Times</h3>
          <span className="text-xs text-muted-foreground ml-auto">Moves by day & time slot</span>
        </div>

        {hasTimeData ? (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                {/* Header row */}
                <div className="flex">
                  <div className="w-24 shrink-0" />
                  {DAYS.map((day) => (
                    <div key={day} className="flex-1 text-center text-xs font-medium text-muted-foreground pb-2">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Grid rows */}
                {TIME_SLOTS.map((slot) => (
                  <div key={slot.key} className="flex items-center mb-1.5">
                    <div className="w-24 shrink-0 text-xs text-muted-foreground pr-2 text-right">
                      {slot.label}
                    </div>
                    {DAYS.map((day) => {
                      const count = grid[slot.key][day];
                      const intensity = getIntensity(count, maxCount);
                      return (
                        <div key={day} className="flex-1 px-0.5">
                          <div
                            className={`h-10 rounded-md flex items-center justify-center text-xs font-semibold transition-all ${getHeatClass(intensity)} ${intensity > 0.6 ? 'text-white' : 'text-foreground'}`}
                            title={`${day} ${slot.label}: ${count} move${count !== 1 ? 's' : ''}`}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <span>Less</span>
              {HEAT_COLORS.map((cls, i) => (
                <div key={i} className={`w-4 h-4 rounded ${cls}`} />
              ))}
              <span>More</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No move times recorded yet. The heatmap will populate as moves with scheduled times come in.
          </p>
        )}
      </div>

      {/* High-Demand Locations */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-emerald-500" />
          <h3 className="font-display font-bold text-sm">High-Demand Locations</h3>
        </div>

        {topLocations.length > 0 ? (
          <div className="space-y-2">
            {topLocations.map((loc, i) => {
              const intensity = getIntensity(loc.count, maxLocCount);
              return (
                <div
                  key={loc.location}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${i === 0 ? 'bg-orange-500/5 border-orange-500/30' : 'bg-muted/30 border-border'}`}
                >
                  {i === 0 && <Flame size={16} className="text-orange-500 shrink-0" />}
                  {i !== 0 && (
                    <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{loc.location}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${intensity * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {loc.count} move{loc.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold shrink-0">
                    ${(loc.revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No location data yet. High-demand areas will appear here as moves are booked.
          </p>
        )}
      </div>
    </div>
  );
}