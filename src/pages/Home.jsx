import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Logo from '@/components/go/Logo';
import { ArrowRight, Package, Truck, Shield, DollarSign, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  return (
    <div className="space-y-16">
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
            The easiest way to move your belongings. Get instant pricing, verified drivers, and real-time tracking — all in one app.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/new-move">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-8 h-14 text-lg font-semibold w-full sm:w-auto">
                Start a Move <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link to="/driver-hub">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 h-14 text-lg font-semibold w-full sm:w-auto">
                Become a Driver <Truck className="ml-2" size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section>
        <h2 className="text-2xl font-display font-bold text-center mb-10">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: Package, title: 'List Your Items', desc: 'Add items manually or upload a PDF inventory — we calculate weight and truck size.' },
            { icon: DollarSign, title: 'Get a Quote', desc: 'Instant pricing with mileage, fuel, tax, and fees — no surprises.' },
            { icon: Truck, title: 'Driver Accepts', desc: 'Verified local drivers with licensed trucks accept your job.' },
            { icon: Shield, title: 'Move with Confidence', desc: 'Sign our liability agreement and track your move from start to finish.' },
          ].map((step, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <step.icon className="text-emerald-600" size={24} />
              </div>
              <div className="text-xs font-bold text-emerald-600 mb-1">STEP {i + 1}</div>
              <h3 className="font-display font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white rounded-2xl border border-gray-100 p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '10K+', label: 'Moves Completed' },
            { value: '500+', label: 'Verified Drivers' },
            { value: '4.9', label: 'Average Rating', icon: Star },
            { value: '50', label: 'States Covered' },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-3xl font-display font-black text-gray-900 flex items-center justify-center gap-1">
                {stat.value}
                {stat.icon && <stat.icon size={20} className="text-yellow-500 fill-yellow-500" />}
              </div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="grid md:grid-cols-2 gap-4">
        <Link to="/storage" className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 hover:shadow-md transition-shadow group">
          <h3 className="font-display font-bold text-lg mb-1">Need Storage?</h3>
          <p className="text-sm text-gray-600 mb-3">Find climate-controlled storage facilities near your move.</p>
          <span className="text-blue-600 font-semibold text-sm group-hover:underline">Browse Storage →</span>
        </Link>
        <Link to="/help" className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-6 hover:shadow-md transition-shadow group">
          <h3 className="font-display font-bold text-lg mb-1">Need Help?</h3>
          <p className="text-sm text-gray-600 mb-3">Visit our Help Center for guides, FAQs, and support.</p>
          <span className="text-amber-600 font-semibold text-sm group-hover:underline">Get Help →</span>
        </Link>
      </section>
    </div>
  );
}