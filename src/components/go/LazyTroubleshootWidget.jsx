import React, { useState, lazy, Suspense } from 'react';
import { Wrench, Zap } from 'lucide-react';

const TroubleshootWidget = lazy(() => import('@/components/go/TroubleshootWidget'));

export default function LazyTroubleshootWidget() {
  const [mounted, setMounted] = useState(false);

  if (mounted) {
    return (
      <Suspense fallback={null}>
        <TroubleshootWidget initialOpen />
      </Suspense>
    );
  }

  return (
    <button
      onClick={() => setMounted(true)}
      aria-label="Open GO Fix-It troubleshooter"
      style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
      className="fixed md:!bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-amber-500 text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
    >
      <Wrench size={24} />
      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-[10px] flex items-center justify-center text-white font-bold animate-pulse">
        <Zap size={10} />
      </span>
    </button>
  );
}