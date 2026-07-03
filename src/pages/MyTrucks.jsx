import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { TRUCK_SIZE_LABELS } from '@/lib/pricing';
import { ArrowLeft, Plus, Truck, Upload, Loader2, ShieldCheck } from 'lucide-react';

export default function MyTrucks() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const { toast } = useToast();

  const [form, setForm] = useState({
    make: '', model: '', year: '', size_category: 'medium', capacity_lbs: '',
    license_plate: '', fuel_type: 'gasoline', mpg: '', company_name: '',
    registration_doc_url: '', inspection_doc_url: '', insurance_doc_url: '', photo_url: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        const profiles = await base44.entities.DriverProfile.filter({ email: u.email });
        if (profiles.length > 0) {
          setDriverProfile(profiles[0]);
          const t = await base44.entities.Truck.filter({ driver_profile_id: profiles[0].id });
          setTrucks(t);
        }
      } catch {}
      setLoading(false);
    };
    load();
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

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.make || !form.model || !form.license_plate) return;
    setSaving(true);
    try {
      const truck = await base44.entities.Truck.create({
        ...form,
        driver_profile_id: driverProfile.id,
        year: Number(form.year),
        capacity_lbs: Number(form.capacity_lbs),
        mpg: Number(form.mpg),
      });
      setTrucks([...trucks, truck]);
      setOpen(false);
      setForm({ make: '', model: '', year: '', size_category: 'medium', capacity_lbs: '', license_plate: '', fuel_type: 'gasoline', mpg: '', company_name: '', registration_doc_url: '', inspection_doc_url: '', insurance_doc_url: '', photo_url: '' });
      toast({ title: 'Truck added!' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/driver-hub" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={16} /> Driver Hub
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">My Trucks</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600"><Plus size={16} className="mr-1" /> Add Truck</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add a Truck</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Make *</Label><Input value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} placeholder="Ford" /></div>
                <div><Label>Model *</Label><Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="F-150" /></div>
                <div><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="2022" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Size Category *</Label>
                  <Select value={form.size_category} onValueChange={v => setForm({ ...form, size_category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRUCK_SIZE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Capacity (lbs)</Label><Input type="number" value={form.capacity_lbs} onChange={e => setForm({ ...form, capacity_lbs: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>License Plate *</Label><Input value={form.license_plate} onChange={e => setForm({ ...form, license_plate: e.target.value })} /></div>
                <div>
                  <Label>Fuel Type</Label>
                  <Select value={form.fuel_type} onValueChange={v => setForm({ ...form, fuel_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasoline">Gasoline</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>MPG</Label><Input type="number" value={form.mpg} onChange={e => setForm({ ...form, mpg: e.target.value })} placeholder="10" /></div>
                <div><Label>Company</Label><Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h3 className="font-bold text-sm">Documents</h3>
                {[
                  { label: 'Registration', field: 'registration_doc_url' },
                  { label: 'Inspection', field: 'inspection_doc_url' },
                  { label: 'Insurance', field: 'insurance_doc_url' },
                  { label: 'Truck Photo', field: 'photo_url' },
                ].map(doc => (
                  <div key={doc.field} className="flex items-center justify-between">
                    <Label>{doc.label}</Label>
                    {form[doc.field] ? (
                      <span className="text-emerald-600 text-sm">✓ Uploaded</span>
                    ) : (
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild disabled={uploading[doc.field]}>
                          <span>{uploading[doc.field] ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} className="mr-1" />}Upload</span>
                        </Button>
                        <input type="file" className="hidden" onChange={e => handleUpload(doc.field, e)} />
                      </label>
                    )}
                  </div>
                ))}
              </div>

              <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Add Truck'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {trucks.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-2xl">
          <Truck className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 text-sm">No trucks registered yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trucks.map(truck => (
            <div key={truck.id} className="bg-white border rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="font-display font-bold">{truck.year} {truck.make} {truck.model}</p>
                <p className="text-sm text-gray-500">{TRUCK_SIZE_LABELS[truck.size_category]} · {truck.license_plate}</p>
                <p className="text-xs text-gray-400">{truck.fuel_type} · {truck.mpg} MPG{truck.company_name && ` · ${truck.company_name}`}</p>
              </div>
              <div className="flex items-center gap-2">
                {truck.verified ? (
                  <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><ShieldCheck size={14} /> Verified</span>
                ) : (
                  <span className="text-xs text-yellow-600">Pending verification</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}