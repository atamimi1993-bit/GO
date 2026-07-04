import React, { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PullToRefresh from '@/components/go/PullToRefresh';
import PageHeader from '@/components/go/PageHeader';
import {
  Truck, DollarSign, Clock, Shield, Star, Fuel, Users, Zap, TrendingUp,
  CheckCircle2, ArrowRight, Wallet, Briefcase, Award, Phone,
} from 'lucide-react';

function EarningsCalculator() {
  const [jobsPerWeek, setJobsPerWeek] = useState(5);
  const avgPayout = 180;
  const weekly = jobsPerWeek * avgPayout;
  const monthly = weekly * 4.33;
  const yearly = monthly * 12;

  return (
    <div className="bg-card border rounded-3xl p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="text-emerald-500" size={24} />
        <h3 className="font-display font-bold text-xl">Earnings Calculator</h3>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-muted-foreground">Jobs per week</label>
          <span className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">{jobsPerWeek}</span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={jobsPerWeek}
          onChange={(e) => setJobsPerWeek(Number(e.target.value))}
          className="w-full accent-emerald-500"
          aria-label="Jobs per week slider"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>1</span>
          <span>10</span>
          <span>20</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Weekly</p>
          <p className="text-lg md:text-xl font-display font-bold text-emerald-600 dark:text-emerald-400">${weekly.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Monthly</p>
          <p className="text-lg md:text-xl font-display font-bold text-emerald-600 dark:text-emerald-400">${monthly.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Yearly</p>
          <p className="text-lg md:text-xl font-display font-bold text-emerald-600 dark:text-emerald-400">${yearly.toLocaleString()}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Based on an average payout of ${avgPayout}/job. Actual earnings vary by job type, distance, and truck size.
      </p>
    </div>
  );
}

export default function DriversWanted() {
  const navigate = useNavigate();
  const { scrollRef } = useOutletContext();

  const benefits = [
    { icon: Clock, title: 'Set Your Own Schedule', desc: 'Work when you want. Accept jobs that fit your availability — no minimum hours required.' },
    { icon: DollarSign, title: 'Get Paid Per Job', desc: 'Transparent payouts before you accept. No surprises — see exactly what you earn upfront.' },
    { icon: Wallet, title: 'Fast Direct Deposits', desc: 'Stripe-connected payouts go straight to your bank account. Track every payout in the app.' },
    { icon: Truck, title: 'Any Truck Size Welcome', desc: 'Small, medium, large, or extra large — every truck qualifies. Don\'t have one? Rent through the app.' },
    { icon: Shield, title: 'Insurance Included', desc: 'GO provides insurance coverage for every assigned move. Drive with peace of mind.' },
    { icon: Award, title: 'CDL? Earn Even More', desc: 'CDL-certified drivers unlock freight and corporate logistics jobs with premium payouts.' },
  ];

  const steps = [
    { icon: Users, title: 'Register', desc: 'Create your driver profile with your license and insurance info.' },
    { icon: Shield, title: 'Get Approved', desc: 'Our team verifies your documents — usually within 24–48 hours.' },
    { icon: Briefcase, title: 'Browse Jobs', desc: 'Pick from available jobs in your area. See payout before accepting.' },
    { icon: DollarSign, title: 'Get Paid', desc: 'Complete the move and receive your payout via direct deposit.' },
  ];

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={async () => {}}>
      <div className="max-w-4xl mx-auto space-y-12">
        <PageHeader title="Drivers Wanted" isRoot={false} />

        {/* Hero */}
        <section className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl overflow-hidden px-6 py-12 md:py-16 text-white text-center">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-64 h-64 bg-emerald-300 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-48 h-48 bg-teal-400 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <Badge className="bg-white/20 text-white border-0 mb-4 text-sm">
              <Zap size={14} className="mr-1" /> Now accepting drivers nationwide
            </Badge>
            <h1 className="text-3xl md:text-5xl font-display font-black mb-4">
              Drive with GO.<br />Earn on your terms.
            </h1>
            <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
              Join thousands of drivers earning with their trucks. Set your schedule, pick your jobs, and get paid fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate('/driver-register')}
                size="lg"
                className="bg-white text-emerald-700 hover:bg-white/90 rounded-xl px-8 h-14 text-lg font-semibold"
              >
                Apply Now <ArrowRight className="ml-2" size={20} />
              </Button>
              <Button
                onClick={() => {
                  document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
                }}
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 h-14 text-lg font-semibold"
              >
                Estimate Earnings
              </Button>
            </div>
          </div>
        </section>

        {/* Sign-on bonus banner */}
        <section className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-6 text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award size={24} />
            <h2 className="font-display font-bold text-xl">Sign-On Bonus: $250</h2>
          </div>
          <p className="text-white/90 text-sm">
            The first 50 drivers who join and complete their first job this month get a $250 bonus added to their first payout.
          </p>
        </section>

        {/* Benefits */}
        <section>
          <h2 className="text-2xl font-display font-bold text-center mb-2">Why Drive with GO?</h2>
          <p className="text-center text-muted-foreground text-sm mb-8">Everything you need to earn more with your truck.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
                  <b.icon className="text-emerald-600 dark:text-emerald-400" size={22} />
                </div>
                <h3 className="font-display font-bold text-base mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Earnings Calculator */}
        <section id="calculator">
          <EarningsCalculator />
        </section>

        {/* How to Join */}
        <section>
          <h2 className="text-2xl font-display font-bold text-center mb-2">How to Get Started</h2>
          <p className="text-center text-muted-foreground text-sm mb-8">Four simple steps to your first payout.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((step, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold font-display text-sm">
                    {i + 1}
                  </div>
                  <step.icon className="text-emerald-600 dark:text-emerald-400" size={20} />
                </div>
                <h3 className="font-display font-bold text-base mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CDL section */}
        <section className="bg-card border rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Fuel className="text-blue-500" size={24} />
            <h2 className="font-display font-bold text-xl">CDL Drivers — Earn Premium Rates</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Have a Class A or B CDL? Unlock higher-paying freight and corporate logistics jobs with bigger payouts.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={18} />
              <p className="text-sm">Freight hauling jobs with premium rates</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={18} />
              <p className="text-sm">Corporate logistics contracts — steady work</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={18} />
              <p className="text-sm">Priority job matching for CDL drivers</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={18} />
              <p className="text-sm">Dedicated freight dashboard & reporting</p>
            </div>
          </div>
        </section>

        {/* Vehicle rental note */}
        <section className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Truck className="text-blue-500" size={24} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display font-bold text-base mb-1">Don't have a truck?</h3>
            <p className="text-sm text-muted-foreground">Rent one through the app and start driving right away.</p>
          </div>
          <Button variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400" onClick={() => navigate('/rentals')}>
            Browse Rentals <ArrowRight size={16} className="ml-1" />
          </Button>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 md:p-12 text-white text-center">
          <Star size={32} className="mx-auto mb-4 text-yellow-300" />
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">Ready to Start Earning?</h2>
          <p className="text-white/90 mb-6 max-w-md mx-auto">
            Join GO today and get your $250 sign-on bonus after your first completed job.
          </p>
          <Button
            onClick={() => navigate('/driver-register')}
            size="lg"
            className="bg-white text-emerald-700 hover:bg-white/90 rounded-xl px-8 h-14 text-lg font-semibold"
          >
            Apply to Drive <ArrowRight className="ml-2" size={20} />
          </Button>
        </section>

        {/* Questions */}
        <section className="text-center pb-4">
          <p className="text-sm text-muted-foreground mb-3">Have questions before applying?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/help">
              <Button variant="outline" className="min-h-[44px]">
                Visit Help Center
              </Button>
            </Link>
            <Link to="/support">
              <Button variant="outline" className="min-h-[44px]">
                <Phone size={16} className="mr-2" /> Contact Support
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </PullToRefresh>
  );
}