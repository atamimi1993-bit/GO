import React, { useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Logo from '@/components/go/Logo';
import { Home, Package, Truck, HelpCircle, User, LogOut, Warehouse, ShieldCheck, Navigation, DollarSign, Trophy, TrendingUp, Car, FileText, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import BottomTabBar from '@/components/go/BottomTabBar';
import OfflineBanner from '@/components/go/OfflineBanner';
import NotificationCenter from '@/components/go/NotificationCenter';

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Driver Hub', path: '/driver-hub', icon: Truck, driverOnly: true },
  { label: 'My Report', path: '/driver-report', icon: FileText, driverOnly: true },
  { label: 'Storage', path: '/storage', icon: Warehouse },
  { label: 'Rentals', path: '/rentals', icon: Car },
  { label: 'Help Center', path: '/help', icon: HelpCircle },
  { label: 'Admin', path: '/admin', icon: ShieldCheck, adminOnly: true },
  { label: 'Scheduler', path: '/scheduler', icon: CalendarClock, adminOnly: true },
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
    if (item.driverOnly) return user?.role !== 'admin' && !!driverProfile;
    if (item.cdlOrAdmin) return user?.role === 'admin' || driverProfile?.cdl_certified;
    return true;
  });

  const roleLabel = (() => {
    if (!user) return '';
    if (user.role === 'admin') return 'Admin';
    if (driverProfile) {
      return driverProfile.cdl_certified ? 'Freight Driver' : 'Driver';
    }
    const fullName = user.full_name || '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }
    return parts[0] || 'Customer';
  })();

  return (
    <div className="h-dvh flex flex-col bg-background">
      <OfflineBanner />
      {/* Mobile-only minimal header */}
      <header className="md:hidden shrink-0 bg-card border-b border-border sticky top-0 z-50 flex items-center justify-between px-4 h-14" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Link to="/" aria-label="GO Home" className="flex items-center">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          {user && <NotificationCenter user={user} />}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => base44.auth.logout('/')}
            className="min-h-[44px] min-w-[44px]"
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      {/* Desktop top nav */}
      <header className="hidden md:flex shrink-0 bg-card border-b border-border sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          {/* Left: Logo + nav tabs */}
          <div className="flex items-center gap-1 min-w-0">
            <Link to="/" aria-label="GO Home" className="flex items-center shrink-0">
              <Logo size="sm" />
            </Link>
            <nav className="hidden md:flex items-center gap-1 ml-2 overflow-x-auto">
              {visibleNavItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`select-none px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
          </div>

          {/* Right: Notifications + role label + profile + logout */}
          <div className="flex items-center gap-2 shrink-0">
            {user && <NotificationCenter user={user} />}
            <span className="hidden sm:block text-sm font-semibold text-foreground truncate max-w-[120px] sm:max-w-[160px]">
              {roleLabel}
            </span>
            <Link to="/profile">
              <Button variant="ghost" size="icon" aria-label="My Profile" className="min-h-[44px] min-w-[44px]">
                <User size={20} />
              </Button>
            </Link>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => base44.auth.logout('/')}
                    className="min-h-[44px] px-3 text-muted-foreground"
                    aria-label="Sign out"
                  >
                    <LogOut size={18} />
                    <span className="hidden sm:inline text-xs">Sign out</span>
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
        className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 overscroll-y-none overflow-y-auto md:h-auto md:overflow-visible"
        style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Outlet context={{ scrollRef: mainRef }} />
      </main>
      <div className="md:hidden">
        <BottomTabBar />
      </div>
    </div>
  );
}