import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, Loader2, ImageIcon } from 'lucide-react';

export default function ReviewGallery() {
  const { data: ratings, isLoading } = useQuery({
    queryKey: ['photoReviews'],
    queryFn: async () => {
      const all = await base44.entities.Rating.filter({ direction: 'customer_to_driver' }, '-created_date', 50);
      return all.filter((r) => {
        try {
          const photos = JSON.parse(r.photo_urls || '[]');
          return photos.length > 0;
        } catch {
          return false;
        }
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!ratings || ratings.length === 0) return null;

  return (
    <section className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon size={20} className="text-emerald-500" />
        <h3 className="font-display font-bold text-lg">Customer Photo Reviews</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Real photos from completed moves</p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {ratings.map((rating) => {
          const photos = (() => {
            try { return JSON.parse(rating.photo_urls || '[]'); } catch { return []; }
          })();
          return photos.slice(0, 1).map((url, i) => (
            <div key={`${rating.id}-${i}`} className="shrink-0 w-48 rounded-xl border overflow-hidden bg-muted">
              <div className="relative aspect-square">
                <img src={url} alt="Review photo" className="w-full h-full object-cover" />
                <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded-full">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-[10px] font-semibold text-white">{rating.stars}</span>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{rating.rater_name || 'Customer'}</p>
                {rating.comment && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{rating.comment}</p>
                )}
              </div>
            </div>
          ));
        })}
      </div>
    </section>
  );
}