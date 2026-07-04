import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Package, Truck, User, Phone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/pricing';

const STATUS_COLORS = {
  accepted: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  completed: 'bg-muted text-foreground',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

const JOB_TYPE_LABELS = {
  freight: 'Freight',
  corporate_logistics: 'Corporate Logistics',
  residential: 'Residential',
};

export default function FreightJobCard({ job, driver }) {
  const distUnit = job.distance_unit || 'mi';

  return (
    <div className="bg-card border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {JOB_TYPE_LABELS[job.job_type] || job.job_type}
            </Badge>
            <Badge className={STATUS_COLORS[job.status] || STATUS_COLORS.pending}>
              {job.status?.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="capitalize">
              <Truck size={10} className="mr-1" aria-hidden="true" />
              {job.truck_size_needed?.replace('_', ' ')}
            </Badge>
          </div>
          <div className="space-y-1 mt-2">
            <p className="flex items-center gap-2 text-sm">
              <MapPin size={14} className="text-emerald-500 shrink-0" aria-hidden="true" /> {job.pickup_address}
            </p>
            <p className="flex items-center gap-2 text-sm">
              <MapPin size={14} className="text-red-400 shrink-0" aria-hidden="true" /> {job.dropoff_address}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-display font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(job.total_price, job.currency)}
          </p>
          {job.driver_payout > 0 && (
            <p className="text-xs text-muted-foreground">
              Driver: {formatCurrency(job.driver_payout, job.currency)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
        <span className="flex items-center gap-1">
          <Calendar size={12} aria-hidden="true" />
          {format(parseISO(job.move_date), 'MMM d, yyyy')}{job.move_time && ` at ${job.move_time}`}
        </span>
        <span className="flex items-center gap-1">
          <Package size={12} aria-hidden="true" />
          {job.total_weight_lbs?.toLocaleString()} lbs
        </span>
        <span>{job.distance_miles} {distUnit}</span>
      </div>

      {/* Assigned driver */}
      {job.assigned_driver_id ? (
        <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-emerald-500/10 rounded-full w-10 h-10 flex items-center justify-center shrink-0">
              <User size={18} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">
                {job.assigned_driver_name || driver?.full_name || 'Assigned driver'}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {driver?.cdl_certified && (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                    CDL {driver.cdl_class}
                  </Badge>
                )}
                {driver?.company_name && (
                  <span className="text-xs text-muted-foreground">{driver.company_name}</span>
                )}
                {driver?.phone && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone size={10} /> {driver.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            No CDL driver assigned yet — waiting for acceptance
          </p>
        </div>
      )}
    </div>
  );
}