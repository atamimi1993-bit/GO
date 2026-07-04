import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, MapPin, Fuel, Calendar, Truck, Car, Gauge, User, Phone, Mail } from 'lucide-react';
import PageHeader from '@/components/go/PageHeader';
import RentalRequestForm from '@/components/rental/RentalRequestForm';
import { useToast } from '@/components/ui/use-toast';

const VEHICLE_ICONS = { car: Car, truck: Truck, van: Truck, trailer: Truck };

export default function RentalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rental, setRental] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.VehicleRental.get(id)
      .then(setRental)
      .catch(() => toast({ title: 'Not found', description: 'This listing is no longer available.', variant: 'destructive' }))
      .finally(() => setLoading(false));
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [id, toast]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  }

  if (!rental) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Truck className="text-muted-foreground mb-3" size={48} />
        <h2 className="font-display font-bold text-lg mb-1">Listing not found</h2>
        <Button variant="outline" onClick={() => navigate('/rentals')} className="mt-3">Back to Rentals</Button>
      </div>
    );
  }

  const Icon = VEHICLE_ICONS[rental.vehicle_type] || Truck;
  const photos = rental.photo_urls ? JSON.parse(rental.photo_urls) : [];
  const isOwner = currentUser?.email === rental.owner_email;

  const features = rental.features ? rental.features.split(',').map(f => f.trim()).filter(Boolean) : [];

  return (
    <div className="max-w-2xl mx-auto pb-4">
      <PageHeader title="Vehicle Details" isRoot={false} />

      {/* Photo gallery */}
      {photos.length > 0 ? (
        <div className="aspect-video bg-muted rounded-2xl overflow-hidden mb-4">
          <img src={typeof photos[0] === 'string' ? photos[0] : photos[0]?.url} alt={`${rental.make} ${rental.model}`} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center mb-4">
          <Icon className="text-muted-foreground" size={64} />
        </div>
      )}

      {/* Title + price */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{rental.make} {rental.model}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className="capitalize">{rental.vehicle_type}</Badge>
            {rental.year && <span className="text-sm text-muted-foreground">{rental.year}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">${rental.daily_rate}</p>
          <p className="text-xs text-muted-foreground">per day</p>
        </div>
      </div>

      {/* Specs */}
      <div className="bg-card border rounded-2xl p-5 mb-4 space-y-3">
        <div className="flex items-center gap-3">
          <MapPin className="text-muted-foreground shrink-0" size={18} />
          <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium text-sm">{rental.city}{rental.state ? `, ${rental.state}` : ''}</p></div>
        </div>
        {rental.transmission && (
          <div className="flex items-center gap-3">
            <Gauge className="text-muted-foreground shrink-0" size={18} />
            <div><p className="text-xs text-muted-foreground">Transmission</p><p className="font-medium text-sm capitalize">{rental.transmission}</p></div>
          </div>
        )}
        {rental.fuel_type && (
          <div className="flex items-center gap-3">
            <Fuel className="text-muted-foreground shrink-0" size={18} />
            <div><p className="text-xs text-muted-foreground">Fuel</p><p className="font-medium text-sm capitalize">{rental.fuel_type}</p></div>
          </div>
        )}
        {rental.capacity_lbs > 0 && (
          <div className="flex items-center gap-3">
            <Truck className="text-muted-foreground shrink-0" size={18} />
            <div><p className="text-xs text-muted-foreground">Capacity</p><p className="font-medium text-sm">{rental.capacity_lbs.toLocaleString()} lbs</p></div>
          </div>
        )}
        {rental.seats > 0 && (
          <div className="flex items-center gap-3">
            <User className="text-muted-foreground shrink-0" size={18} />
            <div><p className="text-xs text-muted-foreground">Seats</p><p className="font-medium text-sm">{rental.seats}</p></div>
          </div>
        )}
        {rental.license_plate && (
          <div className="flex items-center gap-3">
            <Calendar className="text-muted-foreground shrink-0" size={18} />
            <div><p className="text-xs text-muted-foreground">License Plate</p><p className="font-medium text-sm">{rental.license_plate}</p></div>
          </div>
        )}
      </div>

      {/* Description */}
      {rental.description && (
        <div className="bg-card border rounded-2xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-2">Description</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rental.description}</p>
        </div>
      )}

      {/* Features */}
      {features.length > 0 && (
        <div className="bg-card border rounded-2xl p-5 mb-4">
          <h3 className="font-semibold text-sm mb-2">Features</h3>
          <div className="flex flex-wrap gap-2">
            {features.map((f, i) => <Badge key={i} variant="secondary">{f}</Badge>)}
          </div>
        </div>
      )}

      {/* Owner info */}
      <div className="bg-card border rounded-2xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-3">Listed by</h3>
        <div className="space-y-1.5 text-sm">
          <p className="font-medium">{rental.owner_name}</p>
          <p className="text-xs text-muted-foreground capitalize">{rental.owner_type}</p>
        </div>
      </div>

      {/* Request form or owner notice */}
      {isOwner ? (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 text-center">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">This is your listing</p>
          <p className="text-xs text-muted-foreground mt-1">Rental requests will be emailed to you. You can quote a price and the renter will pay securely.</p>
        </div>
      ) : rental.available ? (
        <div className="bg-card border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-1">Request to Rent</h3>
          <p className="text-xs text-muted-foreground mb-4">Select your dates and send a request. The owner will review and send you a quote.</p>
          <RentalRequestForm
            rental={rental}
            renterName={currentUser?.full_name || ''}
            renterEmail={currentUser?.email || ''}
            renterPhone={currentUser?.phone || ''}
          />
        </div>
      ) : (
        <div className="bg-muted border rounded-2xl p-5 text-center">
          <p className="text-sm font-medium">This vehicle is currently not available for rent.</p>
        </div>
      )}
    </div>
  );
}