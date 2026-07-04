import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Trophy, Truck, Loader2, Medal, Award } from 'lucide-react';

const RANK_STYLE = {
  1: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: Trophy },
  2: { bg: 'bg-slate-400/10', text: 'text-slate-500 dark:text-slate-300', icon: Medal },
  3: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', icon: Award },
};

export default function DriverLeaderboardCard({ currentDriverId }) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('driver-rankings', {})
      .then((res) => setRankings(res.data?.rankings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={20} className="text-amber-500" />
          <h2 className="font-display font-bold text-lg">Driver Leaderboard</h2>
        </div>
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={20} className="text-amber-500" />
          <h2 className="font-display font-bold text-lg">Driver Leaderboard</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Rankings will appear once moves are completed and rated.
        </p>
      </div>
    );
  }

  // Show top 5, plus current driver's rank if outside top 5
  const top5 = rankings.slice(0, 5);
  const myRank = currentDriverId
    ? rankings.find((d) => d.id === currentDriverId)
    : null;
  const showMyRank = myRank && myRank.rank > 5;

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={20} className="text-amber-500" />
        <h2 className="font-display font-bold text-lg">Driver Leaderboard</h2>
      </div>

      <div className="space-y-2">
        {top5.map((driver) => {
          const isMe = driver.id === currentDriverId;
          const rankStyle = RANK_STYLE[driver.rank];
          const RankIcon = rankStyle?.icon;

          return (
            <div
              key={driver.id}
              className={`flex items-center gap-3 rounded-xl p-2.5 ${
                isMe ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-muted/40'
              }`}
            >
              {/* Rank */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${rankStyle?.bg || 'bg-muted'}`}>
                {RankIcon ? (
                  <RankIcon size={14} className={rankStyle.text} />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">{driver.rank}</span>
                )}
              </div>

              {/* Avatar */}
              {driver.profile_photo_url ? (
                <img
                  src={driver.profile_photo_url}
                  alt={driver.full_name}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {driver.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}

              {/* Name + tag */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {driver.full_name}
                  {isMe && <span className="text-emerald-600 dark:text-emerald-400 ml-1 text-xs">(You)</span>}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Star className="fill-amber-400 text-amber-400" size={10} />
                    {driver.avg_rating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Truck size={10} /> {driver.completed_jobs}
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</p>
                <p className="font-bold text-sm text-primary">{driver.score.toFixed(1)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current driver's rank if outside top 5 */}
      {showMyRank && (
        <>
          <div className="flex items-center gap-2 py-1.5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Your Rank</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex items-center gap-3 rounded-xl p-2.5 bg-emerald-500/5 border border-emerald-500/20">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-muted">
              <span className="text-xs font-bold text-muted-foreground">{myRank.rank}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {myRank.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {myRank.full_name} <span className="text-emerald-600 dark:text-emerald-400 text-xs">(You)</span>
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Star className="fill-amber-400 text-amber-400" size={10} />
                  {myRank.avg_rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-0.5">
                  <Truck size={10} /> {myRank.completed_jobs}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</p>
              <p className="font-bold text-sm text-primary">{myRank.score.toFixed(1)}</p>
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground text-center mt-3">
        Ranked by average rating and completed moves
      </p>
    </div>
  );
}