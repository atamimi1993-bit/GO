import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, FileText, Loader2, CheckCircle2, PenTool } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CONTRACTS = {
  customer_service: {
    title: 'Customer Service Agreement',
    subtitle: 'GO Moving & Logistics — Service Contract',
    terms: [
      'This Service Agreement ("Agreement") is entered into between the customer ("Customer") and GO Moving & Logistics ("GO", "we", or "us"), a marketplace connecting customers with independent drivers for moving and logistics services.',
      '1. SERVICES: GO provides a platform that connects Customer with independent drivers for the transportation of Customer listed items. GO facilitates the booking, tracking, and payment of moving services.',
      '2. INSURANCE & LIABILITY: GO provides insurance coverage for all moves facilitated through our platform. In the event of any damage, loss, or theft of Customer items during the move, the assigned driver and/or the insurance coverage provided by GO shall be responsible for covering the cost of such damages, up to the declared value of the items.',
      '3. DAMAGE CLAIMS PROCESS: In the event of damaged, lost, or stolen items, Customer must report the issue through the app within 48 hours of delivery. The assigned driver will be contacted first to resolve the issue directly. If the driver is unable or unwilling to resolve the claim, GO insurance coverage will apply to reimburse the Customer for the declared value of the affected items.',
      '4. DRIVER RESPONSIBILITY: The assigned driver is an independent contractor responsible for the safe handling and transportation of Customer items. The driver carries their own insurance and is additionally covered under GO platform insurance. In the event of any incident, the driver and/or GO-provided insurance will cover the cost of damages as described in Section 2.',
      '5. ACCURATE ITEM LISTING: Customer confirms that all items are accurately listed with correct weights and descriptions. Significant discrepancies may result in price adjustments. Customer must declare the value of high-value items prior to the move.',
      '6. PROHIBITED ITEMS: Customer confirms that no prohibited, illegal, or hazardous materials are included in the shipment. GO reserves the right to refuse transport of any such items.',
      '7. PAYMENT: Customer agrees to pay the total price as displayed in the booking summary. Payment is processed through the GO platform via secure payment processing.',
      '8. CANCELLATION: Customer may cancel a move up to 24 hours before the scheduled move time for a full refund. Cancellations within 24 hours may be subject to a cancellation fee.',
      '9. HOLD HARMLESS: Customer agrees that GO, its agents, and partners shall not be held liable for any indirect, consequential, or incidental damages. The maximum liability for any claim shall not exceed the declared value of the affected items.',
      '10. ACKNOWLEDGMENT: By signing below, Customer acknowledges that they have read, understood, and agree to be bound by all terms of this Agreement.',
    ],
  },
  driver_service: {
    title: 'Driver Service Agreement',
    subtitle: 'GO Moving & Logistics — Independent Driver Contract',
    terms: [
      'This Driver Service Agreement ("Agreement") is entered into between the driver ("Driver") and GO Moving & Logistics ("GO", "we", or "us"), a marketplace connecting customers with independent drivers for moving and logistics services.',
      '1. INDEPENDENT CONTRACTOR: Driver is engaged as an independent contractor, not an employee of GO. Driver is responsible for their own taxes, licenses, and vehicle maintenance.',
      '2. INSURANCE COVERAGE: Driver acknowledges that GO provides insurance coverage for all moves facilitated through the platform. In the event of any damage, loss, or theft of customer items during a move assigned to Driver, Driver and/or the insurance coverage provided by GO shall be responsible for covering the cost of such damages.',
      '3. DRIVER RESPONSIBILITY FOR DAMAGES: If any customer items are damaged, lost, or stolen while in Driver custody during a move, Driver is responsible for resolving the claim. If Driver is unable or unwilling to resolve the claim directly with the customer, the cost of damages will be deducted from Drivers payout for the job, and/or GO-provided insurance coverage will apply.',
      '4. INSURANCE PROVIDED BY GO: GO provides insurance coverage to protect both the customer and the Driver. This coverage applies to damage, loss, or theft of customer items during transit. Driver acknowledges that this insurance is in addition to Drivers own insurance and does not replace it.',
      '5. PROFESSIONAL CONDUCT: Driver agrees to provide services in a professional, safe, and timely manner. Driver must follow all traffic laws, maintain a valid drivers license, and ensure their vehicle is roadworthy and properly registered.',
      '6. DOCUMENTATION: Driver must maintain and upload valid documents including drivers license, vehicle registration, and insurance. Driver must keep these documents current and updated.',
      '7. PAYOUTS: Driver will receive the agreed-upon payout for each completed move, minus applicable platform fees. Payouts are processed according to GO payment schedule. In the event of a damage claim, the cost may be deducted from Drivers payout as described in Section 3.',
      '8. CLAIMS PROCESS: In the event of a damage or loss claim, Driver agrees to cooperate with GO investigation process. Driver will be notified of any claims and given the opportunity to respond. If Driver is found responsible, the cost of damages will be deducted from Drivers payout.',
      '9. TERMINATION: GO reserves the right to suspend or terminate Drivers access to the platform for violations of this Agreement, safety concerns, or repeated customer complaints.',
      '10. ACKNOWLEDGMENT: By signing below, Driver acknowledges that they have read, understood, and agree to be bound by all terms of this Agreement, including the insurance and liability provisions described herein.',
    ],
  },
};

