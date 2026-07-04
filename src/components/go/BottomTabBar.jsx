import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex select-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(tab => {
        const active = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));
        return (
          <button
            key={tab.path}
            onClick={() => active ? navigate(tab.path, { replace: true }) : navigate(tab.path)}
            className={`flex-1 flex flex-col items-center justify-center py-3 min-h-[56px] gap-0.5 text-xs font-medium transition-colors select-none ${active ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <tab.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}