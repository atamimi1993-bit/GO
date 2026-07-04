import React, { useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Logo from '@/components/go/Logo';
import { Home, Package, Truck, HelpCircle, User, LogOut, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomTabBar from '@/components/go/BottomTabBar';

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'My Moves', path: '/my-moves', icon: Package },
  { label: 'Driver Hub', path: '/driver-hub', icon: Truck },
  { label: 'Storage', path: '/storage', icon: Warehouse },
  { label: 'Help Center', path: '/help', icon: HelpCircle },
];

export default function AppLayout() {
  const location = useLocation();
  const mainRef = useRef(null);

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
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`select-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-emerald-50 text-emerald-700'
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => base44.auth.logout('/')}
              className="text-muted-foreground"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </Button>
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