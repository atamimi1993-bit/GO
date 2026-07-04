import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTabHistory } from '@/lib/TabHistoryContext';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Home, Package, Truck, Warehouse, HelpCircle, Navigation, FileText, ShieldCheck, Plus } from 'lucide-react';

const adminTabs = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Moves', path: '/my-moves', icon: Package },
  { label: 'Track', path: '/tracking', icon: Navigation },
  { label: 'Admin', path: '/admin', icon: ShieldCheck },
  { label: 'Help', path: '/help', icon: HelpCircle },
];

const driverTabs = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Driver', path: '/driver-hub', icon: Truck },
  { label: 'Report', path: '/driver-report', icon: FileText },
  { label: 'Storage', path: '/storage', icon: Warehouse },
  { label: 'Help', path: '/help', icon: HelpCircle },
];

const customerTabs = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'New Move', path: '/new-move', icon: Plus },
  { label: 'Storage', path: '/storage', icon: Warehouse },
  { label: 'Rentals', path: '/rentals', icon: Truck },
  { label: 'Help', path: '/help', icon: HelpCircle },
];

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getTargetPath } = useTabHistory();
  const { user } = useAuth();

  const { data: driverProfile } = useQuery({
    queryKey: ['myDriverProfile', user?.id],
    queryFn: () => base44.entities.DriverProfile.filter({ email: user.email }).then(r => r[0] || null),
    enabled: !!user?.email && user?.role !== 'admin',
    staleTime: 5 * 60 * 1000,
  });

  const tabs = user?.role === 'admin'
    ? adminTabs
    : driverProfile
      ? driverTabs
      : customerTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex select-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(tab => {
        const active = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));
        return (
          <Link
            key={tab.path}
            to={tab.path}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            onClick={(e) => {
              if (active) {
                if (location.pathname === tab.path) {
                  e.preventDefault();
                }
              } else {
                e.preventDefault();
                navigate(getTargetPath(tab.path));
              }
            }}
            className={`flex-1 min-w-[44px] flex flex-col items-center justify-center py-3 min-h-[56px] gap-0.5 text-xs font-medium transition-colors select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 outline-none rounded-lg ${active ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <tab.icon size={22} strokeWidth={active ? 2.5 : 1.8} aria-hidden="true" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}