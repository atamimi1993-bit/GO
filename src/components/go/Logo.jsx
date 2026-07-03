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
      <div className="bg-emerald-500 rounded-xl p-1.5 flex items-center justify-center">
        <Truck className="text-white" size={iconSizes[size]} />
      </div>
      <span className={`font-display font-black tracking-tight ${sizes[size]}`}>
        GO
      </span>
    </div>
  );
}