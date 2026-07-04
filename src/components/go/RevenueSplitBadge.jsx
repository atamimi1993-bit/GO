import React from 'react';
import { TrendingDown, Shield, Users } from 'lucide-react';

/**
 * Shows the customer how much they're saving vs traditional movers.
 * Builds trust and drives conversion — the discount comes from GO's
 * lower overhead, not from cutting driver pay.
 */
export default function CustomerSavingsBadge({ pricing }) {
  if (!pricing || !pricing.customerSavings || pricing.customerSavings <= 0) return null;

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
        <TrendingDown size={20} className="text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <p className="font-display font-bold text-emerald-600 dark:text-emerald-400">
          You save {pricing.currency?.symbol || '$'}{Number(pricing.customerSavings).toFixed(pricing.currency?.decimals || 2)} ({pricing.customerSavingsPercent}%)
        </p>
        <p className="text-xs text-muted-foreground">
          vs. average traditional mover — drivers still earn 75% of every job
        </p>
      </div>
    </div>
  );
}

/**
 * Shows drivers their earnings share — recruitment & retention tool.
 * "You earn 75% of every job — no hidden platform fees"
 */
export function DriverEarningsBadge({ pricing }) {
  if (!pricing || !pricing.driverPayout) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <Users size={20} className="text-primary" />
      </div>
      <div>
        <p className="font-display font-bold text-primary">
          You earn {pricing.currency?.symbol || '$'}{Number(pricing.driverPayout).toFixed(pricing.currency?.decimals || 2)}
        </p>
        <p className="text-xs text-muted-foreground">
          {pricing.driverPayoutPercent}% of job value — no hidden fees, protected floor
        </p>
      </div>
    </div>
  );
}

/**
 * Compact split summary for admin/owner view — shows the full three-way breakdown.
 */
export function RevenueSplitSummary({ pricing }) {
  if (!pricing || !pricing.totalPrice) return null;

  const curr = pricing.currency;
  const sym = curr?.symbol || '$';
  const dec = curr?.decimals || 2;
  const fmt = (v) => sym + Number(v).toFixed(dec);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={16} className="text-primary" />
        <h4 className="font-display font-bold text-sm">Revenue Split Audit</h4>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer pays (total)</span>
          <span className="font-bold">{fmt(pricing.totalPrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Market rate (competitor)</span>
          <span className="text-muted-foreground line-through">{fmt(pricing.marketRate)}</span>
        </div>
        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
          <span>Customer savings</span>
          <span className="font-medium">−{fmt(pricing.customerSavings)} ({pricing.customerSavingsPercent}%)</span>
        </div>
        <div className="border-t pt-2 flex justify-between">
          <span className="text-primary font-medium">Driver payout ({pricing.driverPayoutPercent}%)</span>
          <span className="font-bold text-primary">{fmt(pricing.driverPayout)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Platform fee ({pricing.platformTakePercent}%)</span>
          <span className="font-medium">{fmt(pricing.appFee)}</span>
        </div>
      </div>
    </div>
  );
}