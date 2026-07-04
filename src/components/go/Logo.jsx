import React from 'react';
import { Truck } from 'lucide-react';

export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-7xl'
  };
  const iconSizes = { sm: 16, md: 24, lg: 36, xl: 48 };

  return (
    <div className="flex items-center gap-2">
      <div className="rounded-xl p-1.5 flex items-center justify-center glow-primary" style={{ background: 'linear-gradient(135deg, hsl(160 84% 52%), hsl(190 90% 50%))' }}>
        <Truck className="text-white" size={iconSizes[size]} aria-hidden="true" />
      </div>
      <span className={`font-display font-black tracking-tight ${sizes[size]}`}>
        GO
      </span>
    </div>
  );
}