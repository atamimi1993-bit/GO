import React, { useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Logo from '@/components/go/Logo';
import { Home, Package, Truck, HelpCircle, User, LogOut, Warehouse, Bot, ShieldCheck, Container, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import BottomTabBar from '@/components/go/BottomTabBar';

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'My Moves', path: '/my-moves', icon: Package },
  { label: 'Tracking', path: '/tracking', icon: Navigation },
  { label: 'Driver Hub', path: '/driver-hub', icon: Truck },
  { label: 'Storage', path: '/storage', icon: Warehouse },
  { label: 'Help Center', path: '/help', icon: HelpCircle },
  { label: 'Assistant', path: '/support', icon: Bot },
  { label: 'Admin', path: '/admin', icon: ShieldCheck, adminOnly: true },
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
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="bg-card border-b border-border sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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
              <Button variant="ghost" size="icon" aria-label="My Account">
                <User size={20} />
              </Button>
            </Link>
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
        className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-0 overscroll-y-none h-[calc(100dvh-4rem-56px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto md:h-auto md:overflow-visible"
      >
        <Outlet context={{ scrollRef: mainRef }} />
      </main>
      <div className="md:hidden">
        <BottomTabBar />
      </div>
    </div>
  );
}