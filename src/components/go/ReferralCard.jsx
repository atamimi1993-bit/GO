import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Copy, Share2, Gift, Users, Check } from 'lucide-react';

const REFERRAL_BONUS = 500;

function generateReferralCode(email) {
  const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GO-${prefix}${suffix}`;
}

export default function ReferralCard() {
  const [account, setAccount] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        if (!user?.email) { setLoading(false); return; }

        let accounts = await base44.entities.LoyaltyAccount.filter({ user_email: user.email });
        let acct = accounts[0];

        if (!acct) {
          const code = generateReferralCode(user.email);
          acct = await base44.entities.LoyaltyAccount.create({
            user_email: user.email,
            total_points: 0,
            moves_completed: 0,
            referral_code: code,
          });
        } else if (!acct.referral_code) {
          const code = generateReferralCode(user.email);
          acct = await base44.entities.LoyaltyAccount.update(acct.id, { referral_code: code });
        }

        setAccount(acct);

        const refs = await base44.entities.Referral.filter({ referrer_email: user.email });
        setReferrals(refs);
      } catch {
        setAccount(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(account.referral_code);
    setCopied(true);
    toast({ title: 'Code copied!', description: account.referral_code });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/new-move?ref=${account.referral_code}`;
    const shareText = `Use my referral code ${account.referral_code} when you book your move with GO and earn bonus loyalty points!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Get GO Rewards points!', text: shareText, url: shareUrl });
      } catch {}
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast({ title: 'Share link copied!', description: 'Paste it anywhere to invite friends.' });
    }
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-6 mt-4 flex justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!account?.referral_code) return null;

  const completedReferrals = referrals.filter((r) => r.status === 'rewarded').length;
  const totalEarned = referrals.reduce((sum, r) => sum + (r.bonus_points || 0), 0);

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Gift size={20} />
          <h2 className="font-display font-bold text-lg">Refer & Earn</h2>
        </div>
        <p className="text-sm text-white/90 mb-4">
          Share your code with friends. When they complete a move, you earn <strong>{REFERRAL_BONUS} bonus points</strong>!
        </p>
        <div className="bg-white/15 backdrop-blur rounded-xl p-4 border border-white/20">
          <p className="text-xs text-white/70 mb-1">Your Referral Code</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xl font-bold font-display tracking-wider">{account.referral_code}</span>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                onClick={handleCopy}
                className="h-10 w-10 bg-white/20 hover:bg-white/30 text-white border-0"
                aria-label="Copy referral code"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={handleShare}
                className="h-10 w-10 bg-white/20 hover:bg-white/30 text-white border-0"
                aria-label="Share referral code"
              >
                <Share2 size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {referrals.length > 0 && (
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-primary" />
            <h3 className="font-display font-bold text-sm">Your Referrals</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold font-display text-primary">{completedReferrals}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold font-display text-primary">{totalEarned.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Points Earned</p>
            </div>
          </div>
          <div className="space-y-1">
            {referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                <span className="text-muted-foreground truncate mr-2">{r.referred_email}</span>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.status === 'rewarded'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {r.status === 'rewarded' ? `+${r.bonus_points} pts` : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}