import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Loader2 } from 'lucide-react';
import moment from 'moment';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  deducted: 'bg-red-100 text-red-700',
};

export default function MyPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
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
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/driver-hub" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={16} /> Driver Hub
      </Link>
      <h1 className="text-2xl font-display font-bold mb-1">Payouts</h1>
      <p className="text-gray-500 text-sm mb-6">Track your earnings from completed jobs.</p>

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-6 text-center">
        <p className="text-sm text-emerald-700 mb-1">Total Earnings</p>
        <p className="text-4xl font-display font-black text-emerald-700">${total.toFixed(2)}</p>
      </div>

      {payouts.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-2xl">
          <DollarSign className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 text-sm">No payouts yet. Accept a job to start earning!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payouts.map(p => (
            <div key={p.id} className="bg-white border rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">${p.amount.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{moment(p.created_date).format('MMM D, YYYY')}</p>
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
  );
}