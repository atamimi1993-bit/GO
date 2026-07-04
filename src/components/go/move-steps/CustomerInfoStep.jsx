import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Gift } from 'lucide-react';

export default function CustomerInfoStep({ form, setForm }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Your Information</h2>
        <p className="text-muted-foreground text-sm">Let's start with your contact details.</p>
      </div>
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div>
          <Label className="flex items-center gap-2"><User size={14} /> Full Name</Label>
          <Input
            value={form.customer_name}
            onChange={e => setForm({ ...form, customer_name: e.target.value })}
            placeholder="John Doe"
          />
        </div>
        <div>
          <Label className="flex items-center gap-2"><Mail size={14} /> Email</Label>
          <Input
            type="email"
            value={form.customer_email}
            onChange={e => setForm({ ...form, customer_email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>
        <div>
          <Label className="flex items-center gap-2"><Phone size={14} /> Phone</Label>
          <Input
            type="tel"
            value={form.customer_phone}
            onChange={e => setForm({ ...form, customer_phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div className="pt-2 border-t">
          <Label className="flex items-center gap-2"><Gift size={14} /> Referral Code (Optional)</Label>
          <Input
            value={form.referral_code || ''}
            onChange={e => setForm({ ...form, referral_code: e.target.value.toUpperCase().trim() })}
            placeholder="GO-XXXXXXXX"
            className="uppercase tracking-wider"
          />
          <p className="text-xs text-muted-foreground mt-1">Referred by a friend? Enter their code to earn bonus rewards.</p>
        </div>
      </div>
    </div>
  );
}