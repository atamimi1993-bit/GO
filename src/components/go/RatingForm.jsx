import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function RatingForm({ move, direction, raterId, raterName, rateeId, rateeName, onSubmitted, onError }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const label = direction === 'customer_to_driver' ? 'Rate the Driver' : 'Rate the Customer';

  const handleSubmit = async () => {
    if (stars === 0) {
      toast({ title: 'Select a rating', description: 'Please tap a star to rate.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    let optimisticCalled = false;
    onSubmitted?.({ stars, comment: comment.trim(), _optimistic: true });
    optimisticCalled = true;
    try {
      await base44.entities.Rating.create({
        move_request_id: move.id,
        direction,
        rater_id: raterId,
        rater_name: raterName,
        ratee_id: rateeId,
        ratee_name: rateeName,
        stars,
        comment: comment.trim(),
      });
      toast({ title: 'Rating submitted!', description: `Thank you for rating ${rateeName}.` });
    } catch {
      toast({ title: 'Error', description: 'Could not submit rating. Please try again.', variant: 'destructive' });
      if (optimisticCalled) onError?.();
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-card border rounded-2xl p-5">
      <h4 className="font-display font-bold text-sm mb-1">{label}</h4>
      <p className="text-xs text-muted-foreground mb-3">
        {move.pickup_address} → {move.dropoff_address}
      </p>
      <div
        role="radiogroup"
        aria-label={`Star rating for ${rateeName}`}
        className="flex items-center gap-1 mb-4"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            tabIndex={stars === n ? 0 : -1}
            aria-label={`${n} star${n !== 1 ? 's' : ''} - ${['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][n - 1]}`}
            onClick={() => setStars(n)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                setStars(Math.min(5, (stars || 0) + 1));
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                setStars(Math.max(1, (stars || 0) - 1));
              }
            }}
            className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Star
              size={28}
              className={stars >= n ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}
            />
          </button>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">{stars > 0 ? `Selected: ${stars} stars` : 'No rating selected'}</span>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Leave a comment (optional)..."
        className="mb-3 min-h-[80px]"
      />
      <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600">
        {submitting ? <Loader2 size={16} className="animate-spin mr-1" /> : <Star size={16} className="mr-1" />}
        Submit Rating
      </Button>
    </div>
  );
}