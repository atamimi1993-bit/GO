import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Search, Truck, Car, MapPin } from 'lucide-react';
import PageHeader from '@/components/go/PageHeader';
import PullToRefresh from '@/components/go/PullToRefresh';
import MobileSelect from '@/components/go/MobileSelect';
import RentalCard from '@/components/rental/RentalCard';
import PartnerRentals from '@/components/rental/PartnerRentals';
import { useUserState } from '@/hooks/useUserState';

export default function Rentals() {
  const { scrollRef } = useOutletContext();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicleType, setVehicleType] = useState('all');
  const [search, setSearch] = useState('');
  const { userState } = useUserState();
  const [stateFilter, setStateFilter] = useState(null);
  const stateInitRef = useRef(false);

  useEffect(() => {
    if (userState && !stateInitRef.current) {
      stateInitRef.current = true;
      setStateFilter(userState);
    }
  }, [userState]);

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.VehicleRental.filter({ status: 'active', available: true }, '-created_date', 100);
      setRentals(data);
    } catch {
      setRentals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const availableStates = [...new Set([
    ...rentals.map((r) => r.state).filter(Boolean),
    ...(userState ? [userState] : []),
  ])].sort();

  const filtered = rentals.filter((r) => {
    if (vehicleType !== 'all' && r.vehicle_type !== vehicleType) return false;
    if (stateFilter && (r.state || '').toUpperCase() !== stateFilter.toUpperCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = `${r.make} ${r.model} ${r.city} ${r.state} ${r.description || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="pb-4">
        <div className="flex items-center justify-between mb-6">
          <PageHeader title="Vehicle Rentals" isRoot />
          <Link to="/rentals/new">
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
              <Plus size={16} className="mr-1" /> List Yours
            </Button>
          </Link>
        </div>

        {/* Location indicator */}
        {stateFilter && (
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <MapPin size={14} className="text-emerald-500 shrink-0" />
            Showing vehicles in <span className="font-medium text-foreground">{stateFilter}</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by make, model, or city..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <MobileSelect
            value={vehicleType}
            onValueChange={setVehicleType}
            placeholder="All Types"
            className="w-full sm:w-[160px]"
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'car', label: 'Cars' },
              { value: 'suv', label: 'SUVs' },
              { value: 'pickup', label: 'Pickups' },
              { value: 'van', label: 'Vans' },
              { value: 'truck', label: 'Trucks' },
              { value: 'box_truck', label: 'Box Trucks' },
              { value: 'flatbed', label: 'Flatbeds' },
              { value: 'semi', label: 'Semis' },
              { value: 'trailer', label: 'Trailers' },
              { value: 'rv', label: 'RVs' },
              { value: 'motorcycle', label: 'Motorcycles' },
              { value: 'bus', label: 'Buses' },
            ]}
          />
          <MobileSelect
            value={stateFilter || 'all'}
            onValueChange={(v) => setStateFilter(v === 'all' ? null : v)}
            placeholder="All States"
            className="w-full sm:w-[140px]"
            options={[
              { value: 'all', label: 'All States' },
              ...availableStates.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Truck className="text-muted-foreground mb-3" size={48} />
            <h2 className="font-display font-bold text-lg mb-1">No vehicles found</h2>
            <p className="text-muted-foreground text-sm mb-4">Be the first to list a vehicle for rent.</p>
            <Link to="/rentals/new">
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <Plus size={16} className="mr-1" /> List a Vehicle
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <RentalCard key={r.id} rental={r} />
            ))}
          </div>
        )}

        <PartnerRentals />
      </div>
    </PullToRefresh>
  );
}