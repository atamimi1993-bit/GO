import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Briefcase, DollarSign, Star, Truck, Navigation, FileText, Loader2 } from 'lucide-react';

const STATUS_BADGE = {
  approved: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  pending_review: 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400',
  suspended: 'bg-red-500/10 text-red-600 dark:text-red-400',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export default function DriverProfileDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
        if (profiles.length > 0) setProfile(profiles[0]);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="bg-card border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Truck className="text-emerald-600 dark:text-emerald-400" size={20} />
          </div>
          <div>
            <h2 className="font-display font-bold text-base">Driver Dashboard</h2>
            <p className="text-xs text-muted-foreground">{profile.full_name}</p>
          </div>
        </div>
        <Badge className={STATUS_BADGE[profile.status] || ''}>
          {profile.status?.replace('_', ' ')}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-xl bg-muted/50">
          <Briefcase className="mx-auto text-muted-foreground mb-1" size={18} />
          <p className="text-xl font-display font-bold">{profile.total_jobs || 0}</p>
          <p className="text-xs text-muted-foreground">Jobs</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/50">
          <DollarSign className="mx-auto text-muted-foreground mb-1" size={18} />
          <p className="text-xl font-display font-bold">${(profile.total_earnings || 0).toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Earnings</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/50">
          <Star className="mx-auto text-yellow-400 fill-yellow-400 mb-1" size={18} />
          <p className="text-xl font-display font-bold">{(profile.rating || 5.0).toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Rating</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2">
        <Link to="/driver-hub" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors">
          <Navigation className="text-emerald-600 dark:text-emerald-400" size={18} />
          <span className="text-xs font-medium text-center">Dashboard</span>
        </Link>
        <Link to="/my-trucks" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors">
          <Truck className="text-blue-600 dark:text-blue-400" size={18} />
          <span className="text-xs font-medium text-center">My Trucks</span>
        </Link>
        <Link to="/driver-report" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 transition-colors">
          <FileText className="text-purple-600 dark:text-purple-400" size={18} />
          <span className="text-xs font-medium text-center">Report</span>
        </Link>
      </div>
    </div>
  );
}