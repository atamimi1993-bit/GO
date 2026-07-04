import React, { useState, Suspense, lazy } from 'react';
import { LayoutDashboard, Map, DollarSign, Users, TrendingUp, Shield } from 'lucide-react';
import SectionSkeleton from '@/components/admin/SectionSkeleton';
import OverviewTab from '@/components/admin/tabs/OverviewTab';
import OperationsTab from '@/components/admin/tabs/OperationsTab';

const FinancialTab = lazy(() => import('@/components/admin/tabs/FinancialTab'));
const DriversLeadsTab = lazy(() => import('@/components/admin/tabs/DriversLeadsTab'));
const GrowthMarketingTab = lazy(() => import('@/components/admin/tabs/GrowthMarketingTab'));
const SecurityPanel = lazy(() => import('@/components/admin/SecurityPanel'));

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'operations', label: 'Operations', icon: Map },
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'drivers', label: 'Drivers & Leads', icon: Users },
  { id: 'growth', label: 'Growth', icon: TrendingUp },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function AdminTabs({ data, isFetching, processingId, onDriverAction, onUpdateLeadStatus, onRefresh, scrollRef }) {
  const [activeTab, setActiveTab] = useState('overview');

  const pendingCount = data?.pendingDrivers?.length || 0;

  const tabProps = { data, isFetching, processingId, onDriverAction, onUpdateLeadStatus, onRefresh, scrollRef };

  return (
    <div>
      {/* Sticky tab bar */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 mb-4 bg-background/95 backdrop-blur-md border-b">
        <div className="flex gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Admin sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[40px] ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {tab.id === 'drivers' && pendingCount > 0 && (
                  <span className={`ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-amber-500 text-white'
                  }`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {activeTab === 'overview' && <OverviewTab {...tabProps} />}
        {activeTab === 'operations' && <OperationsTab {...tabProps} />}
        {activeTab === 'financial' && (
          <Suspense fallback={<SectionSkeleton />}>
            <FinancialTab {...tabProps} />
          </Suspense>
        )}
        {activeTab === 'drivers' && (
          <Suspense fallback={<SectionSkeleton />}>
            <DriversLeadsTab {...tabProps} />
          </Suspense>
        )}
        {activeTab === 'growth' && (
          <Suspense fallback={<SectionSkeleton />}>
            <GrowthMarketingTab {...tabProps} />
          </Suspense>
        )}
        {activeTab === 'security' && (
          <Suspense fallback={<SectionSkeleton />}>
            <SecurityPanel />
          </Suspense>
        )}
      </div>
    </div>
  );
}