export default function ContractSign({
  contractType = 'customer_service',
  partyName,
  partyEmail,
  partyPhone,
  moveRequestId,
  driverProfileId,
  onSigned,
}) {
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState(partyName || '');
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(false);
  const { toast } = useToast();

  const contract = CONTRACTS[contractType];
  const isCustomer = contractType === 'customer_service';

  const handleSign = async () => {
    if (!agreed) {
      toast({ title: 'Please review and accept the terms', variant: 'destructive' });
      return;
    }
    if (!signatureName.trim()) {
      toast({ title: 'Please type your full name to sign', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const contractRecord = await base44.entities.Contract.create({
        party_name: partyName || signatureName,
        party_email: partyEmail,
        party_phone: partyPhone || null,
        contract_type: contractType,
        move_request_id: moveRequestId || null,
        driver_profile_id: driverProfileId || null,
        terms_version: '1.0',
        signature_name: signatureName.trim(),
        signed_at: new Date().toISOString(),
        status: 'active',
      });
      setSigned(true);
      toast({
        title: 'Contract signed',
        description: 'Your signed agreement has been recorded and saved to your records.',
      });
      onSigned?.(contractRecord);
    } catch (err) {
      toast({ title: 'Could not sign contract', description: err.message || 'Please try again.', variant: 'destructive' });
    }
    setSaving(false);
  };

  if (signed) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600 mb-3" size={32} />
        <h3 className="font-display font-bold text-base mb-1">Contract Signed Successfully</h3>
        <p className="text-sm text-muted-foreground">
          Your {contract.title.toLowerCase()} has been recorded and saved.
        </p>
        <div className="mt-4 bg-card border rounded-xl p-3 text-left">
          <p className="text-xs text-muted-foreground">Signed by</p>
          <p className="font-medium text-sm">{signatureName}</p>
          <p className="text-xs text-muted-foreground mt-1">{partyEmail}</p>
          <p className="text-xs text-muted-foreground mt-1">Signed: {new Date().toLocaleString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="text-primary" size={20} />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg">{contract.title}</h3>
          <p className="text-xs text-muted-foreground">{contract.subtitle}</p>
        </div>
      </div>

      {/* Contract body */}
      <div className="bg-muted rounded-xl p-4 text-sm text-foreground space-y-3 max-h-72 overflow-y-auto mb-4 select-text">
        {contract.terms.map((term, i) => (
          <p key={i} className="leading-relaxed">{i === 0 ? <strong>{term}</strong> : term}</p>
        ))}
      </div>

      {/* Insurance highlight */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4 flex items-start gap-3">
        <Shield className="text-primary shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-medium text-primary">Insurance Coverage Included</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isCustomer
              ? 'GO provides insurance coverage for your items during the move. If anything happens, the assigned driver and/or our insurance will cover the cost of damages.'
              : 'GO provides insurance coverage for customer items during your assigned moves. If any items are damaged or lost, you and/or GO-provided insurance will cover the cost of damages.'}
          </p>
        </div>
      </div>

      {/* Signature input */}
      <div className="mb-4">
        <label className="text-sm font-medium flex items-center gap-1 mb-1">
          <PenTool size={14} /> Type your full name to sign
        </label>
        <Input
          value={signatureName}
          onChange={(e) => setSignatureName(e.target.value)}
          placeholder="e.g. John Doe"
          className="font-display"
        />
      </div>

      {/* Agreement checkbox */}
      <div className="flex items-start gap-3 mb-4">
        <Checkbox checked={agreed} onCheckedChange={setAgreed} id="contract-agree" />
        <label htmlFor="contract-agree" className="text-sm text-foreground cursor-pointer leading-relaxed">
          I have read, understood, and agree to all terms of this {contract.title}. I acknowledge that my typed name above constitutes my legal electronic signature and that I am bound by the insurance and liability terms described in this agreement.
        </label>
      </div>

      <Button
        onClick={handleSign}
        disabled={saving || !agreed || !signatureName.trim()}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {saving
          ? <><Loader2 size={16} className="animate-spin mr-1" /> Signing...</>
          : <><PenTool size={16} className="mr-1" /> Sign Contract</>}
      </Button>
    </div>
  );
}