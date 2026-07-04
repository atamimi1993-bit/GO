import React from 'react';
import { Flame } from 'lucide-react';

const WEIGHT_THRESHOLD_LBS = 1000;
const PRICE_THRESHOLD = 500;

export function isHighValueMove(move) {
  if (!move) return false;
  const weight = Number(move.total_weight_lbs) || 0;
  const price = Number(move.total_price) || 0;
  return weight >= WEIGHT_THRESHOLD_LBS || price >= PRICE_THRESHOLD;
}

export function getHighValueReasons(move) {
  const reasons = [];
  if ((Number(move.total_weight_lbs) || 0) >= WEIGHT_THRESHOLD_LBS) {
    reasons.push(`${Math.round(Number(move.total_weight_lbs))} lbs`);
  }
  if ((Number(move.total_price) || 0) >= PRICE_THRESHOLD) {
    reasons.push(`$${(Number(move.total_price)).toLocaleString()}`);
  }
  return reasons;
}

export default function HighValueMoveBadge({ move }) {
  if (!isHighValueMove(move)) return null;
  const reasons = getHighValueReasons(move);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
      <Flame size={12} />
      {reasons.join(' · ')}
    </span>
  );
}

export { WEIGHT_THRESHOLD_LBS, PRICE_THRESHOLD };