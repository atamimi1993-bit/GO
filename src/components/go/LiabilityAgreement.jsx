import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield } from 'lucide-react';

export default function LiabilityAgreement({ onSign }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
          <Shield className="text-amber-600 dark:text-amber-400" size={20} />
        </div>
        <h3 className="font-display font-bold text-lg">Liability Agreement</h3>
      </div>
      <div className="bg-muted rounded-xl p-4 text-sm text-foreground space-y-3 max-h-48 overflow-y-auto mb-4">
        <p><strong>By signing this agreement, you acknowledge and agree to the following terms:</strong></p>
        <p>1. You agree to work with GO and its network of independent drivers for the transportation of your listed items.</p>
        <p>2. In the event of any stolen, damaged, or lost items during the move, you must first contact the driver(s) assigned to your job to resolve the issue directly.</p>
        <p>3. If the assigned driver(s) are unwilling to resolve the dispute, the cost of the damaged, lost, or stolen items will be deducted from the driver's payout for the job.</p>
        <p>4. GO acts as a marketplace connecting customers with independent drivers. GO is not directly liable for items during transit but will facilitate dispute resolution.</p>
        <p>5. All items should be accurately listed with correct weights. Significant discrepancies may result in price adjustments.</p>
        <p>6. You confirm that no prohibited, illegal, or hazardous materials are included in your shipment.</p>
      </div>
      <div className="flex items-start gap-3 mb-4">
        <Checkbox checked={agreed} onCheckedChange={setAgreed} id="liability" />
        <label htmlFor="liability" className="text-sm text-foreground cursor-pointer leading-relaxed">
          I have read, understand, and agree to the terms above. I acknowledge that I must contact the assigned driver first for any damage or loss claims.
        </label>
      </div>
      <Button
        onClick={onSign}
        disabled={!agreed}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
      >
        Sign Agreement & Continue
      </Button>
    </div>
  );
}