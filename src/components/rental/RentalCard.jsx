import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Truck, Car, Fuel, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const VEHICLE_ICONS = {
  car: Car,
  truck: Truck,
  van: Truck,
  trailer: Truck,
};

export default function RentalCard({ rental }) {
  const Icon = VEHICLE_ICONS[rental.vehicle_type] || Truck;
  const photos = rental.photo_urls ? JSON.parse(rental.photo_urls) : [];
  const photo = photos[0]?.url || photos[0] || null;

  return (
    <Link
      to={`/rentals/${rental.id}`}
      className="bg-card border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group block"
    >
      <div className="aspect-video bg-muted relative overflow-hidden">
        {photo ? (
          <img src={photo} alt={`${rental.make} ${rental.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="text-muted-foreground" size={48} />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge className="capitalize bg-background/90 backdrop-blur">{rental.vehicle_type}</Badge>
        </div>
        {!rental.available && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <Badge variant="destructive">Not Available</Badge>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold truncate">{rental.make} {rental.model}</p>
            <p className="text-xs text-muted-foreground">{rental.year} · {rental.transmission}</p>
          </div>
          <p className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
            ${rental.daily_rate}<span className="text-xs font-normal text-muted-foreground">/day</span>
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin size={12} /> {rental.city}{rental.state ? `, ${rental.state}` : ''}
        </div>
        {rental.fuel_type && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Fuel size={12} /> {rental.fuel_type}
          </div>
        )}
      </div>
    </Link>
  );
}