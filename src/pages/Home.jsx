import React, { useState, useEffect, lazy, Suspense, useCallback, memo } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Logo from '@/components/go/Logo';
import { ArrowRight, Package, Truck, Shield, DollarSign, Star, MapPin, CreditCard, Zap, History, Bookmark, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PullToRefresh from '@/components/go/PullToRefresh';
import AdBanner from '@/components/go/AdBanner';
import FaqSection from '@/components/go/FaqSection';
import { Gift } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appParams } from '@/lib/app-params';

const HomeStats = memo(lazy(() => import('@/components/go/HomeStats')));
const CustomerQuickActions = memo(lazy(() => import('@/components/go/CustomerQuickActions')));
const Testimonials = memo(lazy(() => import('@/components/go/Testimonials')));
const ReviewGallery = memo(lazy(() => import('@/components/go/ReviewGallery')));
const DriverRecruitmentBanner = memo(lazy(() => import('@/components/go/DriverRecruitmentBanner')));
const CustomerChatWidget = memo(lazy(() => import('@/components/go/CustomerChatWidget')));

const LazyFallback = () => <div className="animate-pulse bg-muted rounded-2xl h-32 w-full" />;

export default function Home() {
  const navigate = useNavigate();
  const { scrollRef } = useOutletContext();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  }, [queryClient]);

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={handleRefresh}>
    <div className="space-y-16">
      {/* Promotional Ad Banner */}
      <AdBanner audience="customers" />

      {/* Hero */}
      <section className="relative rounded-[2rem] overflow-hidden px-6 md:px-12 py-16 md:py-24 text-white border border-white/10" style={{ background: 'linear-gradient(135deg, hsl(225 47% 8%), hsl(220 45% 5%))' }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[100px] opacity-40 animate-glow-pulse" style={{ background: 'hsl(160 84% 52%)' }} />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full blur-[100px] opacity-25 animate-glow-pulse" style={{ background: 'hsl(265 85% 65%)', animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-0 w-64 h-64 rounded-full blur-[80px] opacity-20 animate-float" style={{ background: 'hsl(190 90% 50%)' }} />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-6">
            <Logo size="lg" />
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black leading-[1.05] mb-5 tracking-tight">
            Move anything,<br />
            <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">anywhere.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-8 max-w-lg leading-relaxed">
            The easiest way to move your belongings — anywhere in the world. Get instant pricing, verified drivers, and real-time tracking — all in one app.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => navigate('/new-move')} size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 h-14 text-lg font-semibold w-full sm:w-auto glow-primary border border-white/10">
              Start a Move <ArrowRight className="ml-2" size={20} />
            </Button>
            <Button onClick={() => navigate('/quick-delivery')} size="lg" className="glass-nav text-white hover:bg-white/15 rounded-xl px-8 h-14 text-lg font-semibold w-full sm:w-auto border border-white/15">
              Quick Delivery <Zap className="ml-2" size={20} />
            </Button>
            <Button onClick={() => navigate('/driver-hub')} size="lg" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white rounded-xl px-8 h-14 text-lg font-semibold w-full sm:w-auto border border-white/10">
              Become a Driver <Truck className="ml-2" size={20} />
            </Button>
          </div>
        </div>
      </section>

      {/* Track / Re-book Quick Actions */}
      <section>
        <h2 className="text-xl font-display font-bold mb-4">Pick up where you left off</h2>
        <Suspense fallback={<LazyFallback />}>
          <CustomerQuickActions />
        </Suspense>
      </section>

      {/* Quick Access for Customers */}
      <section>
        <h2 className="text-xl font-display font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'New Move', icon: Package, path: '/new-move', accent: 'bg-emerald-500/10 text-emerald-600' },
            { label: 'Quick Delivery', icon: Zap, path: '/quick-delivery', accent: 'bg-amber-500/10 text-amber-600' },
            { label: 'Delivery History', icon: History, path: '/delivery-history', accent: 'bg-indigo-500/10 text-indigo-600' },
            { label: 'Saved Addresses', icon: Bookmark, path: '/saved-addresses', accent: 'bg-purple-500/10 text-purple-600' },
            { label: 'Storage', icon: MapPin, path: '/storage', accent: 'bg-blue-500/10 text-blue-600' },
            { label: 'Support', icon: Headphones, path: '/support', accent: 'bg-rose-500/10 text-rose-600' },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl glass-card hover:border-primary/40 hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.accent}`}>
                <item.icon size={22} />
              </div>
              <span className="text-xs font-medium text-center">{item.label}</span>
            </Link>
          ))}
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
            <div key={i} className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <step.icon className="text-primary" size={24} />
              </div>
              <div className="text-xs font-bold text-primary mb-1">STEP {i + 1}</div>
              <h3 className="font-display font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Driver recruitment banner */}
      <Suspense fallback={<LazyFallback />}>
        <DriverRecruitmentBanner />
      </Suspense>

      {/* Stats */}
      <Suspense fallback={<LazyFallback />}>
        <HomeStats />
      </Suspense>

      {/* Testimonials */}
      <Suspense fallback={<LazyFallback />}>
        <Testimonials />
      </Suspense>

      {/* Customer photo reviews */}
      <Suspense fallback={<LazyFallback />}>
        <ReviewGallery />
      </Suspense>

      {/* FAQ */}
      <FaqSection />

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
            <div key={i} className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feat.icon className="text-primary" size={24} />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="grid md:grid-cols-2 gap-4">
        <Link to="/storage" className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all group">
          <h3 className="font-display font-bold text-lg mb-1">Need Storage?</h3>
          <p className="text-sm text-muted-foreground mb-3">Find climate-controlled storage facilities near your move.</p>
          <span className="text-primary font-semibold text-sm group-hover:underline">Browse Storage →</span>
        </Link>
        <Link to="/help" className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all group">
          <h3 className="font-display font-bold text-lg mb-1">Need Help?</h3>
          <p className="text-sm text-muted-foreground mb-3">Visit our Help Center for guides, FAQs, and support.</p>
          <span className="text-primary font-semibold text-sm group-hover:underline">Get Help →</span>
        </Link>
      </section>

      {/* Refer a Friend */}
      <section>
        <Link to="/profile" className="block bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white text-center hover:shadow-xl transition-shadow group">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gift size={28} />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Refer a Friend, Earn 500 Points</h2>
          <p className="text-white/90 text-sm mb-4 max-w-md mx-auto">
            Share your referral code with friends. When they complete a move, you both earn 500 bonus loyalty points.
          </p>
          <span className="inline-block bg-white text-emerald-600 font-semibold text-sm px-6 py-2 rounded-full group-hover:bg-white/90 transition-colors">
            Get Your Referral Code →
          </span>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-6 pb-2 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} GO · <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link> · <Link to="/terms" className="underline hover:text-foreground">Privacy Policy</Link> · <a href={`https://base44.com/app/${appParams.appId}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Edit with Base44</a>
        </p>
      </footer>
    </div>
      <CustomerChatWidget />
    </PullToRefresh>
  );
}