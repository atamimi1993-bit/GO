import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Trophy, Star, Gift, TrendingUp } from 'lucide-react';

const TIERS = [
  { name: 'Bronze', min: 0, max: 499, color: 'from-amber-700 to-amber-900', icon: '🥉', perks: ['5% off next move promo code'] },
  { name: 'Silver', min: 500, max: 1999, color: 'from-slate-400 to-slate-600', icon: '🥈', perks: ['10% off next move', 'Priority customer support'] },
  { name: 'Gold', min: 2000, max: 4999, color: 'from-yellow-500 to-amber-600', icon: '🥇', perks: ['15% off next move', 'Free moving boxes', 'Priority scheduling'] },
  { name: 'Platinum', min: 5000, max: Infinity, color: 'from-violet-500 to-purple-700', icon: '💎', perks: ['20% off all moves', 'Free premium insurance', 'Dedicated move coordinator', 'Free storage for 1 month'] },
];

function getTier(points) {
  return TIERS.find((t) => points >= t.min && points <= t.max) || TIERS[0];
}

function getNextTier(points) {
  return TIERS.find((t) => points < t.min) || null;
}

export default function LoyaltyCard() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        if (!user?.email) { setLoading(false); return; }
        const accounts = await base44.entities.LoyaltyAccount.filter({ user_email: user.email });
        setAccount(accounts[0] || null);
      } catch {
        setAccount(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-6 mt-4 flex justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  const points = account?.total_points || 0;
  const movesCompleted = account?.moves_completed || 0;
  const tier = getTier(points);
  const nextTier = getNextTier(points);
  const progress = nextTier ? Math.min(100, ((points - tier.min) / (nextTier.min - tier.min)) * 100) : 100;
  const pointsToNext = nextTier ? nextTier.min - points : 0;

  return (
    <div className="mt-4 space-y-4">
      {/* Loyalty summary card */}
      <div className={`bg-gradient-to-br ${tier.color} rounded-2xl p-6 text-white shadow-lg`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={20} />
            <h2 className="font-display font-bold text-lg">GO Rewards</h2>
          </div>
          <span className="text-2xl">{tier.icon}</span>
        </div>
        <div className="text-center py-2">
          <p className="text-4xl font-bold font-display">{points.toLocaleString()}</p>
          <p className="text-sm text-white/80 mt-1">Loyalty Points</p>
        </div>
        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-white/90" />
            <span className="font-semibold">{tier.name} Member</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-white/90" />
            <span>{movesCompleted} {movesCompleted === 1 ? 'move' : 'moves'} completed</span>
          </div>
        </div>
        {nextTier && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span>Progress to {nextTier.name}</span>
              <span>{pointsToNext.toLocaleString()} pts to go</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Tier perks */}
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gift size={16} className="text-primary" />
          <h3 className="font-display font-bold text-sm">Your {tier.name} Rewards</h3>
        </div>
        <ul className="space-y-2">
          {tier.perks.map((perk, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">✓</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
        {nextTier && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Complete {pointsToNext.toLocaleString()} more points to reach <span className="font-semibold text-foreground">{nextTier.name}</span> and unlock:
            </p>
            <ul className="mt-2 space-y-1.5">
              {nextTier.perks.map((perk, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground/70">
                  <span className="mt-0.5">🔒</span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* How to earn */}
      <div className="bg-card border rounded-2xl p-5">
        <h3 className="font-display font-bold text-sm mb-2">How You Earn Points</h3>
        <p className="text-sm text-muted-foreground">
          Earn <span className="font-semibold text-foreground">1 point for every $1</span> spent on completed moves. Points are automatically credited to your account when your move is marked complete.
        </p>
      </div>
    </div>
  );
}