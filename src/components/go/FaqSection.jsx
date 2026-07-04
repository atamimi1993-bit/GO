import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'How are prices calculated?',
    a: 'Your quote is based on distance, total item weight, truck size needed, fuel costs, and tolls. You can also choose between self-service, standard, or full-service moving. The final price is locked in once your driver accepts the job — no hidden fees.',
  },
  {
    q: 'What areas do you serve?',
    a: 'GO operates wherever verified drivers are available. You can request a move from any pickup address to any dropoff address — simply enter your locations when booking and we will match you with a driver in your area.',
  },
  {
    q: 'Are the drivers verified?',
    a: 'Yes. Every driver passes a review that checks their license, insurance, and truck documentation before they can accept jobs. Drivers also receive ratings from customers after each completed move.',
  },
  {
    q: 'Can I pay in installments?',
    a: 'For larger moves, you can enable a payment plan at checkout. A deposit is due upfront to secure your slot, and the remaining balance can be split into installments with automatic reminders.',
  },
  {
    q: 'How do I track my move?',
    a: 'Once your driver starts the job, you will see live location updates on your move detail page — from en route to pickup, loaded, and delivered. Milestone notifications keep you informed every step of the way.',
  },
];

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left min-h-[56px] hover:bg-muted/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-display font-bold text-sm md:text-base">{item.q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section>
      <h2 className="text-2xl font-display font-bold text-center mb-2">Frequently Asked Questions</h2>
      <p className="text-center text-muted-foreground text-sm mb-8">Answers to the most common questions about moving with GO.</p>
      <div className="max-w-2xl mx-auto space-y-3">
        {FAQS.map((item, i) => (
          <FaqItem
            key={i}
            item={item}
            isOpen={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
          />
        ))}
      </div>
    </section>
  );
}