import React, { Suspense, lazy, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, TrendingUp } from 'lucide-react';
import SectionSkeleton from '@/components/admin/SectionSkeleton';

const MovesByCityChart = lazy(() => import('@/components/admin/MovesByCityChart'));
const GrowthSummary = lazy(() => import('@/components/admin/GrowthSummary'));
const EarningsCharts = lazy(() => import('@/components/admin/EarningsCharts'));
const DriverPerformance = lazy(() => import('@/components/admin/DriverPerformance'));
const MarketingPanel = lazy(() => import('@/components/admin/MarketingPanel'));
const AdManagement = lazy(() => import('@/components/admin/AdManagement'));

export default function GrowthMarketingTab() {
  const [showCharts, setShowCharts] = useState(false);

  return (
    <div className="space-y-6">
      {/* Growth summary */}
      <Suspense fallback={<SectionSkeleton />}>
        <GrowthSummary />
      </Suspense>

      {/* Moves by city */}
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={20} className="text-emerald-600" />
          <h2 className="font-display font-bold text-lg">Completed Moves by City</h2>
          <span className="text-xs text-muted-foreground ml-auto">Where we're growing fastest</span>
        </div>
        <Suspense fallback={<SectionSkeleton />}>
          <MovesByCityChart />
        </Suspense>
      </div>

      {/* Performance charts */}
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-emerald-600" />
          <h2 className="font-display font-bold text-lg">Performance Charts</h2>
        </div>
        {!showCharts ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">Load earnings, driver performance, and top performer charts.</p>
            <Button onClick={() => setShowCharts(true)} variant="outline">
              <TrendingUp size={16} className="mr-1" /> Load Charts
            </Button>
          </div>
        ) : (
          <>
            <Suspense fallback={<SectionSkeleton />}>
              <EarningsCharts />
            </Suspense>
            <Suspense fallback={<SectionSkeleton />}>
              <DriverPerformance />
            </Suspense>
          </>
        )}
      </div>

      {/* Marketing & promotions */}
      <Suspense fallback={<SectionSkeleton />}>
        <MarketingPanel />
      </Suspense>

      {/* Ad space management */}
      <Suspense fallback={<SectionSkeleton />}>
        <AdManagement />
      </Suspense>
    </div>
  );
}