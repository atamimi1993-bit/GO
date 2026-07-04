import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Sparkles, X, Tag } from 'lucide-react';

const COLOR_MAP = {
  emerald: 'from-emerald-600 to-emerald-800',
  blue: 'from-blue-600 to-blue-800',
  amber: 'from-amber-600 to-amber-800',
  rose: 'from-rose-600 to-rose-800',
  violet: 'from-violet-600 to-violet-800',
  cyan: 'from-cyan-600 to-cyan-800',
  orange: 'from-orange-600 to-orange-800',
  indigo: 'from-indigo-600 to-indigo-800',
};

export default function AdBanner({ audience = 'customers' }) {
  const [ads, setAds] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const activeAds = await base44.entities.PromotionalAd.filter({ active: true, audience }, '-created_date', 5);
        // Filter to ads whose campaign window is current
        const now = new Date();
        const valid = activeAds.filter((ad) => {
          const start = ad.campaign_start ? new Date(ad.campaign_start) : null;
          const end = ad.campaign_end ? new Date(ad.campaign_end) : null;
          return (!start || start <= now) && (!end || end >= now);
        });
        setAds(valid);
      } catch {}
    })();
  }, []);

  // Rotate through ads every 6 seconds
  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % ads.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [ads.length]);

  if (dismissed || ads.length === 0) return null;

  const ad = ads[currentIdx];
  if (!ad) return null;

  const gradient = COLOR_MAP[ad.bg_color] || COLOR_MAP.emerald;

  return (
    <div className="relative">
      <Link
        to={ad.cta_link || '/new-move'}
        className={`block bg-gradient-to-r ${gradient} rounded-2xl p-5 md:p-6 text-white shadow-lg hover:shadow-xl transition-all group overflow-hidden`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {ad.promo_code && (
                <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold">
                  <Tag size={10} /> {ad.promo_code}
                </span>
              )}
              {ad.discount_percent > 0 && (
                <span className="text-xs font-bold bg-white/25 rounded-full px-2 py-0.5">
                  {ad.discount_percent}% OFF
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-base md:text-lg leading-tight truncate">{ad.headline}</h3>
            <p className="text-sm text-white/80 truncate">{ad.subtext}</p>
          </div>
          <div className="flex-shrink-0 hidden sm:block">
            <span className="text-sm font-semibold bg-white/20 rounded-lg px-4 py-2 group-hover:bg-white/30 transition-colors">
              {ad.cta_text || 'Claim Offer'} →
            </span>
          </div>
        </div>
      </Link>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 z-20 min-h-[44px] min-w-[44px] rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
        aria-label="Dismiss advertisement"
      >
        <X size={14} className="text-white" />
      </button>

      {/* Dots indicator */}
      {ads.length > 1 && (
        <div role="tablist" aria-label="Advertisement slides" className="flex justify-center gap-1.5 mt-2">
          {ads.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === currentIdx}
              aria-label={`Advertisement ${i + 1} of ${ads.length}`}
              onClick={(e) => { e.preventDefault(); setCurrentIdx(i); }}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIdx ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}