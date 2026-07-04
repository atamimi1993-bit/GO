import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Copy, Share2, Gift, Users, Check, Truck } from 'lucide-react';

const DRIVER_REFERRAL_BONUS = 250;

export default function DriverReferralCard({ driverProfile }) {
  const [referralCode, setReferralCode] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      if (!driverProfile?.id) { setLoading(false); return; }
      try {
        let code = driverProfile.referral_code;
        if (!code) {
          const prefix = (driverProfile.full_name || 'DRV').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
          const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
          code = `GO-DRV-${prefix}${suffix}`;
          const updated = await base44.entities.DriverProfile.update(driverProfile.id, { referral_code: code });
          setReferralCode(updated.referral_code);
        } else {
          setReferralCode(code);
        }

        try {
          const refs = await base44.entities.Referral.filter({ referrer_email: driverProfile.email });
          setReferrals(refs);
        } catch {}
      } catch {
        setReferralCode(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [driverProfile?.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast({ title: 'Code copied!', description: referralCode });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/drivers-wanted?ref=${referralCode}`;
    const shareText = `Join GO as a driver and earn on your own schedule! Use my referral code ${referralCode} to get started. Complete your first job and we both earn a $${DRIVER_REFERRAL_BONUS} bonus!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Drive with GO', text: shareText, url: shareUrl });
      } catch {}
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast({ title: 'Share link copied!', description: 'Paste it anywhere to invite drivers.' });
    }
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-6 mb-6 flex justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!referralCode) return null;

  const completedReferrals = referrals.filter((r) => r.status === 'rewarded').length;

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Truck size={20} />
        <h2 className="font-display font-bold text-lg">Refer a Driver, Earn ${DRIVER_REFERRAL_BONUS}</h2>
      </div>
      <p className="text-sm text-white/90 mb-4">
        Share your code with other drivers. When they complete their first job, you both earn a <strong>${DRIVER_REFERRAL_BONUS} bonus</strong>!
      </p>
      <div className="bg-white/15 backdrop-blur rounded-xl p-4 border border-white/20">
        <p className="text-xs text-white/70 mb-1">Your Driver Referral Code</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xl font-bold font-display tracking-wider">{referralCode}</span>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={handleCopy}
              className="h-10 w-10 bg-white/20 hover:bg-white/30 text-white border-0"
              aria-label="Copy driver referral code"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={handleShare}
              className="h-10 w-10 bg-white/20 hover:bg-white/30 text-white border-0"
              aria-label="Share driver referral code"
            >
              <Share2 size={16} />
            </Button>
          </div>
        </div>
      </div>

      {referrals.length > 0 && (
        <div className="flex items-center gap-2 mt-3 text-sm text-white/80">
          <Users size={14} /> {completedReferrals} driver{completedReferrals !== 1 ? 's' : ''} referred · {referrals.length} total invites
        </div>
      )}
    </div>
  );
}