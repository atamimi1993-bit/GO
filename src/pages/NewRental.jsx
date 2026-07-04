import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Camera, X, FileText, Upload } from 'lucide-react';
import PageHeader from '@/components/go/PageHeader';
import { useUserState } from '@/hooks/useUserState';
import { useToast } from '@/components/ui/use-toast';

export default function NewRental() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [regDoc, setRegDoc] = useState(null);
  const [insuranceDoc, setInsuranceDoc] = useState(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const fileInputRef = useRef(null);
  const regDocRef = useRef(null);
  const insuranceDocRef = useRef(null);

  const REQUIRES_REGISTRATION = ['van', 'truck', 'box_truck', 'flatbed', 'semi', 'trailer', 'bus'];
  const needsRegistration = REQUIRES_REGISTRATION.includes(form.vehicle_type);

  const [form, setForm] = useState({
    owner_type: 'customer',
    vehicle_type: 'truck',
    make: '',
    model: '',
    year: '',
    license_plate: '',
    daily_rate: '',
    city: '',
    state: '',
    description: '',
    capacity_lbs: '',
    seats: '',
    transmission: 'automatic',
    fuel_type: 'gasoline',
    features: '',
  });

  const { userState } = useUserState();

  useEffect(() => {
    if (userState) setForm(f => f.state ? f : { ...f, state: userState });
  }, [userState]);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      setForm(f => ({ ...f, owner_name: u.full_name || '', owner_email: u.email || '' }));
      // Pre-fill from driver profile + existing trucks
      try {
        const profile = await base44.entities.DriverProfile.filter({ email: u.email }).then(r => r[0]);
        if (profile) {
          setForm(f => ({
            ...f,
            owner_type: 'driver',
            state: f.state || profile.service_area?.trim() || '',
          }));
        }
      } catch { /* not a driver — keep defaults */ }
    }).catch(() => navigate('/login'));
  }, [navigate]);

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setPhotos(prev => [...prev, file_url]);
      } catch {
        toast({ title: 'Upload failed', description: `Could not upload ${file.name}`, variant: 'destructive' });
      }
    }
    setUploading(false);
    if (e.target) e.target.value = '';
  };

  const removePhoto = (idx) => setPhotos(photos.filter((_, i) => i !== idx));

  const handleDocUpload = async (e, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDocs(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setter(file_url);
      toast({ title: 'Document uploaded' });
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload document.', variant: 'destructive' });
    }
    setUploadingDocs(false);
    if (e.target) e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.make || !form.model || !form.daily_rate || !form.city) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    if (needsRegistration && !regDoc) {
      toast({ title: 'Registration required', description: 'Please upload the vehicle registration document for verification.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        owner_name: user.full_name || '',
        owner_email: user.email || '',
        year: Number(form.year) || undefined,
        daily_rate: Number(form.daily_rate) || 0,
        capacity_lbs: Number(form.capacity_lbs) || 0,
        seats: Number(form.seats) || 0,
        photo_urls: JSON.stringify(photos),
        registration_doc_url: regDoc || undefined,
        insurance_doc_url: insuranceDoc || undefined,
        available: true,
        status: 'pending_review',
      };
      const rental = await base44.entities.VehicleRental.create(data);
      toast({ title: 'Listing submitted!', description: 'Your vehicle is pending review. We will verify your registration documents before it goes live.' });
      navigate(`/rentals/${rental.id}`);
    } catch (err) {
      toast({ title: 'Failed to create listing', description: err.message || 'Please try again.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const inputClass = "w-full";

  return (
    <div className="max-w-2xl mx-auto pb-4">
      <PageHeader title="List a Vehicle" isRoot={false} />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Owner type */}
        <div className="bg-card border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-sm">I am listing as a...</h3>
          <Select value={form.owner_type} onValueChange={(v) => setForm(f => ({ ...f, owner_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="driver">Driver</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Vehicle details */}
        <div className="bg-card border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-sm">Vehicle Details</h3>
          <div className="space-y-1.5">
            <Label>Vehicle Type *</Label>
            <Select value={form.vehicle_type} onValueChange={(v) => setForm(f => ({ ...f, vehicle_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="pickup">Pickup Truck</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="box_truck">Box Truck</SelectItem>
                <SelectItem value="flatbed">Flatbed</SelectItem>
                <SelectItem value="semi">Semi / Tractor</SelectItem>
                <SelectItem value="trailer">Trailer</SelectItem>
                <SelectItem value="rv">RV / Camper</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Make *</Label>
              <Input value={form.make} onChange={(e) => setForm(f => ({ ...f, make: e.target.value }))} placeholder="Ford" required />
            </div>
            <div className="space-y-1.5">
              <Label>Model *</Label>
              <Input value={form.model} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} placeholder="F-150" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input type="number" value={form.year} onChange={(e) => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2021" />
            </div>
            <div className="space-y-1.5">
              <Label>License Plate</Label>
              <Input value={form.license_plate} onChange={(e) => setForm(f => ({ ...f, license_plate: e.target.value }))} placeholder="ABC-1234" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Transmission</Label>
              <Select value={form.transmission} onValueChange={(v) => setForm(f => ({ ...f, transmission: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fuel Type</Label>
              <Select value={form.fuel_type} onValueChange={(v) => setForm(f => ({ ...f, fuel_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasoline">Gasoline</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Capacity (lbs)</Label>
              <Input type="number" value={form.capacity_lbs} onChange={(e) => setForm(f => ({ ...f, capacity_lbs: e.target.value }))} placeholder="2000" />
            </div>
            <div className="space-y-1.5">
              <Label>Seats</Label>
              <Input type="number" value={form.seats} onChange={(e) => setForm(f => ({ ...f, seats: e.target.value }))} placeholder="5" />
            </div>
          </div>
        </div>

        {/* Location + pricing */}
        <div className="bg-card border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-sm">Location & Pricing</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>City *</Label>
              <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Austin" required />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))} placeholder="TX" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Daily Rate ($) *</Label>
            <Input type="number" value={form.daily_rate} onChange={(e) => setForm(f => ({ ...f, daily_rate: e.target.value }))} placeholder="75" required />
          </div>
        </div>

        {/* Description + features */}
        <div className="bg-card border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-sm">Details</h3>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the vehicle's condition, any restrictions, mileage, etc." className="min-h-[80px]" />
          </div>
          <div className="space-y-1.5">
            <Label>Features (comma-separated)</Label>
            <Input value={form.features} onChange={(e) => setForm(f => ({ ...f, features: e.target.value }))} placeholder="AC, Bluetooth, Backup camera, Tow hitch" />
          </div>
        </div>

        {/* Photos */}
        <div className="bg-card border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-sm">Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-input flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50"
            >
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
              <span className="text-xs">Add Photo</span>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
        </div>

        {/* Registration & Insurance Documents */}
        {needsRegistration && (
          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-sm">Verification Documents</h3>
              <p className="text-xs text-muted-foreground mt-1">Required for trucks, vans, and commercial vehicles. Your listing will be reviewed before going live.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Registration */}
              <div className="space-y-1.5">
                <Label>Registration Document *</Label>
                {regDoc ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-emerald-500/5">
                    <FileText size={18} className="text-emerald-500 shrink-0" />
                    <a href={regDoc} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 dark:text-emerald-400 truncate flex-1 underline">View document</a>
                    <button type="button" onClick={() => setRegDoc(null)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => regDocRef.current?.click()}
                    disabled={uploadingDocs}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-input text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                  >
                    {uploadingDocs ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    Upload registration
                  </button>
                )}
                <input ref={regDocRef} type="file" accept="image/*,application/pdf" onChange={(e) => handleDocUpload(e, setRegDoc)} className="hidden" />
              </div>
              {/* Insurance */}
              <div className="space-y-1.5">
                <Label>Insurance Document (optional)</Label>
                {insuranceDoc ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-emerald-500/5">
                    <FileText size={18} className="text-emerald-500 shrink-0" />
                    <a href={insuranceDoc} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 dark:text-emerald-400 truncate flex-1 underline">View document</a>
                    <button type="button" onClick={() => setInsuranceDoc(null)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => insuranceDocRef.current?.click()}
                    disabled={uploadingDocs}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-input text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                  >
                    {uploadingDocs ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    Upload insurance
                  </button>
                )}
                <input ref={insuranceDocRef} type="file" accept="image/*,application/pdf" onChange={(e) => handleDocUpload(e, setInsuranceDoc)} className="hidden" />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <Button type="button" variant="ghost" onClick={() => navigate('/rentals')}>
            <ArrowLeft size={16} className="mr-1" /> Cancel
          </Button>
          <Button type="submit" disabled={saving || uploading} className="bg-emerald-500 hover:bg-emerald-600">
            {saving ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
            Publish Listing
          </Button>
        </div>
      </form>
    </div>
  );
}