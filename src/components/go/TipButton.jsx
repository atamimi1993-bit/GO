import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getCurrency } from '@/lib/pricing';

const PRESETS = [10, 20, 50];

export default function TipButton({ move }) {
  const [open, setOpen] = useState(false);
  const [customTip, setCustomTip] = useState('');
  const [paying, setPaying] = useState(false);
  const { toast } = useToast();

  const curr = getCurrency(move.currency || 'USD');

  const handleTip = async (amount) => {
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the editor preview.');
      return;
    }
    setPaying(true);
    try {
      const res = await base44.functions.invoke('create-tip-checkout', {
        move_request_id: move.id,
        tip_amount: amount,
      });
      window.location.href = res.data.url;
    } catch {
      toast({ title: 'Tip error', description: 'Could not start checkout.', variant: 'destructive' });
      setPaying(false);
    }
  };

  if (move.tip_paid) {
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mt-4 flex items-center gap-3">
        <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Tip Paid — Thank You!</p>
          <p className="text-xs text-muted-foreground">
            {curr.symbol}{(move.tip_amount || 0).toFixed(curr.decimals)} gratuity sent to {move.assigned_driver_name || 'your driver'}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Heart size={18} className="text-pink-500 fill-pink-500" />
        <h3 className="font-display font-bold text-sm">Tip Your Driver</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Show appreciation for a job well done. 100% goes to {move.assigned_driver_name || 'your driver'}.
      </p>

      {!open ? (
        <Button className="w-full bg-pink-500 hover:bg-pink-600" onClick={() => setOpen(true)}>
          <Heart size={16} className="mr-1" /> Add a Tip
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((amt) => (
              <Button
                key={amt}
                variant="outline"
                disabled={paying}
                onClick={() => handleTip(amt)}
                className="flex flex-col h-auto py-3"
              >
                <span className="text-lg font-bold">{curr.symbol}{amt}</span>
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              placeholder="Custom amount"
              value={customTip}
              onChange={(e) => setCustomTip(e.target.value)}
              disabled={paying}
            />
            <Button
              disabled={paying || !customTip || parseFloat(customTip) <= 0}
              onClick={() => handleTip(parseFloat(customTip))}
              className="bg-pink-500 hover:bg-pink-600"
            >
              {paying ? <Loader2 size={16} className="animate-spin" /> : `Tip ${curr.symbol}${customTip || ''}`}
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setOpen(false)}>
            Maybe later
          </Button>
        </div>
      )}
    </div>
  );
}