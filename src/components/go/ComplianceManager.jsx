import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  ShieldCheck, FileText, Upload, Loader2, AlertCircle, CheckCircle2,
  Truck, CalendarClock, RefreshCw, ExternalLink,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

export default function ComplianceManager({ driverProfile, onUpdated }) {
  const [profile, setProfile] = useState(driverProfile);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [uploadingField, setUploadingField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    license_number: driverProfile.license_number || '',
    license_expiry: driverProfile.license_expiry || '',
  });
  const { toast } = useToast();

  const load = async () => {
    try {
      const t = await base44.entities.Truck.filter({ driver_profile_id: driverProfile.id });
      setTrucks(t);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    setProfile(driverProfile);
    setForm({
      license_number: driverProfile.license_number || '',
      license_expiry: driverProfile.license_expiry || '',
    });
    load();
  }, [driverProfile]);

  const handleUpload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    setUploading(u => ({ ...u, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updated = await base44.entities.DriverProfile.update(profile.id, { [field]: file_url });
      setProfile(updated);
      if (onUpdated) onUpdated(updated);
      toast({ title: 'Document uploaded', description: 'Your document has been updated.' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
    setUploading(u => ({ ...u, [field]: false }));
    setUploadingField(null);
  };

  const handleSaveLicense = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.DriverProfile.update(profile.id, {
        license_number: form.license_number,
        license_expiry: form.license_expiry,
      });
      setProfile(updated);
      if (onUpdated) onUpdated(updated);
      setEditMode(false);
      toast({ title: 'License info updated' });
    } catch (err) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  // Compliance checks
  const docs = [
    { label: "Driver's License Document", field: 'license_doc_url', icon: FileText },
    { label: 'Insurance Document', field: 'insurance_doc_url', icon: ShieldCheck },
    { label: 'Profile Photo', field: 'profile_photo_url', icon: FileText },
  ];

  const licenseExpired = profile.license_expiry && new Date(profile.license_expiry) < new Date();
  const licenseExpiringSoon = profile.license_expiry && !licenseExpired && differenceInDays(parseISO(profile.license_expiry), new Date()) <= 30;

  const driverDocsComplete = docs.every(d => profile[d.field]);
  const licenseValid = !licenseExpired && profile.license_expiry;
  const allDriverCompliant = driverDocsComplete && licenseValid;

  const truckDocsComplete = trucks.length > 0 && trucks.every(t =>
    t.registration_doc_url && t.inspection_doc_url && t.insurance_doc_url
  );

  const overallCompliant = allDriverCompliant && truckDocsComplete && trucks.length > 0;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={20} className="text-emerald-600" />
        <h2 className="font-display font-bold text-lg">Compliance & Documents</h2>
        {overallCompliant ? (
          <Badge className="ml-auto bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={12} className="mr-1" /> Compliant
          </Badge>
        ) : (
          <Badge className="ml-auto bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
            <AlertCircle size={12} className="mr-1" /> Action Needed
          </Badge>
        )}
      </div>

      {/* License expiry alert */}
      {licenseExpired && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" size={16} />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">License Expired</p>
            <p className="text-xs text-red-700 dark:text-red-300">Your driver's license expired on {format(parseISO(profile.license_expiry), 'MMM d, yyyy')}. Please renew and update your documents.</p>
          </div>
        </div>
      )}
      {licenseExpiringSoon && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 flex items-start gap-2">
          <CalendarClock className="text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" size={16} />
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">License Expiring Soon</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">Your license expires on {format(parseISO(profile.license_expiry), 'MMM d, yyyy')}. Renew it to stay compliant.</p>
          </div>
        </div>
      )}

      {/* License info */}
      <div className="bg-muted/50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">License Information</h3>
          {!editMode ? (
            <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
              <RefreshCw size={14} className="mr-1" /> Edit
            </Button>
          ) : null}
        </div>
        {!editMode ? (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">License Number</span>
              <span className="font-medium">{profile.license_number || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expiry Date</span>
              <span className={`font-medium ${licenseExpired ? 'text-red-600' : licenseExpiringSoon ? 'text-yellow-600' : ''}`}>
                {profile.license_expiry ? format(parseISO(profile.license_expiry), 'MMM d, yyyy') : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CDL</span>
              <span className="font-medium">{profile.cdl_certified ? `Yes (${profile.cdl_class})` : 'No'}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">License Number</Label>
              <Input value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Expiry Date</Label>
              <Input type="date" value={form.license_expiry} onChange={e => setForm({ ...form, license_expiry: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={handleSaveLicense} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} className="mr-1" />} Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setForm({ license_number: profile.license_number || '', license_expiry: profile.license_expiry || '' }); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Driver documents */}
      <div className="space-y-3 mb-4">
        <h3 className="text-sm font-medium">Driver Documents</h3>
        {docs.map(doc => {
          const uploaded = profile[doc.field];
          return (
            <div key={doc.field} className="relative flex items-center justify-between p-3 rounded-xl bg-muted/30">
              {uploadingField === doc.field && (
                <div className="absolute inset-0 rounded-xl bg-background/60 flex items-center justify-center z-10">
                  <Loader2 size={16} className="animate-spin text-primary" />
                </div>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <doc.icon size={16} className={uploaded ? 'text-emerald-500' : 'text-muted-foreground'} />
                <span className="text-sm truncate">{doc.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {uploaded ? (
                  <>
                    <a href={uploaded} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                      View <ExternalLink size={10} />
                    </a>
                    <label className="cursor-pointer" htmlFor={`reupload-${doc.field}`} aria-label={`Update ${doc.label}`}>
                      <Button variant="ghost" size="sm" disabled={uploading[doc.field]}>
                        {uploading[doc.field] ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      </Button>
                      <input id={`reupload-${doc.field}`} type="file" accept=".pdf,.jpg,.png,.jpeg" className="hidden" onChange={e => handleUpload(doc.field, e)} />
                    </label>
                  </>
                ) : (
                  <label className="cursor-pointer" htmlFor={`upload-${doc.field}`} aria-label={`Upload ${doc.label}`}>
                    <Button variant="outline" size="sm" disabled={uploading[doc.field]}>
                      {uploading[doc.field] ? <Loader2 size={14} className="animate-spin mr-1" /> : <Upload size={14} className="mr-1" />}
                      {uploading[doc.field] ? 'Uploading...' : 'Upload'}
                    </Button>
                    <input id={`upload-${doc.field}`} type="file" accept=".pdf,.jpg,.png,.jpeg" className="hidden" onChange={e => handleUpload(doc.field, e)} />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vehicle documents summary */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Truck size={16} className="text-emerald-500" /> Vehicle Documents
          </h3>
          <Link to="/my-trucks">
            <Button variant="ghost" size="sm">
              Manage <ExternalLink size={12} className="ml-1" />
            </Button>
          </Link>
        </div>
        {trucks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No trucks registered yet. Add a truck to manage vehicle documents.</p>
        ) : (
          <div className="space-y-2">
            {trucks.map(truck => {
              const truckDocs = [
                { label: 'Registration', uploaded: !!truck.registration_doc_url },
                { label: 'Inspection', uploaded: !!truck.inspection_doc_url },
                { label: 'Insurance', uploaded: !!truck.insurance_doc_url },
              ];
              const allUploaded = truckDocs.every(d => d.uploaded);
              return (
                <div key={truck.id} className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{truck.year} {truck.make} {truck.model}</p>
                    <Badge variant={allUploaded ? 'default' : 'secondary'} className={allUploaded ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400' : ''}>
                      {allUploaded ? 'Complete' : 'Incomplete'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {truckDocs.map(d => (
                      <span key={d.label} className={`text-xs flex items-center gap-1 ${d.uploaded ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {d.uploaded ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />} {d.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}