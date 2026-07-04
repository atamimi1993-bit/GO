import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function LeadFinder({ onLeadsGenerated }) {
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState('');
  const [searching, setSearching] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!location.trim()) {
      toast({ title: 'Enter a location to search', variant: 'destructive' });
      return;
    }
    setSearching(true);
    setLastResult(null);
    try {
      const res = await base44.functions.invoke('find-leads', {
        location: location.trim(),
        keywords: keywords.trim(),
      });
      setLastResult(res.data);
      if (res.data.found > 0) {
        toast({ title: `Found ${res.data.found} leads`, description: `${res.data.created} saved to your leads list` });
      } else {
        toast({ title: 'No leads found', description: 'Try a different location or keywords.' });
      }
      if (onLeadsGenerated) onLeadsGenerated();
    } catch (err) {
      toast({ title: 'Lead search failed', description: err.message, variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-emerald-500/10 rounded-lg p-1.5">
          <Sparkles size={18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg">AI Lead Finder</h2>
          <p className="text-xs text-muted-foreground">Searches the web for people and businesses likely to need moving services.</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Label htmlFor="lead-location" className="sr-only">Location</Label>
          <Input
            id="lead-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, state or area (e.g. Austin, TX)"
            disabled={searching}
            aria-label="Search location"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="lead-keywords" className="sr-only">Keywords</Label>
          <Input
            id="lead-keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Keywords (optional: apartments, offices, students)"
            disabled={searching}
            aria-label="Search keywords"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600 shrink-0"
          onClick={handleSearch}
          disabled={searching}
          aria-label="Find leads"
        >
          {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {searching ? 'Searching...' : 'Find Leads'}
        </Button>
      </div>
      {lastResult && (
        <p className="text-sm text-muted-foreground mt-3" aria-live="polite">
          Found <span className="font-semibold text-foreground">{lastResult.found}</span> leads
          {lastResult.created > 0 && ` — ${lastResult.created} saved to your leads list below`}.
        </p>
      )}
    </div>
  );
}