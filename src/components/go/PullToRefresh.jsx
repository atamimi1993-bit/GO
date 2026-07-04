import React, { useState, useRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

const THRESHOLD = 70;
const MAX_PULL = 100;

export default function PullToRefresh({ onRefresh, children, scrollRef }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);

  const isAtTop = () => {
    if (scrollRef && scrollRef.current) {
      return scrollRef.current.scrollTop <= 0;
    }
    return (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) <= 0;
  };

  const handleTouchStart = (e) => {
    if (isAtTop() && !refreshing) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!pulling || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, MAX_PULL));
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling) return;
    setPulling(false);
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          className="absolute left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
          style={{ top: `${pullDistance - 40}px` }}
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
          transform: `translateY(${pullDistance}px)`,
          transition: pulling ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}