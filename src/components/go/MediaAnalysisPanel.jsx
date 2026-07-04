import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ScanSearch, Loader2, AlertTriangle, Package, Building2, Boxes, TrendingUp, Sparkles, CheckCircle2, RotateCw } from 'lucide-react';

const CLUTTER_LABELS = {
  minimal: 'Minimal',
  moderate: 'Moderate',
  heavy: 'Heavy',
  packed: 'Packed',
};

const CONFIDENCE_COLORS = {
  high: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  medium: 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400',
  low: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
};

export default function MediaAnalysisPanel({ media, onAnalysis }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (media.length === 0) return;
    setAnalyzing(true);
    try {
      const mediaUrls = media.map(m => m.url);
      const prompt = `You are a professional moving estimator analyzing customer photos and videos of their home and belongings.

Carefully examine ALL provided media and assess the following factors that affect move cost:

1. ACCESS COMPLEXITY: What type of building access do you see? Consider stairs, elevators, walkups, narrow hallways, tight doorways, outdoor steps.
2. CLUTTER LEVEL: How packed or cluttered does the space appear? (minimal, moderate, heavy, packed)
3. FRAGILE ITEMS: Count how many fragile or delicate items are visible (glass, mirrors, artwork, antiques, electronics).
4. SPECIALTY ITEMS: Identify any items requiring special handling (piano, safe, pool table, large TV, hot tub, heavy gym equipment, fragile antiques).
5. ESTIMATED ROOMS: How many rooms or distinct spaces are visible across all media?
6. DIFFICULTY MULTIPLIER: Based on all factors above, what overall difficulty multiplier should apply to the base move cost?
   - 0.90 = Easy (ground floor, minimal items, elevator, open spaces)
   - 1.00 = Standard (typical 1-2 bedroom, normal access, average amount of items)
   - 1.15 = Moderate (stairs, some heavy/specialty items, moderate clutter, some tight spaces)
   - 1.30 = Complex (walkup with multiple flights, heavy specialty items like piano or safe, very cluttered/packed, tight doorways/hallways)
7. SUMMARY: A 1-2 sentence human-readable summary of what you observed and why the multiplier was chosen.

Return your analysis as structured JSON.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: mediaUrls,
        response_json_schema: {
          type: 'object',
          properties: {
            difficulty_multiplier: { type: 'number' },
            access_complexity: { type: 'string' },
            clutter_level: { type: 'string', enum: ['minimal', 'moderate', 'heavy', 'packed'] },
            fragile_items_count: { type: 'number' },
            specialty_items: { type: 'array', items: { type: 'string' } },
            estimated_rooms: { type: 'number' },
            summary: { type: 'string' },
            confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
        },
      });

      const clamped = {
        ...res,
        difficulty_multiplier: Math.min(Math.max(res.difficulty_multiplier || 1, 0.9), 1.3),
      };
      setResult(clamped);
      onAnalysis(clamped);
      toast({ title: 'Media analysis complete!', description: clamped.summary });
    } catch (err) {
      toast({ title: 'Analysis failed', description: err.message || 'Could not analyze media. Try again.', variant: 'destructive' });
    }
    setAnalyzing(false);
  };

  const pctAdjust = result ? Math.round((result.difficulty_multiplier - 1) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="bg-blue-500/10 rounded-lg p-1.5">
          <ScanSearch size={18} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-display font-bold text-base">AI Move Complexity Analysis</h3>
          <p className="text-xs text-muted-foreground">Analyzes your photos & videos to adjust your estimate for stairs, clutter, fragile & specialty items.</p>
        </div>
      </div>

      {!result && !analyzing && (
        <Button onClick={handleAnalyze} disabled={media.length === 0} className="w-full bg-blue-600 hover:bg-blue-700">
          <ScanSearch size={16} className="mr-1" /> Analyze {media.length} Media {media.length === 1 ? 'Item' : 'Items'}
        </Button>
      )}

      {analyzing && (
        <div className="flex flex-col items-center gap-2 py-4">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">Analyzing your photos & videos for move complexity...</p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
              <TrendingUp size={12} className="mr-1" />
              {pctAdjust >= 0 ? `+${pctAdjust}%` : pctAdjust}% complexity
            </Badge>
            <Badge variant="secondary">
              <Building2 size={12} className="mr-1" /> {result.access_complexity}
            </Badge>
            <Badge variant="secondary">
              <Boxes size={12} className="mr-1" /> {CLUTTER_LABELS[result.clutter_level] || result.clutter_level} clutter
            </Badge>
            {result.fragile_items_count > 0 && (
              <Badge className="bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={12} className="mr-1" /> {result.fragile_items_count} fragile
              </Badge>
            )}
            {result.estimated_rooms > 0 && (
              <Badge variant="secondary">
                <Package size={12} className="mr-1" /> {result.estimated_rooms} rooms
              </Badge>
            )}
          </div>

          {result.specialty_items?.length > 0 && (
            <div className="flex items-start gap-2 text-xs">
              <Sparkles size={14} className="text-purple-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-muted-foreground">Specialty items: </span>
                <span className="font-medium">{result.specialty_items.join(', ')}</span>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground select-text">{result.summary}</p>

          <div className="flex items-center gap-2">
            <Badge className={CONFIDENCE_COLORS[result.confidence] || CONFIDENCE_COLORS.medium}>
              <CheckCircle2 size={12} className="mr-1" /> {result.confidence} confidence
            </Badge>
          </div>

          <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing} className="w-full">
            <RotateCw size={14} className="mr-1" /> Re-analyze
          </Button>
        </div>
      )}
    </div>
  );
}