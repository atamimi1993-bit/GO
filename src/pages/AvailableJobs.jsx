import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Calendar, Package, DollarSign, Loader2, ArrowLeft, Truck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency, calculateMovePrice } from '@/lib/pricing';
import PullToRefresh from '@/components/go/PullToRefresh';

export default function AvailableJobs() {
  const navigate = useNavigate();
  const { scrollRef } = useOutletContext();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const u = await base44.auth.me();
      const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
      if (profiles.length > 0) setDriverProfile(profiles[0]);
      const pending = await base44.entities.MoveRequest.filter({ status: 'pending' }, '-created_date', 50);
      setJobs(pending);
    } catch {}
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (job) => {
    if (!driverProfile) return;
    setAccepting(job.id);
    // Optimistic removal
    setJobs(prev => prev.filter(j => j.id !== job.id));
    try {
      // Fetch the driver's trucks to get actual MPG and fuel type
      const trucks = await base44.entities.Truck.filter({ driver_profile_id: driverProfile.id });
      const truck = trucks.find(t => t.size_category === job.truck_size_needed) || trucks[0];

      let updatedPricing = {};
      let payoutAmount = job.driver_payout;

      if (truck) {
        const recalc = calculateMovePrice({
          totalWeightLbs: job.total_weight_lbs,
          distanceMiles: job.distance_miles,
          truckSize: job.truck_size_needed || truck.size_category,
          stateCode: job.pickup_state,
          countryCode: job.country_code,
          currency: job.currency,
          distanceUnit: job.distance_unit,
          jobType: job.job_type,
          truckMpg: truck.mpg,
          fuelType: truck.fuel_type,
        });
        updatedPricing = {
          fuel_cost: recalc.fuelCost,
          tax_amount: recalc.taxAmount,
          app_fee: recalc.appFee,
          total_price: recalc.totalPrice,
          driver_payout: recalc.driverPayout,
        };
        payoutAmount = recalc.driverPayout;
      }

      await base44.entities.MoveRequest.update(job.id, {
        status: 'accepted',
        assigned_driver_id: driverProfile.id,
        assigned_driver_name: driverProfile.full_name,
        ...updatedPricing,
      });
      await base44.entities.DriverPayout.create({
        driver_profile_id: driverProfile.id,
        move_request_id: job.id,
        amount: payoutAmount,
        currency: job.currency || 'USD',
        status: 'pending',
      });
      toast({ title: 'Job accepted!', description: "You've been assigned to this move." });
    } catch {
      // Restore job on failure
      setJobs(prev => [job, ...prev]);
      toast({ title: 'Error', description: 'Could not accept job.', variant: 'destructive' });
    }
    setAccepting(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
    <div>
      <button onClick={() => navigate(-1)} aria-label="Go back" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 min-h-[44px]">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-display font-bold mb-1">Available Jobs</h1>
      <p className="text-muted-foreground text-sm mb-6">Accept a move to get started.</p>

      {jobs.length === 0 ? (
        <div className="text-center py-20 bg-card border rounded-2xl">
          <Truck className="mx-auto text-muted-foreground mb-3" size={48} />
          <p className="text-muted-foreground">No jobs available right now. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="bg-card border rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-600" />
                    <span className="font-display font-bold text-lg text-emerald-600">{formatCurrency(job.driver_payout, job.currency)} payout</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Calendar size={12} className="inline mr-1" />
                    {format(parseISO(job.move_date), 'MMM d, yyyy')}{job.move_time && ` at ${job.move_time}`}
                  </p>
                </div>
                <Badge className="bg-muted text-muted-foreground capitalize">{job.truck_size_needed?.replace('_', ' ')}</Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground mb-3">
                <p className="flex items-center gap-2"><MapPin size={14} className="text-emerald-500" /> {job.pickup_address}</p>
                <p className="flex items-center gap-2"><MapPin size={14} className="text-red-400" /> {job.dropoff_address}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span><Package size={12} className="inline mr-1" />{job.total_weight_lbs?.toLocaleString()} lbs</span>
                  <span>{job.distance_miles} {job.distance_unit || 'mi'}</span>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => handleAccept(job)}
                  disabled={accepting === job.id}
                >
                  {accepting === job.id ? <Loader2 size={14} className="animate-spin" /> : 'Accept Job'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}