import React, { Suspense, lazy, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SectionSkeleton from '@/components/admin/SectionSkeleton';

const RecordExportButton = lazy(() => import('@/components/admin/RecordExportButton'));
const InstantPayoutCard = lazy(() => import('@/components/admin/InstantPayoutCard'));
const BulkPayoutPanel = lazy(() => import('@/components/admin/BulkPayoutPanel'));
const ExpenseReviewPanel = lazy(() => import('@/components/admin/ExpenseReviewPanel'));
const TaxReportPanel = lazy(() => import('@/components/admin/TaxReportPanel'));

export default function FinancialTab({ data, scrollRef }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { recentPayouts } = data;
  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <Suspense fallback={<SectionSkeleton />}>
        <RecordExportButton />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <InstantPayoutCard />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <BulkPayoutPanel scrollRef={scrollRef} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <ExpenseReviewPanel />
      </Suspense>

      {/* Recent payouts summary */}
      <div className="bg-card border rounded-2xl p-5">
        <h2 className="font-display font-bold text-lg mb-4">Recent Payouts</h2>
        <div className="space-y-2">
          {recentPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payouts yet.</p>
          ) : recentPayouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50">
              <div className="min-w-0">
                <p className="text-sm font-medium">{fmt(p.amount)}</p>
                <p className="text-xs text-muted-foreground truncate">{p.notes || 'No notes'}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced financial tools */}
      <div>
        <Button
          variant="outline"
          className="w-full min-h-[44px]"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? <ChevronUp size={16} className="mr-1" /> : <ChevronDown size={16} className="mr-1" />}
          {showAdvanced ? 'Hide tax reports' : 'Show tax reports'}
        </Button>
        {showAdvanced && (
          <div className="mt-4">
            <Suspense fallback={<SectionSkeleton />}>
              <TaxReportPanel />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}