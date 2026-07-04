import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/go/PageHeader';
import PullToRefresh from '@/components/go/PullToRefresh';
import { MapPin, Loader2, Lock, Check, Search, ShoppingCart, DollarSign } from 'lucide-react';

const PRIORITY_BADGE = {
  high: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
  medium: 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400',
  low: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
};

export default function LeadMarketplace() {
  const { scrollRef } = useOutletContext();
  const { toast } = useToast();
  const [leads, setLeads] = useState([]);
  const [purchased, setPurchased] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [buying, setBuying] = useState(null);

  const load = useCallback(async () => {
    try {
      const [availableRes, myRes] = await Promise.all([
        base44.functions.invoke('lead-marketplace', { action: 'get_available_leads' }),
        base44.functions.invoke('lead-marketplace', { action: 'get_my_leads' }),
      ]);
      setLeads(availableRes.data?.leads || []);
      setPurchased(myRes.data?.leads || []);
    } catch (err) {
      toast({ title: 'Failed to load leads', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handlePurchase = async (leadId) => {
    setBuying(leadId);
    try {
      const res = await base44.functions.invoke('lead-marketplace', { action: 'create_checkout', lead_id: leadId });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      toast({ title: 'Purchase failed', description: err.message, variant: 'destructive' });
    } finally {
      setBuying(null);
    }
  };

  const filtered = leads.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.lead_name?.toLowerCase().includes(q) || l.location?.toLowerCase().includes(q);
  });

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={load}>
      <div className="pb-8">
        <PageHeader title="Lead Marketplace" />

        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white">
          <h2 className="text-2xl font-display font-bold mb-2">Buy Exclusive Leads</h2>
          <p className="text-indigo-100 text-sm mb-3">Get contact info for customers actively looking to move. Only $5 per lead — yours exclusively.</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1"><DollarSign size={16} />{purchased.length} purchased</span>
            <span className="flex items-center gap-1"><ShoppingCart size={16} />{leads.length} available</span>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or location..." className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={28} /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border rounded-2xl p-8 text-center">
            <MapPin className="mx-auto text-muted-foreground mb-3 opacity-40" size={40} />
            <p className="font-medium text-sm">No leads available</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later — new leads are added daily.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((lead) => {
              const isPurchased = lead.purchased || purchased.some(p => p.lead_id === lead.id);
              const purchase = purchased.find(p => p.lead_id === lead.id);
              return (
                <div key={lead.id} className="bg-card border rounded-2xl p-4 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-sm">{isPurchased ? lead.lead_name : 'New Lead'}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin size={12} />{lead.location || 'Location withheld'}
                      </p>
                    </div>
                    <Badge variant="secondary" className={PRIORITY_BADGE[lead.priority] || ''}>
                      {lead.priority}
                    </Badge>
                  </div>

                  {!isPurchased && (
                    <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                      <p>Type: {lead.lead_type}</p>
                      {lead.moving_reason && <p>Reason: {lead.moving_reason}</p>}
                      {lead.move_timeline && <p>Timeline: {lead.move_timeline}</p>}
                      <p className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Lock size={10} /> Contact info locked
                      </p>
                    </div>
                  )}

                  {isPurchased && purchase && (
                    <div className="space-y-1 mb-3 text-xs">
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Contact info unlocked</p>
                      {purchase.lead_contact && <p className="text-muted-foreground">{purchase.lead_contact}</p>}
                      {purchase.lead_location && <p className="text-muted-foreground">{purchase.lead_location}</p>}
                    </div>
                  )}

                  {isPurchased ? (
                    <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 mt-auto self-start">
                      <Check size={12} className="mr-1" /> Purchased
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => handlePurchase(lead.id)}
                      disabled={buying !== null}
                      size="sm"
                      className="mt-auto self-start bg-purple-600 hover:bg-purple-700"
                    >
                      {buying === lead.id ? <Loader2 size={14} className="animate-spin" /> : <>Unlock for $5</>}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}