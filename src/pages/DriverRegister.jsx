import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';

export default function DriverRegister() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', license_number: '', license_expiry: '',
    service_area: '', company_name: '',
    license_doc_url: '', insurance_doc_url: '', profile_photo_url: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setForm(f => ({ ...f, full_name: u.full_name || '', email: u.email || '' }));
    }).catch(() => {});
  }, []);

  const handleUpload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(u => ({ ...u, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, [field]: file_url }));
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
    setSaving(true);
    try {
      await base44.entities.DriverProfile.create(form);
      toast({ title: 'Application submitted!', description: 'Your profile is under review.' });
      navigate('/driver-hub');
    } catch {
      toast({ title: 'Error', description: 'Could not save. Please try again.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const FileUploadField = ({ label, field, accept }) => (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        {form[field] ? (
          <span className="text-emerald-600 text-sm font-medium">✓ Uploaded</span>
        ) : (
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" disabled={uploading[field]} asChild>
              <span>{uploading[field] ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} className="mr-1" />}{uploading[field] ? 'Uploading...' : 'Upload'}</span>
            </Button>
            <input type="file" accept={accept || '.pdf,.jpg,.png'} className="hidden" onChange={e => handleUpload(field, e)} />
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} aria-label="Go back" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 min-h-[44px]">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-display font-bold mb-1">Driver Registration</h1>
      <p className="text-muted-foreground text-sm mb-6">Fill in your details and upload required documents.</p>

      <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label htmlFor="full_name">Full Name *</Label><Input id="full_name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label htmlFor="email">Email *</Label><Input id="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="phone">Phone *</Label><Input id="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" /></div>
          <div><Label htmlFor="company">Company (optional)</Label><Input id="company" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
        </div>
        <div><Label htmlFor="service_area">Service Area *</Label><Input id="service_area" value={form.service_area} onChange={e => setForm({ ...form, service_area: e.target.value })} placeholder="e.g. Los Angeles, CA" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="license_number">License Number *</Label><Input id="license_number" value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} /></div>
          <div><Label htmlFor="license_expiry">License Expiry *</Label><Input id="license_expiry" type="date" value={form.license_expiry} onChange={e => setForm({ ...form, license_expiry: e.target.value })} /></div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <h3 className="font-display font-bold text-sm">Required Documents</h3>
          <FileUploadField label="Driver's License (photo/scan)" field="license_doc_url" />
          <FileUploadField label="Insurance Document" field="insurance_doc_url" />
          <FileUploadField label="Profile Photo" field="profile_photo_url" accept=".jpg,.png,.jpeg" />
        </div>

        <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={saving}>
          {saving ? <><Loader2 size={16} className="animate-spin mr-1" /> Submitting...</> : 'Submit Application'}
        </Button>
      </form>
    </div>
  );
}