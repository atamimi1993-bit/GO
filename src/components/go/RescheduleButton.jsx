import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarClock, Loader2, Check, X, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function RescheduleButton({ move, currentUser, driverProfile, onRescheduled }) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState(move.move_time || '');
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  const isDriver = driverProfile?.id && driverProfile.id === move.assigned_driver_id;
  const role = isDriver ? 'driver' : 'customer';
  const myName = isDriver
    ? driverProfile.full_name
    : move.customer_name || currentUser?.full_name || currentUser?.email || 'Customer';

  const load = async () => {
    try {
      const reqs = await base44.entities.RescheduleRequest.filter(
        { move_request_id: move.id },
        '-created_date',
        20
      );
      setRequests(reqs);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [move.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proposedDate) return;
    setSubmitting(true);
    try {
      await base44.entities.RescheduleRequest.create({
        move_request_id: move.id,
        requested_by_id: currentUser.id,
        requested_by_name: myName,
        requested_by_role: role,
        original_date: move.move_date,
        original_time: move.move_time || '',
        proposed_date: proposedDate,
        proposed_time: proposedTime,
        reason,
        status: 'pending',
      });
      toast({ title: 'Reschedule requested', description: 'The other party will be notified.' });
      setProposedDate('');
      setReason('');
      setOpen(false);
      load();
    } catch {
      toast({ title: 'Error', description: 'Could not submit request.', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleRespond = async (req, accept) => {
    try {
      await base44.entities.RescheduleRequest.update(req.id, {
        status: accept ? 'accepted' : 'rejected',
        responded_by_id: currentUser.id,
        responded_at: new Date().toISOString(),
      });

      if (accept) {
        await base44.entities.MoveRequest.update(move.id, {
          move_date: req.proposed_date,
          move_time: req.proposed_time || move.move_time,
        });
        toast({ title: 'Reschedule accepted', description: 'Move date/time updated.' });
        onRescheduled?.();
      } else {
        toast({ title: 'Reschedule declined' });
      }
      load();
    } catch {
      toast({ title: 'Error', description: 'Could not respond.', variant: 'destructive' });
    }
  };

  const pendingForMe = requests.filter(
    (r) => r.status === 'pending' && r.requested_by_role !== role
  );

  return (
    <div className="bg-card border rounded-2xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock size={18} className="text-blue-500" />
        <h3 className="font-display font-bold text-sm">Reschedule</h3>
      </div>

      {/* Pending requests for me to respond to */}
      {pendingForMe.length > 0 && (
        <div className="space-y-2 mb-3">
          {pendingForMe.map((req) => (
            <div key={req.id} className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">
                {req.requested_by_name} ({req.requested_by_role}) requests:
              </p>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <span className="text-muted-foreground">
                  {format(parseISO(req.original_date), 'MMM d')}{req.original_time && ` ${req.original_time}`}
                </span>
                <ArrowRight size={14} className="text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400">
                  {format(parseISO(req.proposed_date), 'MMM d')}{req.proposed_time && ` ${req.proposed_time}`}
                </span>
              </div>
              {req.reason && <p className="text-xs text-muted-foreground mb-2">"{req.reason}"</p>}
              <div className="flex gap-2">
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-8" onClick={() => handleRespond(req, true)}>
                  <Check size={14} className="mr-1" /> Accept
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => handleRespond(req, false)}>
                  <X size={14} className="mr-1" /> Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past requests */}
      {requests.filter((r) => r.status !== 'pending').length > 0 && (
        <div className="space-y-1 mb-3">
          {requests.filter((r) => r.status !== 'pending').slice(0, 3).map((req) => (
            <div key={req.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`px-1.5 py-0.5 rounded ${req.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                {req.status}
              </span>
              <span>{format(parseISO(req.proposed_date), 'MMM d')}{req.proposed_time && ` ${req.proposed_time}`}</span>
              <span>by {req.requested_by_name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Request form toggle */}
      {!['completed', 'cancelled'].includes(move.status) && (
        <>
          {!open ? (
            <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
              <CalendarClock size={16} className="mr-1" /> Request Reschedule
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Proposed Date</Label>
                  <Input type="date" value={proposedDate} onChange={(e) => setProposedDate(e.target.value)} required />
                </div>
                <div>
                  <Label className="text-xs">Proposed Time</Label>
                  <Input type="time" value={proposedTime} onChange={(e) => setProposedTime(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Reason (optional)</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why the change?" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || !proposedDate} className="bg-blue-500 hover:bg-blue-600">
                  {submitting ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
                  Send Request
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}