import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function RentalRequestForm({ rental, renterName, renterEmail, renterPhone }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    requested_start_date: '',
    requested_end_date: '',
    message: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requested_start_date || !form.requested_end_date) {
      toast({ title: 'Dates required', description: 'Please select your rental dates.', variant: 'destructive' });
      return;
    }
    if (new Date(form.requested_end_date) < new Date(form.requested_start_date)) {
      toast({ title: 'Invalid dates', description: 'End date must be after start date.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.RentalRequest.create({
        vehicle_rental_id: rental.id,
        renter_name: renterName,
        renter_email: renterEmail,
        renter_phone: renterPhone || '',
        requested_start_date: form.requested_start_date,
        requested_end_date: form.requested_end_date,
        message: form.message.trim(),
        status: 'pending',
        owner_email: rental.owner_email,
        vehicle_title: `${rental.make} ${rental.model}`,
      });
      await base44.functions.invoke('notify-rental-request', {
        rental_id: rental.id,
        renter_name: renterName,
        renter_email: renterEmail,
        renter_phone: renterPhone || '',
        requested_start_date: form.requested_start_date,
        requested_end_date: form.requested_end_date,
        message: form.message.trim(),
        vehicle_title: `${rental.make} ${rental.model}`,
        owner_email: rental.owner_email,
      });
      toast({ title: 'Request sent!', description: 'The owner will review your dates and send a quote.' });
      setForm({ requested_start_date: '', requested_end_date: '', message: '' });
    } catch (err) {
      toast({ title: 'Request failed', description: err.message || 'Please try again.', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            value={form.requested_start_date}
            onChange={(e) => setForm(f => ({ ...f, requested_start_date: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            type="date"
            value={form.requested_end_date}
            onChange={(e) => setForm(f => ({ ...f, requested_end_date: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Message to owner (optional)</Label>
        <Textarea
          id="message"
          value={form.message}
          onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Tell the owner what you need the vehicle for..."
          className="min-h-[80px]"
        />
      </div>
      <Button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600">
        {submitting ? <Loader2 size={16} className="animate-spin mr-1" /> : <Send size={16} className="mr-1" />}
        Send Rental Request
      </Button>
    </form>
  );
}