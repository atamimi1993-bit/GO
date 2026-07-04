import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, ChevronDown, Bookmark, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SavedAddressPicker({ userEmail, onSelect, label }) {
  const [open, setOpen] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const list = await base44.entities.SavedAddress.filter({ user_email: userEmail });
      setAddresses(list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [userEmail]);

  if (!userEmail) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs text-emerald-600 font-medium flex items-center gap-1 hover:underline"
      >
        <Bookmark size={12} /> Use saved address
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading && <div className="p-3 text-sm text-muted-foreground">Loading...</div>}
          {!loading && addresses.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">
              No saved addresses yet.
            </div>
          )}
          {addresses.map((addr) => (
            <button
              key={addr.id}
              type="button"
              onClick={() => { onSelect(addr); setOpen(false); }}
              className="w-full text-left p-3 hover:bg-accent border-b last:border-0 flex items-start gap-2"
            >
              <MapPin size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium">{addr.label}</div>
                <div className="text-xs text-muted-foreground">{addr.address}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}