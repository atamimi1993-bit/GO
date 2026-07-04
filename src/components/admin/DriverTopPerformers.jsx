import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Trophy, Loader2, Star, Award, CheckCircle2 } from 'lucide-react';

const MAX_ROWS = 15;

export default function DriverTopPerformers() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    base44.functions.invoke('admin-dashboard', { action: 'driver_performance' })
      .then((res) => setData(res.data))
      .catch((err) => toast({ title: 'Failed to load top performers', description: err.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={20} className="text-amber-500" />
          <h2 className="font-display font-bold text-lg">Top Performers</h2>
        </div>
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
      </div>
    );
  }

  if (!data) return null;

  // Rank by completed jobs (primary), then rating (secondary), then total ratings (tertiary)
  const ranked = [...data.drivers]
    .filter((d) => d.completed_jobs > 0 || d.total_ratings > 0 || d.rating > 0)
    .sort((a, b) => {
      if (b.completed_jobs !== a.completed_jobs) return b.completed_jobs - a.completed_jobs;
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      return (b.total_ratings || 0) - (a.total_ratings || 0);
    });

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const visible = showAll ? rest : rest.slice(0, MAX_ROWS - 3);
  const podiumColors = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-400', 'from-orange-400 to-amber-600'];
  const podiumLabels = ['1st', '2nd', '3rd'];

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={20} className="text-amber-500" />
        <h2 className="font-display font-bold text-lg">Top Performers</h2>
        <span className="text-xs text-muted-foreground ml-auto">By completed jobs &amp; ratings</span>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No driver activity yet.</p>
      ) : (
        <>
          {/* Podium — top 3 */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {top3.map((d, i) => (
                <div
                  key={d.id}
                  className={`relative rounded-2xl p-4 border-2 ${i === 0 ? 'border-amber-400/50 bg-amber-500/5' : 'border-border bg-muted/30'}`}
                >
                  <div className={`absolute -top-3 -left-2 w-9 h-9 rounded-full bg-gradient-to-br ${podiumColors[i]} flex items-center justify-center shadow-md`}>
                    <span className="text-xs font-bold text-white">{podiumLabels[i]}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3 mt-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {d.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{d.full_name}</p>
                      {d.company_name && <p className="text-xs text-muted-foreground truncate">{d.company_name}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-background/50 py-2">
                      <CheckCircle2 size={14} className="mx-auto text-emerald-500 mb-0.5" />
                      <p className="text-lg font-display font-bold">{d.completed_jobs}</p>
                      <p className="text-[10px] text-muted-foreground">Completed</p>
                    </div>
                    <div className="rounded-lg bg-background/50 py-2">
                      <Star size={14} className="mx-auto text-amber-400 mb-0.5" />
                      <p className="text-lg font-display font-bold">
                        {d.total_ratings > 0 ? d.rating?.toFixed(1) : '—'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{d.total_ratings} rating{d.total_ratings === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Remaining ranked list */}
          {rest.length > 0 && (
            <div className="space-y-2">
              {visible.map((d, i) => (
                <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30">
                  <span className="w-6 text-center text-sm font-semibold text-muted-foreground shrink-0">{i + 4}</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {d.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.full_name}</p>
                    {d.company_name && <p className="text-xs text-muted-foreground truncate">{d.company_name}</p>}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">{d.completed_jobs}</p>
                      <p className="text-[10px] text-muted-foreground">Jobs</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-0.5 justify-center">
                        <Star size={11} className={d.total_ratings > 0 ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'} />
                        <span className="font-semibold">{d.total_ratings > 0 ? d.rating?.toFixed(1) : '—'}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{d.total_ratings} review{d.total_ratings === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rest.length > MAX_ROWS - 3 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-2 py-2 text-sm text-primary font-medium hover:underline"
            >
              Show all {ranked.length} drivers
            </button>
          )}
        </>
      )}
    </div>
  );
}