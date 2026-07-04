import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MapPin, Clock, RotateCw, Loader2, Package } from 'lucide-react';

const ACTIVE_STATUSES = ['accepted', 'in_progress', 'quoted', 'pending'];

export default function CustomerQuickActions() {
  const [user, setUser] = useState(null);
  const [activeMove, setActiveMove] = useState(null);
  const [pastMove, setPastMove] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    setLoading(true);
    base44.entities.MoveRequest.filter({ customer_email: user.email }, '-created_date', 50)
      .then((moves) => {
        const active = moves.find((m) => ACTIVE_STATUSES.includes(m.status));
        const past = moves.find((m) => m.status === 'completed');
        setActiveMove(active || null);
        setPastMove(past || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.email]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="animate-spin" size={16} /> Loading your moves…
      </div>
    );
  }

  if (!user || (!activeMove && !pastMove)) {
    return (
      <Link
        to="/new-move"
        className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all"
      >
        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Package className="text-emerald-600" size={20} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Book your first move</p>
          <p className="text-xs text-muted-foreground">Get an instant quote in minutes.</p>
        </div>
        <RotateCw className="text-muted-foreground" size={18} />
      </Link>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {activeMove ? (
        <Link
          to={`/move/${activeMove.id}`}
          className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Clock className="text-blue-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Track Your Move</p>
            <p className="text-xs text-muted-foreground truncate">
              <MapPin size={12} className="inline mr-1" />
              {activeMove.pickup_address?.split(',')[0]} → {activeMove.dropoff_address?.split(',')[0]}
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600">View →</span>
        </Link>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-border bg-muted/30">
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
            <Clock className="text-muted-foreground" size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm text-muted-foreground">No active move</p>
            <p className="text-xs text-muted-foreground">Book a move to track it here.</p>
          </div>
        </div>
      )}

      {pastMove ? (
        <Link
          to={`/new-move?rebook=${pastMove.id}`}
          className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <RotateCw className="text-emerald-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Re-book Past Job</p>
            <p className="text-xs text-muted-foreground truncate">
              <MapPin size={12} className="inline mr-1" />
              {pastMove.pickup_address?.split(',')[0]} → {pastMove.dropoff_address?.split(',')[0]}
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-600">Re-book →</span>
        </Link>
      ) : (
        <Link
          to="/new-move"
          className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Package className="text-emerald-600" size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm">Start a New Move</p>
            <p className="text-xs text-muted-foreground">Get an instant quote.</p>
          </div>
        </Link>
      )}
    </div>
  );
}