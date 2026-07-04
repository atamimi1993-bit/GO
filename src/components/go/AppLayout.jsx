import React, { useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Logo from '@/components/go/Logo';
import { Home, Package, Truck, HelpCircle, User, LogOut, Warehouse, ShieldCheck, Container, Navigation, DollarSign, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import BottomTabBar from '@/components/go/BottomTabBar';

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'My Moves', path: '/my-moves', icon: Package },
  { label: 'Tracking', path: '/tracking', icon: Navigation },
  { label: 'Revenue', path: '/revenue', icon: DollarSign, driverOrAdmin: true },
  { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  { label: 'Driver Hub', path: '/driver-hub', icon: Truck },
  { label: 'Storage', path: '/storage', icon: Warehouse },
  { label: 'Help Center', path: '/help', icon: HelpCircle },
  { label: 'Admin', path: '/admin', icon: ShieldCheck, adminOnly: true },
  { label: 'Drivers', path: '/driver-dashboard', icon: Truck, adminOnly: true },
  { label: 'Freight', path: '/freight-dashboard', icon: Container, cdlOrAdmin: true },
];

export default function AppLayout() {
  const location = useLocation();
  const mainRef = useRef(null);
  const { user } = useAuth();
  const { data: driverProfile } = useQuery({
    queryKey: ['myDriverProfile', user?.id],
    queryFn: () => base44.entities.DriverProfile.filter({ email: user.email }).then(r => r[0] || null),
    enabled: !!user?.email && user?.role !== 'admin',
    staleTime: 5 * 60 * 1000,
  });
  const visibleNavItems = navItems.filter(item => {
    if (item.adminOnly) return user?.role === 'admin';
    if (item.cdlOrAdmin) return user?.role === 'admin' || driverProfile?.cdl_certified;
    if (item.driverOrAdmin) return user?.role === 'admin' || !!driverProfile;
    return true;
  });

  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Top nav */}
      <header className="shrink-0 bg-card border-b border-border sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <Logo size="sm" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`select-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <item.icon size={16} />
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex md:hidden items-center gap-2">
            <Link to="/profile">
              <Button variant="ghost" size="icon" aria-label="My Account" className="min-h-[44px] min-w-[44px]">
                <User size={20} />
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => base44.auth.logout('/')}
              className="min-h-[44px] px-3 text-muted-foreground"
              aria-label="Sign out"
            >
              <LogOut size={18} />
              <span className="text-xs">Sign out</span>
            </Button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/profile">
              <Button variant="ghost" size="sm">
                <User size={16} className="mr-1" /> Account
              </Button>
            </Link>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => base44.auth.logout('/')}
                    className="text-muted-foreground"
                    aria-label="Sign out"
                  >
                    <LogOut size={16} />
                    <span className="sr-only">Sign out</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        data-scroll-container
        className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 pb-20 md:pb-0 overscroll-y-none overflow-y-auto md:h-auto md:overflow-visible"
      >
        <Outlet context={{ scrollRef: mainRef }} />
      </main>
      <div className="md:hidden">
        <BottomTabBar />
      </div>
    </div>
  );
}