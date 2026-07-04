import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Star, Truck, Package, ShieldCheck } from 'lucide-react';

export default function HomeStats() {
  const { data: stats } = useQuery({
    queryKey: ['homeStats'],
    queryFn: async () => {
      try {
        // Approximate counts for display purposes — limited to 100 for performance
        const [completedMoves, drivers] = await Promise.all([
          base44.entities.MoveRequest.filter({ status: 'completed' }, '-created_date', 100),
          base44.entities.DriverProfile.filter({ status: 'approved' }, '-rating', 100),
        ]);
        const ratedDrivers = drivers.filter(d => d.total_jobs > 0);
        const avgRating = ratedDrivers.length > 0
          ? (ratedDrivers.reduce((s, d) => s + (d.rating || 0), 0) / ratedDrivers.length).toFixed(1)
          : null;
        return { moves: completedMoves.length, drivers: drivers.length, avgRating };
      } catch {
        return { moves: 0, drivers: 0, avgRating: null };
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const moves = stats?.moves ?? 0;
  const drivers = stats?.drivers ?? 0;
  const avgRating = stats?.avgRating;

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K+` : n > 0 ? `${n}+` : 'New';

  const items = [
    { value: fmt(moves), label: 'Moves Completed', icon: Package },
    { value: fmt(drivers), label: 'Verified Drivers', icon: Truck },
    ...(avgRating ? [{ value: avgRating, label: 'Average Rating', icon: Star }] : [{ value: '100%', label: 'Secure Payments', icon: ShieldCheck }]),
    { value: '50+', label: 'States Covered' },
  ];

  return (
    <section className="bg-card rounded-2xl border border-border p-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {items.map((stat, i) => (
          <div key={i}>
            <div className="text-3xl font-display font-black text-foreground flex items-center justify-center gap-1">
              {stat.value}
              {stat.icon && <stat.icon size={20} className="text-yellow-500 fill-yellow-500" />}
            </div>
            <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}