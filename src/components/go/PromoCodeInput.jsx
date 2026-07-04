import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Tag, Loader2, X, Check } from 'lucide-react';
import { getCurrency } from '@/lib/pricing';

export default function PromoCodeInput({ move, onApplied }) {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [applied, setApplied] = useState(null);
  const { toast } = useToast();

  const curr = getCurrency(move.currency || 'USD');

  const handleApply = async () => {
    if (!code.trim()) return;
    setValidating(true);
    try {
      const res = await base44.functions.invoke('create-move-checkout', {
        move_request_id: move.id,
        promo_code: code.trim(),
        validate_only: true,
      });
      setApplied(res.data);
      onApplied(res.data);
      toast({ title: 'Promo code applied!', description: `${res.data.discount_amount.toFixed(curr.decimals)} off your move.` });
    } catch (err) {
      toast({ title: 'Invalid promo code', description: err.response?.data?.error || 'Please check your code and try again.', variant: 'destructive' });
      setApplied(null);
      onApplied(null);
    }
    setValidating(false);
  };

  const handleRemove = () => {
    setApplied(null);
    setCode('');
    onApplied(null);
  };

  return (
    <div className="bg-card border rounded-2xl p-4 mt-4">
      {applied ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Check className="text-emerald-500" size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{applied.promo.code}</span>
                <Badge className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
                  {applied.promo.discount_percent}% off
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Save {curr.symbol}{applied.discount_amount.toFixed(curr.decimals)}
              </p>
            </div>
          </div>
          <button onClick={handleRemove} className="text-muted-foreground hover:text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Remove promo code">
            <X size={18} />
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">Promo Code</span>
          </div>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="flex-1 uppercase"
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            />
            <Button
              variant="outline"
              onClick={handleApply}
              disabled={validating || !code.trim()}
            >
              {validating ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}