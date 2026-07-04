import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Package, Truck, Warehouse, HelpCircle } from 'lucide-react';

const tabs = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Moves', path: '/my-moves', icon: Package },
  { label: 'Driver', path: '/driver-hub', icon: Truck },
  { label: 'Storage', path: '/storage', icon: Warehouse },
  { label: 'Help', path: '/help', icon: HelpCircle },
];

export default function BottomTabBar() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex select-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(tab => {
        const active = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));
        return (
          <Link key={tab.path} to={tab.path} className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors select-none ${active ? 'text-primary' : 'text-muted-foreground'}`}>
            <tab.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}