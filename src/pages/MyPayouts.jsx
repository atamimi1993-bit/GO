import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PullToRefresh from '@/components/go/PullToRefresh';

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  paid: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  deducted: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

export default function MyPayouts() {
  const navigate = useNavigate();
  const { scrollRef } = useOutletContext();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = async () => {
    try {
      const u = await base44.auth.me();
      const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
      if (profiles.length > 0) {
        const p = await base44.entities.DriverPayout.filter({ driver_profile_id: profiles[0].id }, '-created_date', 50);
        setPayouts(p);
        setTotal(p.reduce((sum, x) => sum + (x.amount - (x.deduction_amount || 0)), 0));
      }
    } catch {}
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} aria-label="Go back" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 min-h-[44px]">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-display font-bold mb-1">Payouts</h1>
      <p className="text-muted-foreground text-sm mb-6">Track your earnings from completed jobs.</p>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 mb-6 text-center">
        <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Total Earnings</p>
        <p className="text-4xl font-display font-black text-emerald-600 dark:text-emerald-400">${total.toFixed(2)}</p>
      </div>

      {payouts.length === 0 ? (
        <div className="text-center py-16 bg-card border rounded-2xl">
          <DollarSign className="mx-auto text-muted-foreground mb-3" size={48} />
          <p className="text-muted-foreground text-sm">No payouts yet. Accept a job to start earning!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payouts.map(p => (
            <div key={p.id} className="bg-card border rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">${p.amount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{format(parseISO(p.created_date), 'MMM d, yyyy')}</p>
                {p.deduction_amount > 0 && (
                  <p className="text-xs text-red-500">-${p.deduction_amount.toFixed(2)} deduction: {p.deduction_reason}</p>
                )}
              </div>
              <Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}