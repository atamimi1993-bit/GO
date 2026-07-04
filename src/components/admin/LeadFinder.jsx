import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Sparkles, Globe } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
];

export default function LeadFinder({ onLeadsGenerated }) {
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState('');
  const [searching, setSearching] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [allStatesMode, setAllStatesMode] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, state: '', totalFound: 0, totalCreated: 0 });
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

  const handleAllStates = async () => {
    setAllStatesMode(true);
    setSearching(true);
    const totalFound = { count: 0, created: 0 };
    setProgress({ current: 0, total: STATES.length, state: STATES[0], totalFound: 0, totalCreated: 0 });

    for (let i = 0; i < STATES.length; i++) {
      const state = STATES[i];
      setProgress((p) => ({ ...p, current: i, state, totalFound: totalFound.count, totalCreated: totalFound.created }));
      try {
        const res = await base44.functions.invoke('find-leads', {
          location: state,
          keywords: keywords.trim(),
        });
        totalFound.count += res.data.found || 0;
        totalFound.created += res.data.created || 0;
        setProgress((p) => ({ ...p, totalFound: totalFound.count, totalCreated: totalFound.created }));
        if (onLeadsGenerated) onLeadsGenerated();
      } catch (err) {
        console.error(`Failed for ${state}:`, err);
      }
    }

    setProgress((p) => ({ ...p, current: STATES.length, state: 'Done', totalFound: totalFound.count, totalCreated: totalFound.created }));
    toast({ title: 'All 50 states complete', description: `${totalFound.count} leads found, ${totalFound.created} saved.` });
    setSearching(false);
  };

  const stopAllStates = () => {
    setSearching(false);
    setAllStatesMode(false);
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

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
            onKeyDown={(e) => { if (e.key === 'Enter' && !searching) handleSearch(); }}
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
            onKeyDown={(e) => { if (e.key === 'Enter' && !searching) handleSearch(); }}
          />
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600 shrink-0"
          onClick={handleSearch}
          disabled={searching}
          aria-label="Find leads"
        >
          {searching && !allStatesMode ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {searching && !allStatesMode ? 'Searching...' : 'Find Leads'}
        </Button>
      </div>

      {/* All 50 States Mode */}
      {allStatesMode ? (
        <div className="mt-4 border-t pt-4" aria-live="polite">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {searching ? `Searching ${progress.state}...` : `Complete — all 50 states done`}
            </span>
            <span className="text-sm text-muted-foreground">{progress.current}/{progress.total}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">
              {progress.totalFound} leads found · {progress.totalCreated} saved so far
            </p>
            {searching && (
              <Button size="sm" variant="outline" onClick={stopAllStates}>
                Stop
              </Button>
            )}
          </div>
        </div>
      ) : (
        <button
          className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          onClick={handleAllStates}
          disabled={searching}
        >
          <Globe size={12} /> Search all 50 states
        </button>
      )}

      {lastResult && !allStatesMode && (
        <p className="text-sm text-muted-foreground mt-3" aria-live="polite">
          Found <span className="font-semibold text-foreground">{lastResult.found}</span> leads
          {lastResult.created > 0 && ` — ${lastResult.created} saved to your leads list below`}.
        </p>
      )}
    </div>
  );
}