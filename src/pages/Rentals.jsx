import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Search, Truck, Car } from 'lucide-react';
import PageHeader from '@/components/go/PageHeader';
import PullToRefresh from '@/components/go/PullToRefresh';
import RentalCard from '@/components/rental/RentalCard';

export default function Rentals() {
  const { scrollRef } = useOutletContext();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicleType, setVehicleType] = useState('all');
  const [search, setSearch] = useState('');

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

  const filtered = rentals.filter((r) => {
    if (vehicleType !== 'all' && r.vehicle_type !== vehicleType) return false;
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
          <Select value={vehicleType} onValueChange={setVehicleType}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="car">Cars</SelectItem>
              <SelectItem value="suv">SUVs</SelectItem>
              <SelectItem value="pickup">Pickups</SelectItem>
              <SelectItem value="van">Vans</SelectItem>
              <SelectItem value="truck">Trucks</SelectItem>
              <SelectItem value="box_truck">Box Trucks</SelectItem>
              <SelectItem value="flatbed">Flatbeds</SelectItem>
              <SelectItem value="semi">Semis</SelectItem>
              <SelectItem value="trailer">Trailers</SelectItem>
              <SelectItem value="rv">RVs</SelectItem>
              <SelectItem value="motorcycle">Motorcycles</SelectItem>
              <SelectItem value="bus">Buses</SelectItem>
            </SelectContent>
          </Select>
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
      </div>
    </PullToRefresh>
  );
}