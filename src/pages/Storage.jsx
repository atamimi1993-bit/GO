import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Warehouse, Search, MapPin, Phone, Globe, Star, Loader2, Snowflake } from 'lucide-react';
import PullToRefresh from '@/components/go/PullToRefresh';

export default function Storage() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadFacilities = async () => {
    const facilities = await base44.entities.StorageFacility.list('-rating', 50);
    setFacilities(facilities);
  };
  useEffect(() => {
    loadFacilities().finally(() => setLoading(false));
  }, []);

  const filtered = facilities.filter(f =>
    !search || f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.city?.toLowerCase().includes(search.toLowerCase()) ||
    f.state?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;

  return (
    <PullToRefresh onRefresh={loadFacilities}>
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">Find Storage</h1>
        <p className="text-muted-foreground text-sm">Browse storage facilities near your move.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          className="pl-10"
          placeholder="Search by city, state, or facility name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border rounded-2xl">
          <Warehouse className="mx-auto text-muted-foreground mb-3" size={48} />
          <p className="text-muted-foreground text-sm">No storage facilities found. Try a different search.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(f => (
            <div key={f.id} className="bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display font-bold">{f.name}</h3>
                {f.climate_controlled && (
                  <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400"><Snowflake size={12} className="mr-1" /> Climate</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin size={14} className="text-muted-foreground" /> {f.address}, {f.city}, {f.state} {f.zip}
              </p>
              {f.phone && <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1"><Phone size={14} /> {f.phone}</p>}
              {f.website && (
                <a href={f.website} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 flex items-center gap-1 mb-2">
                  <Globe size={14} /> Visit Website
                </a>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                {f.price_range && <span className="text-sm text-muted-foreground">{f.price_range}</span>}
                {f.rating > 0 && (
                  <span className="flex items-center gap-1 text-sm">
                    <Star size={14} className="text-yellow-500 fill-yellow-500" /> {f.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}