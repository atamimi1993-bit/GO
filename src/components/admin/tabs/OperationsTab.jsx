import React, { Suspense, lazy, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, TrendingUp, Flame, Route } from 'lucide-react';
import SectionSkeleton from '@/components/admin/SectionSkeleton';
const BatchMetricsDashboard = lazy(() => import('@/components/admin/BatchMetricsDashboard'));

const MoveStatusTracker = lazy(() => import('@/components/admin/MoveStatusTracker'));
const MoveCalendar = lazy(() => import('@/components/admin/MoveCalendar'));
const MoveHeatMap = lazy(() => import('@/components/admin/MoveHeatMap'));
const AdminWorldMap = lazy(() => import('@/components/admin/AdminWorldMap'));
const FleetManagement = lazy(() => import('@/components/admin/FleetManagement'));
const PromoCodeManager = lazy(() => import('@/components/admin/PromoCodeManager'));

export default function OperationsTab({ scrollRef }) {
  const [showMap, setShowMap] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  return (
    <div className="space-y-6">
      {/* Route batching metrics */}
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Route size={20} className="text-violet-500" />
          <h2 className="font-display font-bold text-lg">Route Batching</h2>
          <span className="text-xs text-muted-foreground ml-auto">Multi-stop optimization</span>
        </div>
        <Suspense fallback={<SectionSkeleton />}>
          <BatchMetricsDashboard />
        </Suspense>
      </div>

      {/* Fleet management */}
      <Suspense fallback={<SectionSkeleton />}>
        <FleetManagement />
      </Suspense>

      {/* Move status tracker */}
      <Suspense fallback={<SectionSkeleton />}>
        <MoveStatusTracker />
      </Suspense>

      {/* Promo code manager */}
      <Suspense fallback={<SectionSkeleton />}>
        <PromoCodeManager />
      </Suspense>

      {/* Move calendar */}
      <Suspense fallback={<SectionSkeleton />}>
        <MoveCalendar scrollRef={scrollRef} />
      </Suspense>

      {/* Move demand heatmap */}
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Flame size={20} className="text-orange-500" />
          <h2 className="font-display font-bold text-lg">Move Demand Heatmap</h2>
          <span className="text-xs text-muted-foreground ml-auto">Peak times & top locations</span>
        </div>
        {!showHeatmap ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">Load the demand heatmap to see peak moving times and hot locations.</p>
            <Button onClick={() => setShowHeatmap(true)} variant="outline">
              <Flame size={16} className="mr-1" /> Load Heatmap
            </Button>
          </div>
        ) : (
          <Suspense fallback={<SectionSkeleton />}>
            <MoveHeatMap />
          </Suspense>
        )}
      </div>

      {/* Global operations map */}
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={20} className="text-emerald-600" />
          <h2 className="font-display font-bold text-lg">Global Operations Map</h2>
        </div>
        {!showMap ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">Load the map to view all active moves and driver locations (geocodes up to 30 addresses).</p>
            <Button onClick={() => setShowMap(true)} variant="outline">
              <MapPin size={16} className="mr-1" /> Load Map
            </Button>
          </div>
        ) : (
          <Suspense fallback={<SectionSkeleton />}>
            <AdminWorldMap />
          </Suspense>
        )}
      </div>
    </div>
  );
}