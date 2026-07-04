import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Detects the current user's state from their driver profile (service_area)
 * or most recent move request (pickup_state).
 * Returns { userState } — a state string (e.g. "TX") or null if not found.
 */
export function useUserState() {
  const [userState, setUserState] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try driver profile first (drivers have service_area)
      try {
        const profiles = await base44.entities.DriverProfile.list('-created_date', 1);
        if (!cancelled && profiles.length > 0 && profiles[0].service_area) {
          const area = profiles[0].service_area.trim();
          const parts = area.split(',');
          const statePart = parts[parts.length - 1].trim();
          if (statePart) {
            setUserState(statePart.toUpperCase());
            return;
          }
        }
      } catch {}

      // Fall back to most recent move request pickup_state (customers)
      try {
        const moves = await base44.entities.MoveRequest.list('-created_date', 1);
        if (!cancelled && moves.length > 0 && moves[0].pickup_state) {
          setUserState(moves[0].pickup_state.toUpperCase().trim());
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  return { userState };
}