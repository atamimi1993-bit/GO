import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Truck, ArrowRight, DollarSign, Clock, Shield } from 'lucide-react';

export default function DriverRecruitmentBanner() {
  const navigate = useNavigate();

  return (
    <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl overflow-hidden px-6 py-8 md:py-10 text-white relative">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-8 right-8 w-48 h-48 bg-emerald-300 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Truck size={22} />
            </div>
            <span className="text-sm font-semibold bg-amber-400/90 text-amber-950 px-3 py-1 rounded-full">$250 Sign-On Bonus</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">Drive with GO. Earn on your terms.</h2>
          <p className="text-white/90 text-sm mb-4 max-w-md mx-auto md:mx-0">
            Set your schedule, pick your jobs, and get paid fast. Regular and CDL drivers welcome.
          </p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start text-xs text-white/80 mb-4">
            <span className="flex items-center gap-1"><Clock size={14} /> Flexible hours</span>
            <span className="flex items-center gap-1"><DollarSign size={14} /> Per-job payouts</span>
            <span className="flex items-center gap-1"><Shield size={14} /> Insurance included</span>
          </div>
          <Button
            onClick={() => navigate('/drivers-wanted')}
            size="lg"
            className="bg-white text-emerald-700 hover:bg-white/90 rounded-xl px-6 h-12 text-base font-semibold"
          >
            Learn More <ArrowRight className="ml-2" size={18} />
          </Button>
        </div>
        <div className="hidden md:block shrink-0">
          <div className="w-40 h-40 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center">
            <Truck size={64} className="text-white/80" />
          </div>
        </div>
      </div>
    </section>
  );
}