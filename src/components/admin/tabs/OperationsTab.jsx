import React, { Suspense, lazy, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, TrendingUp, Flame } from 'lucide-react';
import SectionSkeleton from '@/components/admin/SectionSkeleton';

const MoveStatusTracker = lazy(() => import('@/components/admin/MoveStatusTracker'));
const MoveCalendar = lazy(() => import('@/components/admin/MoveCalendar'));
const MoveHeatMap = lazy(() => import('@/components/admin/MoveHeatMap'));
const AdminWorldMap = lazy(() => import('@/components/admin/AdminWorldMap'));

export default function OperationsTab({ scrollRef }) {
  const [showMap, setShowMap] = useState(false);

  return (
    <div className="space-y-6">
      {/* Move status tracker */}
      <Suspense fallback={<SectionSkeleton />}>
        <MoveStatusTracker />
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
        <Suspense fallback={<SectionSkeleton />}>
          <MoveHeatMap />
        </Suspense>
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