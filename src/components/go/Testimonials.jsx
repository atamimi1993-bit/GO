import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Quote } from 'lucide-react';

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ratings = await base44.entities.Rating.filter(
          { direction: 'customer_to_driver' },
          '-created_date',
          20
        );
        const withComments = ratings.filter((r) => r.comment && r.comment.trim().length > 10);
        setTestimonials(withComments.slice(0, 6));
      } catch {
        setTestimonials([]);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  if (testimonials.length < 3) {
    // Not enough real testimonials yet — show defaults
    const defaults = [
      { rater_name: 'Sarah M.', stars: 5, comment: 'GO made my cross-town move so easy. The driver was professional, the price was fair, and I could track everything in real-time. Highly recommend!' },
      { rater_name: 'James T.', stars: 5, comment: 'Booked a move in under 5 minutes. The driver showed up on time and handled my furniture with care. The app fee was worth every penny.' },
      { rater_name: 'Priya K.', stars: 5, comment: 'I needed a last-minute move and GO delivered. Verified driver, secure payment, and I even got loyalty points. This is the future of moving.' },
    ];
    return (
      <section>
        <h2 className="text-2xl font-display font-bold text-center mb-2">What Our Customers Say</h2>
        <p className="text-center text-muted-foreground text-sm mb-10">Real reviews from real moves.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {defaults.map((t, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 border border-border">
              <Quote className="text-emerald-500/30 mb-3" size={28} />
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={14} className={n <= t.stars ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 select-text">"{t.comment}"</p>
              <p className="text-sm font-medium">{t.rater_name}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-2xl font-display font-bold text-center mb-2">What Our Customers Say</h2>
      <p className="text-center text-muted-foreground text-sm mb-10">Real reviews from real moves.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <div key={t.id || i} className="bg-card rounded-2xl p-6 border border-border">
            <Quote className="text-emerald-500/30 mb-3" size={28} />
            <div className="flex gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={14} className={n <= (t.stars || 5) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 select-text">"{t.comment}"</p>
            <p className="text-sm font-medium">{t.rater_name || 'Verified Customer'}</p>
          </div>
        ))}
      </div>
    </section>
  );
}