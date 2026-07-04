import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Navigation, Package, Loader2, MapPin } from 'lucide-react';
import PullToRefresh from '@/components/go/PullToRefresh';
import PageHeader from '@/components/go/PageHeader';
import TrackingCard from '@/components/go/TrackingCard';
import LiveTrackingMap from '@/components/go/LiveTrackingMap';

export default function TrackingHub() {
  const { scrollRef } = useOutletContext();
  const [activeMoves, setActiveMoves] = useState([]);
  const [recentMoves, setRecentMoves] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (isRetry = false) => {
    try {
      const moves = await base44.entities.MoveRequest.list('-created_date', 50);
      setActiveMoves(moves.filter((m) => ['accepted', 'in_progress'].includes(m.status)));
      setRecentMoves(moves.filter((m) => m.status === 'completed').slice(0, 3));
    } catch (err) {
      if (String(err.message || '').includes('Rate limit') && !isRetry) {
        await new Promise((r) => setTimeout(r, 2000));
        return load(true);
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    let debounceTimer;
    load().catch(() => {}).finally(() => setLoading(false));
    const unsub = base44.entities.MoveRequest.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => load().catch(() => {}), 800);
      }
    });
    return () => { unsub(); clearTimeout(debounceTimer); };
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <PageHeader title="Tracking Hub" isRoot />
          <p className="text-muted-foreground text-sm">Live status of all your shipments.</p>
        </div>

        {/* Active tracking */}
        <div className="mb-6">
          <h2 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">
            In Transit ({activeMoves.length})
          </h2>
          {activeMoves.length === 0 ? (
            <div className="text-center py-12 bg-card border rounded-2xl">
              <Navigation className="mx-auto text-muted-foreground mb-3" size={40} />
              <p className="font-medium text-sm mb-1">No active shipments</p>
              <p className="text-muted-foreground text-xs">Accepted and in-progress moves will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeMoves.map((move) => (
                <div key={move.id} className="space-y-3">
                  <LiveTrackingMap move={move} />
                  <TrackingCard move={move} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently completed */}
        {recentMoves.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Recently Completed
            </h2>
            <div className="space-y-3">
              {recentMoves.map((move) => (
                <TrackingCard key={move.id} move={move} />
              ))}
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}