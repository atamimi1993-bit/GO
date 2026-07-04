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
      return scrollRef.current.scrollTop <= 0;
    }
    return (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) <= 0;
  };

  const handleTouchStart = (e) => {
    if (disabledRef.current || refreshingRef.current || !isAtTop()) return;
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
    const node = (scrollRef && scrollRef.current) ? scrollRef.current : wrapperRef.current;
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
    <div className="relative" style={{ position: 'relative' }}>
    <div
      ref={wrapperRef}
      className="relative"
      style={{
        position: 'relative',
        overflow: 'clip',
        isolation: 'isolate',
        willChange: 'transform',
        overscrollBehavior: pulling ? 'none' : 'auto',
        touchAction: pulling ? 'none' : 'pan-y',
      }}
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center pointer-events-none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            height: 0,
            overflow: 'visible',
            transform: `translateY(${pullDistance - 40}px)`,
          }}
        >
          {refreshing ? (
            <Loader2 className="text-primary animate-spin" size={24} />
          ) : (
            <RefreshCw
              className="text-muted-foreground transition-transform"
              size={24}
              style={{ transform: `rotate(${pullDistance * 3}deg)` }}
            />
          )}
        </div>
      )}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transition: pulling ? 'none' : 'transform 0.3s ease',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
    </div>
  );
}