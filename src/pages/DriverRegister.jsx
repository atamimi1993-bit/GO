import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Upload, Loader2, FileText, Truck, Gift } from 'lucide-react';
import MobileSelect from '@/components/go/MobileSelect';
import { Switch } from '@/components/ui/switch';
import ContractSign from '@/components/go/ContractSign';
import PageHeader from '@/components/go/PageHeader';

export default function DriverRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [step, setStep] = useState('form');
  const [signedContract, setSignedContract] = useState(null);
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', license_number: '', license_expiry: '',
    service_area: '', company_name: '',
    cdl_certified: false, cdl_class: 'None',
    license_doc_url: '', insurance_doc_url: '', profile_photo_url: '',
    referred_by_code: searchParams.get('ref') || '',
    sign_on_bonus_eligible: true,
  });
  const [truck, setTruck] = useState({
    make: '', model: '', year: '', license_plate: '', size_category: 'medium',
    registration_doc_url: '', inspection_doc_url: '',
    exterior_photo_url: '', interior_photo_url: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setForm(f => ({ ...f, full_name: u.full_name || '', email: u.email || '' }));
    }).catch(() => {});
  }, []);

  const handleUpload = async (field, e, target = 'form') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(u => ({ ...u, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (target === 'truck') {
        setTruck(t => ({ ...t, [field]: file_url }));
      } else {
        setForm(f => ({ ...f, [field]: file_url }));
      }
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
    setUploading(u => ({ ...u, [field]: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone || !form.license_number) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    if (!truck.exterior_photo_url || !truck.interior_photo_url) {
      toast({ title: 'Vehicle photos required', description: 'Please upload both exterior and interior photos of your truck.', variant: 'destructive' });
      return;
    }
    setStep('contract');
  };

  const handleContractSigned = async (contractRecord) => {
    setSignedContract(contractRecord);
    setSaving(true);
    navigate('/driver-hub', { state: { pendingApplication: true } });
    try {
      const driver = await base44.entities.DriverProfile.create(form);
      if (contractRecord?.id) {
        await base44.entities.Contract.update(contractRecord.id, { driver_profile_id: driver.id });
      }
      if (truck.make && truck.model && truck.license_plate) {
        await base44.entities.Truck.create({
          ...truck,
          year: truck.year ? Number(truck.year) : undefined,
          driver_profile_id: driver.id,
          company_name: form.company_name || undefined,
        });
      }
      // Create a pending Referral record if referred by another driver
      if (form.referred_by_code) {
        try {
          const referrers = await base44.entities.DriverProfile.filter({ referral_code: form.referred_by_code });
          if (referrers.length > 0 && referrers[0].email !== form.email) {
            await base44.entities.Referral.create({
              referral_code: form.referred_by_code,
              referrer_email: referrers[0].email,
              referred_email: form.email,
              status: 'pending',
              bonus_points: 0,
            });
          }
        } catch (err) {
          console.error('Failed to create referral record:', err);
        }
      }
      toast({ title: 'Application submitted!', description: form.referred_by_code ? 'Your profile and signed contract are under review. Sign-on & referral bonuses will be awarded after your first completed job!' : 'Your profile and signed contract are under review.' });
    } catch {
      toast({ title: 'Submission failed', description: 'Please try again from Driver Hub.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const FileUploadField = ({ label, field, accept, target }) => {
    const source = target === 'truck' ? truck : form;
    return (
      <div>
        <Label>{label}</Label>
        <div className="flex items-center gap-2 mt-1">
          {source[field] ? (
            <span className="text-emerald-600 text-sm font-medium">✓ Uploaded</span>
          ) : (
            <label className="cursor-pointer" htmlFor={`upload-${field}`} aria-label={`Upload ${label.toLowerCase()}`}>
              <Button variant="outline" size="sm" disabled={uploading[field]} asChild>
                <span>{uploading[field] ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} className="mr-1" />}{uploading[field] ? 'Uploading...' : 'Upload'}</span>
              </Button>
              <input id={`upload-${field}`} type="file" accept={accept || '.pdf,.jpg,.png'} className="hidden" onChange={e => handleUpload(field, e, target)} />
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title={step === 'contract' ? 'Driver Service Agreement' : 'Driver Registration'} isRoot={false} onBack={() => step === 'contract' ? setStep('form') : navigate(-1)} />
      {step === 'form' ? (
        <>
      <p className="text-muted-foreground text-sm mb-6">Fill in your details and upload required documents.</p>

      {referralCode && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4 flex items-center gap-3">
          <Gift size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Referred by: {referralCode}</p>
            <p className="text-xs text-muted-foreground">You'll receive a $250 sign-on bonus after your first completed job!</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label htmlFor="full_name">Full Name *</Label><Input id="full_name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label htmlFor="email">Email *</Label><Input id="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="phone">Phone *</Label><Input id="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" /></div>
          <div><Label htmlFor="company">Company (optional)</Label><Input id="company" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
        </div>
        <div><Label htmlFor="service_area">Service Area *</Label><Input id="service_area" value={form.service_area} onChange={e => setForm({ ...form, service_area: e.target.value })} placeholder="e.g. London, UK or Tokyo, Japan" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="license_number">License Number *</Label><Input id="license_number" value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} /></div>
          <div><Label htmlFor="license_expiry">License Expiry *</Label><Input id="license_expiry" type="date" value={form.license_expiry} onChange={e => setForm({ ...form, license_expiry: e.target.value })} /></div>
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between bg-amber-500/5 rounded-xl p-4">
            <div>
              <p className="font-medium text-sm">CDL Certified?</p>
              <p className="text-xs text-muted-foreground">Required for freight and corporate logistics jobs.</p>
            </div>
            <Switch checked={form.cdl_certified} onCheckedChange={v => setForm({ ...form, cdl_certified: v, cdl_class: v ? 'Class A' : 'None' })} />
          </div>
          {form.cdl_certified && (
            <div>
              <Label>CDL Class</Label>
              <MobileSelect
                value={form.cdl_class}
                onValueChange={v => setForm({ ...form, cdl_class: v })}
                options={[{ value: 'Class A', label: 'Class A (Combination vehicles)' }, { value: 'Class B', label: 'Class B (Straight vehicles)' }]}
                placeholder="Select CDL class"
              />
            </div>
          )}
        </div>

        <div className="border-t pt-4 space-y-4">
          <h3 className="font-display font-bold text-sm">Required Documents</h3>
          <FileUploadField label="Driver's License (photo/scan)" field="license_doc_url" />
          <FileUploadField label="Insurance Document" field="insurance_doc_url" />
          <FileUploadField label="Profile Photo" field="profile_photo_url" accept=".jpg,.png,.jpeg" />
        </div>

        {/* Vehicle Registration */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-emerald-500" />
            <h3 className="font-display font-bold text-sm">Vehicle Registration</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label htmlFor="truck_make">Vehicle Make *</Label><Input id="truck_make" value={truck.make} onChange={e => setTruck({ ...truck, make: e.target.value })} placeholder="e.g. Ford" /></div>
            <div><Label htmlFor="truck_model">Vehicle Model *</Label><Input id="truck_model" value={truck.model} onChange={e => setTruck({ ...truck, model: e.target.value })} placeholder="e.g. F-650" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label htmlFor="truck_year">Year</Label><Input id="truck_year" type="number" value={truck.year} onChange={e => setTruck({ ...truck, year: e.target.value })} placeholder="2020" /></div>
            <div><Label htmlFor="truck_plate">License Plate *</Label><Input id="truck_plate" value={truck.license_plate} onChange={e => setTruck({ ...truck, license_plate: e.target.value })} /></div>
          </div>
          <div>
            <Label>Truck Size</Label>
            <MobileSelect
              value={truck.size_category}
              onValueChange={v => setTruck({ ...truck, size_category: v })}
              options={[
                { value: 'small', label: 'Small (up to 14ft)' },
                { value: 'medium', label: 'Medium (16-20ft)' },
                { value: 'large', label: 'Large (22-26ft)' },
                { value: 'extra_large', label: 'Extra Large (26ft+)' },
              ]}
              placeholder="Select truck size"
            />
          </div>
          <FileUploadField label="Vehicle Registration Document" field="registration_doc_url" target="truck" />
          <FileUploadField label="Vehicle Inspection Document" field="inspection_doc_url" target="truck" />

          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <p className="text-xs text-muted-foreground">Clear photos of your truck are required to verify vehicle quality before approval.</p>
            <FileUploadField label="Vehicle Exterior Photo *" field="exterior_photo_url" target="truck" accept=".jpg,.png,.jpeg" />
            <FileUploadField label="Vehicle Interior Photo *" field="interior_photo_url" target="truck" accept=".jpg,.png,.jpeg" />
          </div>
        </div>

        <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={saving}>
          {saving ? <><Loader2 size={16} className="animate-spin mr-1" /> Submitting...</> : 'Continue to Contract'}
        </Button>
      </form>
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-muted-foreground text-sm mb-6">Please review and sign the contract to complete your registration.</p>
          </div>
          <ContractSign
            contractType="driver_service"
            partyName={form.full_name}
            partyEmail={form.email}
            partyPhone={form.phone}
            onSigned={handleContractSigned}
          />
          {saving && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Submitting your application...
            </div>
          )}
        </div>
      )}
    </div>
  );
}