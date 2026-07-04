import React, { useState, useRef, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

const THRESHOLD = 70;
const MAX_PULL = 100;

export default function PullToRefresh({ onRefresh, children, scrollRef, disabled }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const wrapperRef = useRef(null);

  const pullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const disabledRef = useRef(disabled);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  const isAtTop = () => {
    if (scrollRef && scrollRef.current) {
      return scrollRef.current.scrollTop <= 1;
    }
    // Only fall back to window scroll when no scrollRef was passed at all
    return (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) <= 1;
  };

  const handleTouchStart = (e) => {
    if (disabledRef.current || refreshingRef.current || !isAtTop()) return;
    // Don't start pull tracking when the touch began on an interactive element
    // (button, link, input, etc.) — prevents preventDefault on touchmove from
    // blocking the synthetic click event that fires after touchend.
    if (e.target.closest('button, a, input, select, textarea, [role="button"], label')) return;
    startY.current = e.touches[0].clientY;
    pullingRef.current = true;
    setPulling(true);
  };

  const handleTouchMove = (e) => {
    if (disabledRef.current || !pullingRef.current || refreshingRef.current) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 5) {
      e.preventDefault(); // Prevent native bounce during custom pull
      const newPull = Math.min(diff * 0.5, MAX_PULL);
      pullDistanceRef.current = newPull;
      setPullDistance(newPull);
    }
  };

  const handleTouchEnd = async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    setPulling(false);
    if (pullDistanceRef.current >= THRESHOLD) {
      refreshingRef.current = true;
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      pullDistanceRef.current = THRESHOLD;
      try {
        await onRefreshRef.current();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  };

  useEffect(() => {
    // If a scrollRef prop was passed, only use scrollRef.current (never fall
    // back to wrapperRef). Only use wrapperRef when no scrollRef was passed.
    const node = scrollRef ? scrollRef.current : wrapperRef.current;
    if (!node) return;
    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
      node.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollRef]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      style={{
        isolation: 'isolate',
        willChange: 'transform',
        overscrollBehavior: pulling ? 'none' : 'auto',
        overscrollBehaviorY: 'contain',
        touchAction: pulling ? 'none' : 'pan-y',
      }}
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          role="status"
          aria-live="polite"
          aria-label={refreshing ? 'Refreshing content' : 'Pull to refresh'}
          className="left-0 right-0 flex items-center justify-center pointer-events-none"
          style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 72px)', zIndex: 45, transform: `translateY(${pullDistance}px)` }}
        >
          {refreshing ? (
            <Loader2 aria-hidden="true" className="text-primary animate-spin" size={24} />
          ) : (
            <RefreshCw
              aria-hidden="true"
              className="text-muted-foreground transition-transform"
              size={24}
              style={{ transform: `rotate(${pullDistance * 3}deg)` }}
            />
          )}
        </div>
      )}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pulling ? 'none' : 'transform 0.3s ease',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}