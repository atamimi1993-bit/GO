import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Camera, PenLine, Check, Loader2, Thermometer, FileCheck } from 'lucide-react';

export default function ProofOfDeliveryCapture({ move, onComplete }) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [temperatureVerified, setTemperatureVerified] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPoint = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(file_url);
    } catch {}
    setUploading(false);
  };

  const startDraw = (e) => {
    drawing.current = true;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    lastPoint.current = { x, y };
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPoint.current = { x, y };
  };

  const stopDraw = () => { drawing.current = false; };

  const clearSig = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const saveSig = () => {
    const canvas = canvasRef.current;
    setSignatureData(canvas.toDataURL('image/png'));
  };

  const handleSubmit = async () => {
    if (!photoUrl || !recipientName) return;
    setSubmitting(true);
    try {
      saveSig();
      let sigUrl = signatureData;
      if (signatureData) {
        const blob = await (await fetch(signatureData)).blob();
        const file = new File([blob], 'signature.png', { type: 'image/png' });
        const res = await base44.integrations.Core.UploadFile({ file });
        sigUrl = res.file_url;
      }

      const proof = await base44.entities.ProofOfDelivery.create({
        move_request_id: move.id,
        driver_profile_id: move.assigned_driver_id,
        driver_name: move.assigned_driver_name,
        photo_url: photoUrl,
        signature_url: sigUrl || undefined,
        recipient_name: recipientName,
        delivered_at: new Date().toISOString(),
        notes: '',
        temperature_verified: temperatureVerified,
        customer_email: move.customer_email,
      });

      await base44.entities.MoveRequest.update(move.id, {
        status: 'completed',
        proof_of_delivery_id: proof.id,
      });

      setDone(true);
      onComplete?.(proof);
    } catch {}
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
        <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="text-white" size={28} />
        </div>
        <h3 className="font-display font-bold text-lg mb-1">Delivery Complete!</h3>
        <p className="text-sm text-muted-foreground">Proof of delivery captured and saved.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {move.temperature_controlled && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3 flex items-center gap-2">
          <Thermometer className="text-teal-600" size={18} />
          <div>
            <div className="text-sm font-semibold text-teal-700">Temperature-Controlled Delivery</div>
            <div className="text-xs text-teal-600">Verify item temperature is within range before completing delivery.</div>
          </div>
        </div>
      )}

      {/* Photo */}
      <div>
        <label className="text-sm font-semibold mb-1.5 block flex items-center gap-1.5">
          <Camera size={16} /> Delivery Photo
        </label>
        {photoUrl ? (
          <div className="relative">
            <img src={photoUrl} alt="Delivery proof" className="w-full rounded-xl max-h-48 object-cover" />
            <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => setPhotoUrl('')}>
              Retake
            </Button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer hover:bg-accent min-h-[100px]">
            {uploading ? <Loader2 className="animate-spin text-muted-foreground" /> : <Camera className="text-muted-foreground" size={24} />}
            <span className="text-xs text-muted-foreground mt-1">{uploading ? 'Uploading...' : 'Tap to upload photo'}</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
          </label>
        )}
      </div>

      {/* Recipient name */}
      <div>
        <label className="text-sm font-semibold mb-1.5 block">Recipient Name</label>
        <input
          className="w-full h-11 rounded-md border border-input bg-transparent px-3 text-sm min-h-[44px]"
          placeholder="Who received the delivery?"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
        />
      </div>

      {/* Temperature verification */}
      {move.temperature_controlled && (
        <button
          type="button"
          onClick={() => setTemperatureVerified(!temperatureVerified)}
          className={`w-full flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${temperatureVerified ? 'border-teal-500 bg-teal-500/5' : 'border-border'}`}
        >
          <Thermometer className={temperatureVerified ? 'text-teal-600' : 'text-muted-foreground'} size={18} />
          <span className="text-sm font-medium">{temperatureVerified ? 'Temperature verified ✓' : 'Verify temperature range'}</span>
        </button>
      )}

      {/* Signature */}
      <div>
        <label className="text-sm font-semibold mb-1.5 block flex items-center gap-1.5">
          <PenLine size={16} /> Recipient Signature
        </label>
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full border border-input rounded-md bg-white touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={clearSig} aria-label="Clear signature pad">Clear signature</Button>
      </div>

      <Button
        className="w-full bg-emerald-500 hover:bg-emerald-600 min-h-[48px]"
        disabled={!photoUrl || !recipientName || submitting}
        onClick={handleSubmit}
      >
        {submitting ? <Loader2 size={20} className="animate-spin" /> : <FileCheck size={20} />}
        {submitting ? 'Saving...' : 'Complete Delivery'}
      </Button>
    </div>
  );
}