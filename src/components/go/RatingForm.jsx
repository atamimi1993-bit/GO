import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, Camera, X, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function RatingForm({ move, direction, raterId, raterName, rateeId, rateeName, onSubmitted, onError }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef(null);
  const { toast } = useToast();

  const label = direction === 'customer_to_driver' ? 'Rate the Driver' : 'Rate the Customer';

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (photos.length + files.length > 5) {
      toast({ title: 'Too many photos', description: 'Maximum 5 photos per review.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return file_url;
        })
      );
      setPhotos((prev) => [...prev, ...uploaded]);
    } catch (err) {
      toast({ title: 'Upload failed', description: 'Could not upload photos. Please try again.', variant: 'destructive' });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (stars === 0) {
      toast({ title: 'Select a rating', description: 'Please tap a star to rate.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    setSubmitted(true);
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
        photo_urls: JSON.stringify(photos),
      });
      toast({ title: 'Rating submitted!', description: `Thank you for rating ${rateeName}.` });
    } catch {
      toast({ title: 'Error', description: 'Could not submit rating. Please try again.', variant: 'destructive' });
      if (optimisticCalled) onError?.();
      setSubmitted(false);
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="bg-card border rounded-2xl p-5 text-center">
        <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={28} />
        <p className="font-medium text-sm">Rating submitted! Thank you.</p>
      </div>
    );
  }

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

      {/* Photo upload */}
      <div className="mb-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePhotoSelect}
        />
        <div className="flex items-center gap-2 mb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || photos.length >= 5}
          >
            {uploading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Camera size={14} className="mr-1" />}
            {uploading ? 'Uploading...' : 'Add Photos'}
          </Button>
          <span className="text-xs text-muted-foreground">{photos.length}/5 photos</span>
        </div>
        {photos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {photos.map((url, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img src={url} alt={`Review ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white"
                  aria-label="Remove photo"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600">
        {submitting ? <Loader2 size={16} className="animate-spin mr-1" /> : <Star size={16} className="mr-1" />}
        Submit Rating
      </Button>
    </div>
  );
}