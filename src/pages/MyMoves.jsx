import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, MapPin, Calendar, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PullToRefresh from '@/components/go/PullToRefresh';

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  quoted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  accepted: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  completed: 'bg-muted text-foreground',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

export default function MyMoves() {
  const location = useLocation();
  const optimisticMove = location.state?.optimisticMove;
  const [moves, setMoves] = useState(optimisticMove ? [optimisticMove] : []);
  const [loading, setLoading] = useState(!optimisticMove);

  const loadMoves = async () => {
    const moves = await base44.entities.MoveRequest.list('-created_date', 50);
    setMoves(moves);
  };
  useEffect(() => {
    if (!optimisticMove) {
      loadMoves().finally(() => setLoading(false));
    } else {
      setLoading(false);
      loadMoves();
    }
    const unsub = base44.entities.MoveRequest.subscribe((event) => {
      if (event.type === 'create') {
        setMoves((prev) => [event.data, ...prev.filter(m => !m._optimistic)]);
      } else if (event.type === 'update') {
        setMoves((prev) => prev.map(m => m.id === event.data.id ? event.data : m));
        const announcer = document.getElementById('move-status-announcer');
        if (announcer) announcer.textContent = `Move status updated to ${event.data.status?.replace('_', ' ')}`;
      }
    });
    return unsub;
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  }

  return (
    <PullToRefresh onRefresh={loadMoves}>
    <div>
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="move-status-announcer"></div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">My Moves</h1>
          <p className="text-muted-foreground text-sm">Track all your move requests.</p>
        </div>
        <Link to="/new-move">
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            <Plus size={16} className="mr-1" /> New Move
          </Button>
        </Link>
      </div>

      {moves.length === 0 ? (
        <div className="text-center py-20 bg-card border rounded-2xl">
          <Package className="mx-auto text-muted-foreground mb-3" size={48} />
          <h3 className="font-display font-bold text-lg mb-1">No moves yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Start your first move request to see it here.</p>
          <Link to="/new-move">
            <Button className="bg-emerald-500 hover:bg-emerald-600">Start a Move</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {moves.map(move => (
            <Link key={move.id} to={`/move/${move.id}`} className="block bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold">${move.total_price?.toFixed(2)}</span>
                    <Badge className={STATUS_COLORS[move.status] || 'bg-muted'}>{move.status?.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Calendar size={12} className="inline mr-1" />
                    {format(parseISO(move.move_date), 'MMM d, yyyy')}
                    {move.move_time && ` at ${move.move_time}`}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{move.truck_size_needed}</span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><MapPin size={14} className="text-emerald-500" /> {move.pickup_address}</p>
                <p className="flex items-center gap-2"><MapPin size={14} className="text-red-400" /> {move.dropoff_address}</p>
              </div>
              {move.assigned_driver_name && (
                <p className="mt-2 text-xs text-muted-foreground">Driver: <span className="font-medium">{move.assigned_driver_name}</span></p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}