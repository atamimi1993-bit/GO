import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Logo from '@/components/go/Logo';
import { ArrowRight, Package, Truck, Shield, DollarSign, Star, MapPin, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PullToRefresh from '@/components/go/PullToRefresh';
import AdBanner from '@/components/go/AdBanner';
import HomeStats from '@/components/go/HomeStats';
import Testimonials from '@/components/go/Testimonials';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function Home() {
  const navigate = useNavigate();
  const { scrollRef } = useOutletContext();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={async () => { await queryClient.invalidateQueries({ queryKey: ['currentUser'] }); }}>
    <div className="space-y-16">
      {/* Promotional Ad Banner */}
      <AdBanner audience="customers" />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 rounded-3xl overflow-hidden px-8 py-16 md:py-24 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 bg-emerald-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-56 h-56 bg-emerald-500 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="mb-6">
            <Logo size="lg" />
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black leading-tight mb-4">
            Move anything,<br />
            <span className="text-emerald-400">anywhere.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-lg">
            The easiest way to move your belongings — anywhere in the world. Get instant pricing, verified drivers, and real-time tracking — all in one app.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => navigate('/new-move')} size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-8 h-14 text-lg font-semibold w-full sm:w-auto">
              Start a Move <ArrowRight className="ml-2" size={20} />
            </Button>
            <Button onClick={() => navigate('/driver-hub')} size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 h-14 text-lg font-semibold w-full sm:w-auto">
              Become a Driver <Truck className="ml-2" size={20} />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section>
        <h2 className="text-2xl font-display font-bold text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Package, title: 'List Your Items', desc: 'Add items manually or upload a PDF inventory — we calculate weight and truck size.' },
            { icon: DollarSign, title: 'Get a Quote', desc: 'Submit your move details and get matched with a verified driver.' },
            { icon: Truck, title: 'Driver Accepts', desc: 'Verified local drivers with licensed trucks accept your job.' },
            { icon: Shield, title: 'Move with Confidence', desc: 'Sign our liability agreement and track your move from start to finish.' },
          ].map((step, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <step.icon className="text-emerald-600" size={24} />
              </div>
              <div className="text-xs font-bold text-emerald-600 mb-1">STEP {i + 1}</div>
              <h3 className="font-display font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <HomeStats />

      {/* Testimonials */}
      <Testimonials />

      {/* Why GO */}
      <section>
        <h2 className="text-2xl font-display font-bold text-center mb-2">Why Choose GO</h2>
        <p className="text-center text-muted-foreground text-sm mb-10">Everything you need for a smooth, stress-free move.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: DollarSign, title: 'Fair Pricing', desc: 'See your total price when your driver accepts — no hidden fees.' },
            { icon: Shield, title: 'Verified Drivers', desc: 'Every driver is background-checked with a valid license and insurance on file.' },
            { icon: MapPin, title: 'Real-time Tracking', desc: 'Watch your move progress live — from pickup to dropoff, every step of the way.' },
            { icon: CreditCard, title: 'Secure Payments', desc: 'Payments processed through Stripe with optional payment plans for larger moves.' },
          ].map((feat, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <feat.icon className="text-emerald-600" size={24} />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="grid md:grid-cols-2 gap-4">
        <Link to="/storage" className="bg-blue-500/10 rounded-2xl p-6 hover:shadow-md transition-shadow group">
          <h3 className="font-display font-bold text-lg mb-1">Need Storage?</h3>
          <p className="text-sm text-muted-foreground mb-3">Find climate-controlled storage facilities near your move.</p>
          <span className="text-blue-600 font-semibold text-sm group-hover:underline">Browse Storage →</span>
        </Link>
        <Link to="/help" className="bg-amber-500/10 rounded-2xl p-6 hover:shadow-md transition-shadow group">
          <h3 className="font-display font-bold text-lg mb-1">Need Help?</h3>
          <p className="text-sm text-muted-foreground mb-3">Visit our Help Center for guides, FAQs, and support.</p>
          <span className="text-amber-600 font-semibold text-sm group-hover:underline">Get Help →</span>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-6 pb-2 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} GO · <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link> · <Link to="/terms" className="underline hover:text-foreground">Privacy Policy</Link>
        </p>
      </footer>
    </div>
    </PullToRefresh>
  );
}