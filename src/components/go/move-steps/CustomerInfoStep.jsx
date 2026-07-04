import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone } from 'lucide-react';

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
      </div>
    </div>
  );
}