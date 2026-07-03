import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, MapPin, Calendar, Loader2 } from 'lucide-react';
import moment from 'moment';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  quoted: 'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function MyMoves() {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.MoveRequest.list('-created_date', 50)
      .then(setMoves)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">My Moves</h1>
          <p className="text-gray-500 text-sm">Track all your move requests.</p>
        </div>
        <Link to="/new-move">
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            <Plus size={16} className="mr-1" /> New Move
          </Button>
        </Link>
      </div>

      {moves.length === 0 ? (
        <div className="text-center py-20 bg-white border rounded-2xl">
          <Package className="mx-auto text-gray-300 mb-3" size={48} />
          <h3 className="font-display font-bold text-lg mb-1">No moves yet</h3>
          <p className="text-gray-500 text-sm mb-4">Start your first move request to see it here.</p>
          <Link to="/new-move">
            <Button className="bg-emerald-500 hover:bg-emerald-600">Start a Move</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {moves.map(move => (
            <Link key={move.id} to={`/move/${move.id}`} className="block bg-white border rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold">${move.total_price?.toFixed(2)}</span>
                    <Badge className={STATUS_COLORS[move.status] || 'bg-gray-100'}>{move.status?.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    <Calendar size={12} className="inline mr-1" />
                    {moment(move.move_date).format('MMM D, YYYY')}
                    {move.move_time && ` at ${move.move_time}`}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{move.truck_size_needed}</span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p className="flex items-center gap-2"><MapPin size={14} className="text-emerald-500" /> {move.pickup_address}</p>
                <p className="flex items-center gap-2"><MapPin size={14} className="text-red-400" /> {move.dropoff_address}</p>
              </div>
              {move.assigned_driver_name && (
                <p className="mt-2 text-xs text-gray-500">Driver: <span className="font-medium">{move.assigned_driver_name}</span></p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}