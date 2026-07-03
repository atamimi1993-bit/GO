import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Calendar, Package, DollarSign, Loader2, ArrowLeft, Truck } from 'lucide-react';
import moment from 'moment';

export default function AvailableJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
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
    load();
  }, []);

  const handleAccept = async (job) => {
    if (!driverProfile) return;
    setAccepting(job.id);
    try {
      await base44.entities.MoveRequest.update(job.id, {
        status: 'accepted',
        assigned_driver_id: driverProfile.id,
        assigned_driver_name: driverProfile.full_name,
      });
      await base44.entities.DriverPayout.create({
        driver_profile_id: driverProfile.id,
        move_request_id: job.id,
        amount: job.driver_payout,
        status: 'pending',
      });
      setJobs(jobs.filter(j => j.id !== job.id));
      toast({ title: 'Job accepted!', description: `You've been assigned to this move.` });
    } catch {
      toast({ title: 'Error', description: 'Could not accept job.', variant: 'destructive' });
    }
    setAccepting(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;

  return (
    <div>
      <Link to="/driver-hub" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={16} /> Driver Hub
      </Link>
      <h1 className="text-2xl font-display font-bold mb-1">Available Jobs</h1>
      <p className="text-gray-500 text-sm mb-6">Accept a move to get started.</p>

      {jobs.length === 0 ? (
        <div className="text-center py-20 bg-white border rounded-2xl">
          <Truck className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No jobs available right now. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="bg-white border rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-600" />
                    <span className="font-display font-bold text-lg text-emerald-600">${job.driver_payout?.toFixed(2)} payout</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    <Calendar size={12} className="inline mr-1" />
                    {moment(job.move_date).format('MMM D, YYYY')}{job.move_time && ` at ${job.move_time}`}
                  </p>
                </div>
                <Badge className="bg-gray-100 text-gray-600 capitalize">{job.truck_size_needed?.replace('_', ' ')}</Badge>
              </div>
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <p className="flex items-center gap-2"><MapPin size={14} className="text-emerald-500" /> {job.pickup_address}</p>
                <p className="flex items-center gap-2"><MapPin size={14} className="text-red-400" /> {job.dropoff_address}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span><Package size={12} className="inline mr-1" />{job.total_weight_lbs?.toLocaleString()} lbs</span>
                  <span>{job.distance_miles} mi</span>
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
  );
}