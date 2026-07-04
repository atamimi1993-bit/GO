import React from 'react';
import { ExternalLink, Car, Truck as TruckIcon } from 'lucide-react';

const PARTNERS = [
  {
    name: 'Enterprise',
    description: 'Cars, SUVs, and vans at thousands of locations nationwide.',
    url: 'https://www.enterprise.com',
    category: 'Cars & Vans',
    accent: 'bg-green-500',
  },
  {
    name: 'U-Haul',
    description: 'Pickup trucks, cargo vans, and box trucks for DIY moves.',
    url: 'https://www.uhaul.com',
    category: 'Moving Trucks',
    accent: 'bg-orange-500',
  },
  {
    name: 'Budget',
    description: 'Affordable car and truck rentals with frequent deals.',
    url: 'https://www.budget.com',
    category: 'Cars & Trucks',
    accent: 'bg-blue-500',
  },
  {
    name: 'Penske',
    description: 'Commercial box trucks and semi rentals for large hauls.',
    url: 'https://www.pensketruckrental.com',
    category: 'Commercial Trucks',
    accent: 'bg-yellow-500',
  },
  {
    name: 'Hertz',
    description: 'Premium cars, SUVs, and luxury vehicles for rent.',
    url: 'https://www.hertz.com',
    category: 'Cars & SUVs',
    accent: 'bg-amber-500',
  },
  {
    name: 'Ryder',
    description: 'Semi trucks, trailers, and fleet rentals for freight moves.',
    url: 'https://www.ryder.com',
    category: 'Semi & Fleet',
    accent: 'bg-red-500',
  },
];

export default function PartnerRentals() {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-1">
        <TruckIcon size={18} className="text-emerald-500" />
        <h2 className="font-display font-bold text-lg">Partner Rental Companies</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Can't find what you need above? Browse trusted rental partners for more options.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PARTNERS.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-card border rounded-2xl p-5 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl ${p.accent} flex items-center justify-center`}>
                <Car className="text-white" size={22} />
              </div>
              <ExternalLink size={16} className="text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </div>
            <h3 className="font-display font-bold text-base">{p.name}</h3>
            <p className="text-xs text-muted-foreground mt-1 flex-1">{p.description}</p>
            <span className="inline-block mt-3 text-[10px] font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
              {p.category}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}