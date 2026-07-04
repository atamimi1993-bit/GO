import React, { Suspense, lazy, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SectionSkeleton from '@/components/admin/SectionSkeleton';
import LeadFinder from '@/components/admin/LeadFinder';
import LeadList from '@/components/admin/LeadList';

const DriverPerformance = lazy(() => import('@/components/admin/DriverPerformance'));
const DriverTopPerformers = lazy(() => import('@/components/admin/DriverTopPerformers'));
const RecruitmentPipeline = lazy(() => import('@/components/admin/RecruitmentPipeline'));
const DriverRecruiter = lazy(() => import('@/components/admin/DriverRecruiter'));
const DriverCoach = lazy(() => import('@/components/admin/DriverCoach'));
const BackgroundCheckPanel = lazy(() => import('@/components/admin/BackgroundCheckPanel'));
const LeadContactAssistant = lazy(() => import('@/components/admin/LeadContactAssistant'));
const RentalApprovalPanel = lazy(() => import('@/components/admin/RentalApprovalPanel'));
const DamageClaimsPanel = lazy(() => import('@/components/admin/DamageClaimsPanel'));

export default function DriversLeadsTab({ data, processingId, onDriverAction, onUpdateLeadStatus, onRefresh, scrollRef }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { allDrivers } = data;

  return (
    <div className="space-y-6">
      {/* Driver performance dashboard */}
      <Suspense fallback={<SectionSkeleton />}>
        <DriverPerformance />
      </Suspense>

      {/* Driver leaderboard */}
      <Suspense fallback={<SectionSkeleton />}>
        <DriverTopPerformers />
      </Suspense>

      {/* Recruitment pipeline */}
      <Suspense fallback={<SectionSkeleton />}>
        <RecruitmentPipeline />
      </Suspense>

      {/* AI Driver Recruiter */}
      <Suspense fallback={<SectionSkeleton />}>
        <DriverRecruiter />
      </Suspense>

      {/* AI Driver Coach */}
      <Suspense fallback={<SectionSkeleton />}>
        <DriverCoach />
      </Suspense>

      {/* Rental approvals */}
      <Suspense fallback={<SectionSkeleton />}>
        <RentalApprovalPanel scrollRef={scrollRef} />
      </Suspense>

      {/* Damage claims */}
      <Suspense fallback={<SectionSkeleton />}>
        <DamageClaimsPanel />
      </Suspense>

      {/* AI Lead Contact Assistant */}
      <Suspense fallback={<SectionSkeleton />}>
        <LeadContactAssistant />
      </Suspense>

      {/* Lead Finder */}
      <LeadFinder onLeadsGenerated={onRefresh} />

      <LeadList leads={data.leads} onUpdateStatus={onUpdateLeadStatus} />

      {/* Advanced: background checks */}
      <div>
        <Button
          variant="outline"
          className="w-full min-h-[44px]"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? <ChevronUp size={16} className="mr-1" /> : <ChevronDown size={16} className="mr-1" />}
          {showAdvanced ? 'Hide background checks' : 'Show background checks'}
        </Button>
        {showAdvanced && (
          <div className="mt-4">
            <Suspense fallback={<SectionSkeleton />}>
              <BackgroundCheckPanel drivers={allDrivers} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}