import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Logo from '@/components/go/Logo';
import { Home, Package, Truck, HelpCircle, User, Menu, X, LogOut, Warehouse } from 'lucide-react';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

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
            >
              <LogOut size={16} />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-card pb-4">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`select-none flex items-center gap-3 px-6 py-3 text-sm font-medium ${
                  location.pathname === item.path
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-muted-foreground'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
            <div className="border-t mt-2 pt-2 px-6 flex flex-col gap-1">
              <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-3 text-sm text-muted-foreground">
                <User size={18} /> Account
              </Link>
              <button onClick={() => base44.auth.logout('/')} className="flex items-center gap-3 py-3 text-sm text-muted-foreground">
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-16 md:pb-0 overscroll-y-none">
        <Outlet />
      </main>
      <div className="md:hidden">
        <BottomTabBar />
      </div>
    </div>
  );
}