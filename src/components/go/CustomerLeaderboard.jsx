import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, Star, Gift, TrendingUp, Loader2, Medal, Award, Crown, Sparkles } from 'lucide-react';
import PullToRefresh from '@/components/go/PullToRefresh';

const MEDAL_COLORS = {
  1: 'from-amber-400 to-yellow-600',
  2: 'from-slate-300 to-slate-500',
  3: 'from-orange-400 to-amber-700',
};

const TIER_INFO = {
  bronze: { icon: '🥉', color: 'text-amber-700 dark:text-amber-500' },
  silver: { icon: '🥈', color: 'text-slate-500 dark:text-slate-300' },
  gold: { icon: '🥇', color: 'text-yellow-600 dark:text-yellow-400' },
  platinum: { icon: '💎', color: 'text-violet-600 dark:text-violet-400' },
};

function getTier(points) {
  if (points >= 5000) return 'platinum';
  if (points >= 2000) return 'gold';
  if (points >= 500) return 'silver';
  return 'bronze';
}

function maskName(name) {
  if (!name) return 'Anonymous Mover';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0) + '***';
  return parts[0].charAt(0) + '*** ' + parts[parts.length - 1].charAt(0) + '.';
}

export default function CustomerLeaderboard({ scrollRef }) {
  const [rankings, setRankings] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRankings = async () => {
    try {
      const user = await base44.auth.me().catch(() => null);
      setCurrentUser(user);

      const accounts = await base44.entities.LoyaltyAccount.list('-total_points', 50);
      const sorted = accounts
        .filter((a) => (a.total_points || 0) > 0)
        .map((a, idx) => ({
          ...a,
          rank: idx + 1,
          tier: getTier(a.total_points || 0),
        }));

      // Try to get names from MoveRequests
      const moves = await base44.entities.MoveRequest.list('-created_date', 50).catch(() => []);
      const nameMap = {};
      for (const m of moves) {
        if (m.customer_email && m.customer_name && !nameMap[m.customer_email]) {
          nameMap[m.customer_email] = m.customer_name;
        }
      }
      const enriched = sorted.map((a) => ({
        ...a,
        display_name: nameMap[a.user_email] || null,
      }));

      setRankings(enriched);
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
  const myRank = currentUser?.email
    ? rankings.find((r) => r.user_email === currentUser.email)
    : null;

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
        <p className="font-medium">No rankings yet</p>
        <p className="text-sm mt-1">Complete a move to start earning points and climb the leaderboard!</p>
      </div>
    );
  }

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={loadRankings}>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="text-center pt-2">
          <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
            <Crown className="text-amber-500" /> GO Rewards Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top movers ranked by loyalty points earned from completed moves
          </p>
        </div>

        {/* Your rank highlight card */}
        {myRank && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                  {myRank.rank <= 3 ? TIER_INFO[myRank.tier].icon : myRank.rank}
                </div>
                <div>
                  <p className="text-xs text-white/80">Your Rank</p>
                  <p className="font-bold text-lg">
                    #{myRank.rank} {myRank.rank === 1 ? '— Champion!' : myRank.rank <= 3 ? '— Podium!' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/80">Total Points</p>
                <p className="font-bold text-2xl font-display">{(myRank.total_points || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-white/90">
              <Star size={12} className="fill-white" />
              <span>{myRank.moves_completed || 0} {myRank.moves_completed === 1 ? 'move' : 'moves'} completed</span>
              <span className="mx-1">•</span>
              <span className="capitalize">{TIER_INFO[myRank.tier].icon} {myRank.tier} Member</span>
            </div>
          </div>
        )}

        {/* Podium */}
        {top3.length > 0 && (
          <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
            {podiumOrder.map((entry) => {
              const tierIcon = TIER_INFO[entry.tier]?.icon;
              return (
                <div
                  key={entry.id}
                  className={`flex flex-col items-center ${entry.rank === 1 ? 'order-2' : entry.rank === 2 ? 'order-1' : 'order-3'}`}
                >
                  {/* Avatar */}
                  <div className="relative mb-2">
                    <div
                      className={`rounded-full bg-gradient-to-br ${MEDAL_COLORS[entry.rank]} flex items-center justify-center text-white font-bold border-4 border-card shadow-lg ${
                        entry.rank === 1 ? 'w-20 h-20 md:w-24 md:h-24 text-2xl' : 'w-16 h-16 md:w-20 md:h-20 text-xl'
                      }`}
                    >
                      {tierIcon}
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br ${MEDAL_COLORS[entry.rank]} flex items-center justify-center text-white shadow-md border-2 border-card`}
                    >
                      {entry.rank === 1 ? <Crown size={14} /> : entry.rank === 2 ? <Medal size={14} /> : <Award size={14} />}
                    </div>
                  </div>

                  {/* Info card */}
                  <div
                    className={`w-full rounded-2xl p-3 md:p-4 text-center ${
                      entry.rank === 1
                        ? 'bg-amber-500/5 border-2 border-amber-500/20 min-h-[140px] md:min-h-[160px]'
                        : 'bg-card border min-h-[110px] md:min-h-[130px]'
                    }`}
                  >
                    <p className={`font-bold truncate ${entry.rank === 1 ? 'text-sm md:text-base' : 'text-xs md:text-sm'}`}>
                      {maskName(entry.display_name)}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Sparkles size={12} className="text-amber-400" />
                      <span className="text-xs font-bold capitalize">{entry.tier}</span>
                    </div>
                    <p className={`font-display font-bold ${entry.rank === 1 ? 'text-xl md:text-2xl' : 'text-lg'} text-primary mt-1`}>
                      {(entry.total_points || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      {entry.moves_completed || 0} {entry.moves_completed === 1 ? 'move' : 'moves'}
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
            <h2 className="font-display font-bold text-sm text-muted-foreground px-1">All Movers</h2>
            {rest.map((entry) => {
              const isMe = currentUser?.email === entry.user_email;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 rounded-2xl p-3 md:p-4 ${
                    isMe
                      ? 'bg-emerald-500/10 border-2 border-emerald-500/30'
                      : 'bg-card border'
                  }`}
                >
                  {/* Rank number */}
                  <div className="w-8 md:w-10 text-center shrink-0">
                    <span className="font-bold text-lg md:text-xl text-muted-foreground">{entry.rank}</span>
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
                    {TIER_INFO[entry.tier]?.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {maskName(entry.display_name)}
                      {isMe && <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">(You)</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs">
                        <Star className="fill-amber-400 text-amber-400" size={11} />
                        <span className="font-semibold capitalize">{entry.tier}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp size={11} /> {entry.moves_completed || 0} moves
                      </span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Points</p>
                    <p className="font-bold text-sm text-primary">{(entry.total_points || 0).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Motivation card */}
        {!myRank && (
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg text-center">
            <Gift size={24} className="mx-auto mb-2" />
            <p className="font-bold">You haven't earned points yet!</p>
            <p className="text-sm text-white/90 mt-1">Complete your first move to start climbing the leaderboard and earning rewards.</p>
          </div>
        )}

        {/* Info note */}
        <div className="bg-muted/50 rounded-2xl p-4 flex items-start gap-3">
          <Star className="text-amber-400 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-xs font-medium">How to climb the ranks</p>
            <p className="text-xs text-muted-foreground mt-1">
              Earn 1 point for every $1 spent on completed moves. Refer friends for 500 bonus points each. Climb through Bronze, Silver, Gold, and Platinum tiers to unlock exclusive perks.
            </p>
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}