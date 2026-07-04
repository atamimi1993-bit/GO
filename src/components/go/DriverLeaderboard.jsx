import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Trophy, Truck, MapPin, Award, TrendingUp, Loader2, Medal, BadgeCheck } from 'lucide-react';
import PullToRefresh from '@/components/go/PullToRefresh';

const MEDAL_COLORS = {
  1: 'from-amber-400 to-yellow-600',
  2: 'from-slate-300 to-slate-500',
  3: 'from-orange-400 to-amber-700',
};

const RANK_BADGE = {
  1: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: Trophy },
  2: { bg: 'bg-slate-400/10', text: 'text-slate-500 dark:text-slate-300', icon: Medal },
  3: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', icon: Award },
};

export default function DriverLeaderboard() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRankings = async () => {
    try {
      const res = await base44.functions.invoke('driver-rankings', {});
      setRankings(res.data?.rankings || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load rankings');
    }
    setLoading(false);
  };

  useEffect(() => { loadRankings(); }, []);

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>{error}</p>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Trophy className="mx-auto mb-3 opacity-40" size={40} />
        <p className="font-medium">No ranked drivers yet</p>
        <p className="text-sm mt-1">Driver rankings will appear here once moves are completed and rated.</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadRankings}>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="text-center pt-2">
          <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
            <Trophy className="text-amber-500" /> Driver Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top-performing drivers ranked by customer ratings and completed moves
          </p>
        </div>

        {/* Podium */}
        {top3.length > 0 && (
          <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
            {podiumOrder.map((driver) => {
              const RankIcon = RANK_BADGE[driver.rank]?.icon || Award;
              return (
                <div
                  key={driver.id}
                  className={`flex flex-col items-center ${driver.rank === 1 ? 'order-2' : driver.rank === 2 ? 'order-1' : 'order-3'}`}
                >
                  {/* Avatar */}
                  <div className="relative mb-2">
                    {driver.profile_photo_url ? (
                      <img
                        src={driver.profile_photo_url}
                        alt={driver.full_name}
                        className={`rounded-full object-cover border-4 border-card shadow-lg ${
                          driver.rank === 1 ? 'w-20 h-20 md:w-24 md:h-24' : 'w-16 h-16 md:w-20 md:h-20'
                        }`}
                      />
                    ) : (
                      <div
                        className={`rounded-full bg-gradient-to-br ${MEDAL_COLORS[driver.rank]} flex items-center justify-center text-white font-bold border-4 border-card shadow-lg ${
                          driver.rank === 1 ? 'w-20 h-20 md:w-24 md:h-24 text-2xl' : 'w-16 h-16 md:w-20 md:h-20 text-xl'
                        }`}
                      >
                        {driver.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div
                      className={`absolute -bottom-1 -right-1 w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br ${MEDAL_COLORS[driver.rank]} flex items-center justify-center text-white shadow-md border-2 border-card`}
                    >
                      <RankIcon size={14} />
                    </div>
                  </div>

                  {/* Info card */}
                  <div
                    className={`w-full rounded-2xl p-3 md:p-4 text-center ${
                      driver.rank === 1
                        ? 'bg-amber-500/5 border-2 border-amber-500/20 min-h-[140px] md:min-h-[160px]'
                        : 'bg-card border min-h-[110px] md:min-h-[130px]'
                    }`}
                  >
                    <p className={`font-bold truncate ${driver.rank === 1 ? 'text-sm md:text-base' : 'text-xs md:text-sm'}`}>
                      {driver.full_name}
                    </p>
                    {driver.company_name && (
                      <p className="text-[10px] md:text-xs text-muted-foreground truncate">{driver.company_name}</p>
                    )}
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Star className="fill-amber-400 text-amber-400" size={12} />
                      <span className="text-xs font-bold">{driver.avg_rating.toFixed(1)}</span>
                      <span className="text-[10px] text-muted-foreground">({driver.review_count})</span>
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                      {driver.completed_jobs} {driver.completed_jobs === 1 ? 'move' : 'moves'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rest of the leaderboard */}
        {rest.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-display font-bold text-sm text-muted-foreground px-1">All Drivers</h2>
            {rest.map((driver) => (
              <div
                key={driver.id}
                className="flex items-center gap-3 bg-card border rounded-2xl p-3 md:p-4"
              >
                {/* Rank number */}
                <div className="w-8 md:w-10 text-center shrink-0">
                  <span className="font-bold text-lg md:text-xl text-muted-foreground">{driver.rank}</span>
                </div>

                {/* Avatar */}
                {driver.profile_photo_url ? (
                  <img
                    src={driver.profile_photo_url}
                    alt={driver.full_name}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm md:text-base shrink-0">
                    {driver.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm truncate">{driver.full_name}</p>
                    {driver.cdl_certified && (
                      <BadgeCheck className="text-primary shrink-0" size={14} />
                    )}
                  </div>
                  {driver.service_area && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin size={10} /> {driver.service_area}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs">
                      <Star className="fill-amber-400 text-amber-400" size={11} />
                      <span className="font-semibold">{driver.avg_rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({driver.review_count})</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Truck size={11} /> {driver.completed_jobs}
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</p>
                  <p className="font-bold text-sm text-primary">{driver.score.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info note */}
        <div className="bg-muted/50 rounded-2xl p-4 flex items-start gap-3">
          <TrendingUp className="text-primary shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-xs font-medium">How rankings are calculated</p>
            <p className="text-xs text-muted-foreground mt-1">
              Driver scores are based on average customer ratings (weighted heavily) and the number of successfully completed moves. Ratings are submitted by customers after each move is finished.
            </p>
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}