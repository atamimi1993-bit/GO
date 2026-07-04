import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PullToRefresh from '@/components/go/PullToRefresh';
import RatingForm from '@/components/go/RatingForm';
import { formatCurrency } from '@/lib/pricing';
import { DollarSign, TrendingUp, CheckCircle2, Clock, Star, Loader2, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Revenue() {
  const { scrollRef } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);
  const [moves, setMoves] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
      if (profiles.length > 0) setDriverProfile(profiles[0]);
      const allMoves = await base44.entities.MoveRequest.list('-created_date', 200);
      setMoves(allMoves);
      const allRatings = await base44.entities.Rating.list('-created_date', 50);
      setRatings(allRatings);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;

  const isDriver = !!driverProfile;

  // Revenue metrics
  const completedMoves = moves.filter((m) => m.status === 'completed');
  const totalRevenue = completedMoves.reduce((s, m) => s + (m.total_price || 0), 0);
  const collectedRevenue = completedMoves.filter((m) => m.paid).reduce((s, m) => s + (m.total_price || 0), 0);
  const pendingRevenue = totalRevenue - collectedRevenue;

  // Revenue by job type
  const revenueByType = ['residential', 'freight', 'corporate_logistics'].map((type) => ({
    type,
    revenue: completedMoves.filter((m) => m.job_type === type).reduce((s, m) => s + (m.total_price || 0), 0),
    count: completedMoves.filter((m) => m.job_type === type).length,
  }));

  // Average platform rating
  const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + (r.stars || 0), 0) / ratings.length : 0;

  // Moves needing ratings
  const ratedMoveIds = new Set(ratings.map((r) => `${r.move_request_id}_${r.direction}_${r.rater_id}`));
  const movesNeedingRating = completedMoves.filter((m) => {
    if (isDriver) {
      return m.assigned_driver_id === driverProfile.id && !ratedMoveIds.has(`${m.id}_driver_to_customer_${user.id}`);
    }
    return m.created_by_id === user.id && !ratedMoveIds.has(`${m.id}_customer_to_driver_${user.id}`);
  });

  // Recent ratings (for this user)
  const myRatings = ratings.filter((r) => {
    if (isDriver) return r.direction === 'driver_to_customer' && r.rater_id === user.id;
    return r.direction === 'customer_to_driver' && r.ratee_id === driverProfile?.id || r.rater_id === user.id;
  }).slice(0, 5);

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, accent: 'text-emerald-600' },
    { label: 'Collected', value: formatCurrency(collectedRevenue), icon: CheckCircle2, accent: 'text-blue-600' },
    { label: 'Pending', value: formatCurrency(pendingRevenue), icon: Clock, accent: 'text-amber-600' },
    { label: 'Avg Rating', value: avgRating.toFixed(1), icon: Star, accent: 'text-yellow-500' },
  ];

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-display font-bold mb-1">Revenue & Reviews</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {isDriver ? 'Track your earnings and rate your customers.' : 'Track your spending and rate your drivers.'}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-card border rounded-2xl p-4 text-center">
              <s.icon className={`mx-auto mb-2 ${s.accent}`} size={22} />
              <p className="text-xl font-display font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Revenue by job type */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" /> Revenue by Job Type
          </h3>
          <div className="space-y-3">
            {revenueByType.map((r) => (
              <div key={r.type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="capitalize font-medium">{r.type.replace('_', ' ')}</span>
                  <span className="text-muted-foreground">{formatCurrency(r.revenue)} · {r.count} jobs</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Moves needing rating */}
        {movesNeedingRating.length > 0 && (
          <div className="mb-6">
            <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
              <Star size={16} className="text-yellow-500" /> Pending Reviews ({movesNeedingRating.length})
            </h3>
            <div className="space-y-3">
              {movesNeedingRating.map((m) => (
                <div key={m.id} className="space-y-2">
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <p className="font-medium">{m.pickup_address} → {m.dropoff_address}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(m.move_date), 'MMM d, yyyy')} · {formatCurrency(m.total_price)}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                        {isDriver ? `Customer: ${m.customer_name || 'N/A'}` : `Driver: ${m.assigned_driver_name || 'N/A'}`}
                      </span>
                    </div>
                  </div>
                  <RatingForm
                    move={m}
                    direction={isDriver ? 'driver_to_customer' : 'customer_to_driver'}
                    raterId={user.id}
                    raterName={isDriver ? driverProfile.full_name : (user.full_name || user.email)}
                    rateeId={isDriver ? (m.created_by_id || '') : (m.assigned_driver_id || '')}
                    rateeName={isDriver ? (m.customer_name || 'Customer') : (m.assigned_driver_name || 'Driver')}
                    onSubmitted={() => setRefreshKey((k) => k + 1)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent reviews */}
        {myRatings.length > 0 && (
          <div className="mb-6">
            <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
              <MessageSquare size={16} className="text-blue-500" /> Recent Reviews
            </h3>
            <div className="space-y-2">
              {myRatings.map((r) => (
                <div key={r.id} className="bg-card border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {r.direction === 'customer_to_driver' ? `Driver: ${r.ratee_name}` : `Customer: ${r.ratee_name}`}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={14}
                          className={n <= (r.stars || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}
                        />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground select-text">"{r.comment}"</p>}
                  <p className="text-xs text-muted-foreground mt-1">{format(parseISO(r.created_date), 'MMM d, yyyy')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}