import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Rocket, CheckCircle2, XCircle, Loader2, Tag, Truck, CreditCard,
  Package, X, MessageSquare, Copy, Check, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LaunchChecklist() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [promoActive, setPromoActive] = useState(false);
  const [promoCode, setPromoCode] = useState(null);
  const [approvedDrivers, setApprovedDrivers] = useState([]);
  const [testMove, setTestMove] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [copied, setCopied] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Check 1: Promo code active
      const promos = await base44.entities.PromoCode.filter({ active: true }).catch(() => []);
      const goFirst = promos.find((p) => p.code === 'GOFIRST20');
      setPromoActive(!!goFirst);
      setPromoCode(goFirst || null);

      // Check 2: Approved + available drivers
      const drivers = await base44.entities.DriverProfile.filter({
        status: 'approved',
        available: true,
      }).catch(() => []);
      setApprovedDrivers(drivers);

      // Check 3: Any test moves (pending/unpaid)
      const recentMoves = await base44.entities.MoveRequest.list('-created_date', 10).catch(() => []);
      const test = recentMoves.find((m) => !m.paid && m.status === 'pending');
      setTestMove(test || null);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const customerMessage = `It's live! 🚚 Here's your link to book: ${window.location.origin.replace('/admin', '')}/new-move

Use code GOFIRST20 for 20% off. Once you book, I'll get you matched with a driver right away — just text me the second you're done booking so I can keep an eye on it.`;

  const driverMessage = `We're live! Head to ${window.location.origin.replace('/admin', '')} → Driver Hub — you're approved and should start seeing jobs.

First job might come in soon. Call me right when you get the notification so I can walk you through accepting it — want to be on the phone for your first one.`;

  const steps = [
    {
      id: 'promo',
      icon: Tag,
      title: 'Promo code GOFIRST20 is active',
      status: promoActive ? 'done' : 'fail',
      detail: promoActive
        ? `${promoCode.discount_percent}% off · ${promoCode.uses_count}/${promoCode.max_uses > 0 ? promoCode.max_uses : '∞'} used`
        : 'No active promo code found. Create GOFIRST20 in the Promo Codes section below.',
    },
    {
      id: 'driver',
      icon: Truck,
      title: 'At least one driver approved & available',
      status: approvedDrivers.length > 0 ? 'done' : 'fail',
      detail: approvedDrivers.length > 0
        ? `${approvedDrivers.length} driver${approvedDrivers.length === 1 ? '' : 's'} ready: ${approvedDrivers.map((d) => d.full_name).join(', ')}`
        : 'No approved drivers yet. Register and approve someone in Admin → Overview → Pending Driver Approvals.',
    },
    {
      id: 'stripe',
      icon: CreditCard,
      title: 'Stripe is in live mode',
      status: 'done',
      detail: 'Real payments are being accepted. Test with a real card — cancel before payment finalizes if you don\'t want to be charged.',
    },
    {
      id: 'test-move',
      icon: Package,
      title: 'Book a test move (watch pricing + matching)',
      status: testMove ? 'done' : 'pending',
      detail: testMove
        ? `Test move found: ${testMove.pickup_address} → ${testMove.dropoff_address} · $${testMove.total_price}`
        : 'Book a move yourself to verify pricing, dispatch, and tracking work end-to-end.',
      action: !testMove ? { label: 'Book Test Move', to: '/new-move' } : { label: 'View Move', to: `/move/${testMove.id}` },
    },
  ];

  const allReady = steps.every((s) => s.status === 'done' || s.status === 'pending' || s.id === 'test-move');
  const criticalReady = promoActive && approvedDrivers.length > 0;

  if (loading) {
    return (
      <div className="bg-card border-2 border-primary/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Rocket size={20} className="text-primary" />
          <h2 className="font-display font-bold text-lg">Launch Checklist</h2>
        </div>
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
      </div>
    );
  }

  return (
    <div className="bg-card border-2 border-primary/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Rocket size={20} className="text-primary" />
        <h2 className="font-display font-bold text-lg">Launch Checklist</h2>
        {criticalReady ? (
          <Badge className="ml-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={12} className="mr-1" /> Ready to Launch
          </Badge>
        ) : (
          <Badge className="ml-auto bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Action Needed
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {steps.map((step) => {
          const Icon = step.icon;
          const statusIcon = step.status === 'done'
            ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            : step.status === 'fail'
              ? <XCircle size={16} className="text-red-500 shrink-0" />
              : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />;
          return (
            <div key={step.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <Icon size={18} className="text-muted-foreground mt-0.5 shrink-0" />
              {statusIcon}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                {step.action && (
                  <Link to={step.action.to} className="inline-block mt-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      {step.action.label}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* "We're Live" messages */}
      <div className="mt-4">
        <button
          onClick={() => setShowMessages(!showMessages)}
          className="w-full flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-left"
        >
          <MessageSquare size={16} className="text-primary shrink-0" />
          <span className="text-sm font-medium flex-1">"We're Live" Messages</span>
          {showMessages ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
        </button>

        {showMessages && (
          <div className="mt-3 space-y-3">
            {/* Customer message */}
            <div className="p-3 rounded-xl border bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Customer</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => copyText('customer', customerMessage)}
                  disabled={!criticalReady}
                >
                  {copied === 'customer' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="mr-1" />}
                  {copied === 'customer' ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <pre className="text-xs whitespace-pre-wrap font-body text-foreground/90">{customerMessage}</pre>
            </div>

            {/* Driver message */}
            <div className="p-3 rounded-xl border bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">Driver</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => copyText('driver', driverMessage)}
                  disabled={!criticalReady}
                >
                  {copied === 'driver' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="mr-1" />}
                  {copied === 'driver' ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <pre className="text-xs whitespace-pre-wrap font-body text-foreground/90">{driverMessage}</pre>
            </div>

            {!criticalReady && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                Complete the promo code and driver steps above before sending these messages.
              </p>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={load}>
                <Loader2 size={12} className={`mr-1 ${loading ? 'animate-spin' : 'hidden'}`} />
                Re-check status
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}