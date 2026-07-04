import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Camera, Video, X, AlertTriangle, Loader2, MapPin, Truck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { checkImageBlur } from '@/lib/blurDetection';

export default function AccessMediaStep({ accessMedia, onAddMedia, onRemoveMedia }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      let blurry = false;

      if (!isVideo) {
        const result = await checkImageBlur(file);
        blurry = result.blurry;
      }

      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onAddMedia({ url: file_url, type: isVideo ? 'video' : 'photo', blurry, name: file.name });
      } catch {
        toast({ title: 'Upload failed', description: `Could not upload ${file.name}`, variant: 'destructive' });
      }
    }

    setUploading(false);
    if (e.target) e.target.value = '';
  };

  const blurryCount = accessMedia.filter(m => m.blurry).length;

  return (
    <div className="border-2 border-emerald-500/30 rounded-2xl p-5 bg-emerald-500/5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <MapPin className="text-emerald-600 dark:text-emerald-400" size={20} />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm flex items-center gap-2">
            Front Area & Loading Access
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add photos or videos of the front of your building, street parking, and the path from where the truck will park to your door. This helps drivers plan where to stop and load.
          </p>
        </div>
      </div>

      {blurryCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2 mb-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {blurryCount} photo{blurryCount > 1 ? 's' : ''} appear blurry. Clear photos help drivers assess access.
          </p>
        </div>
      )}

      <div className="border-2 border-dashed border-emerald-500/30 rounded-xl p-4 text-center bg-card/50">
        {accessMedia.length === 0 ? (
          <div className="py-3">
            <Truck className="mx-auto text-muted-foreground mb-2" size={28} />
            <p className="text-xs text-muted-foreground mb-3">
              Show the truck parking area and loading path
            </p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Camera size={14} className="mr-1" /> Add Access Photos / Videos
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {accessMedia.map((m, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                  {m.type === 'video' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                      <Video size={18} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">Video</span>
                    </div>
                  ) : (
                    <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                  )}
                  {m.blurry && (
                    <div className="absolute bottom-0 left-0 right-0 bg-amber-500/80 text-white text-[10px] py-0.5 text-center flex items-center justify-center gap-1">
                      <AlertTriangle size={10} /> Blurry
                    </div>
                  )}
                  <button
                    onClick={() => onRemoveMedia(i)}
                    className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-1 text-white"
                    aria-label="Remove access media"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading
                ? <><Loader2 size={14} className="mr-1 animate-spin" /> Uploading...</>
                : <><Camera size={14} className="mr-1" /> Add More</>}
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>

      <div className="mt-3 space-y-1.5">
        <p className="text-[11px] text-muted-foreground font-medium">Helpful shots to include:</p>
        <ul className="text-[11px] text-muted-foreground space-y-0.5">
          <li>• Street view showing where the truck can park</li>
          <li>• Front entrance / door the movers will use</li>
          <li>• Any stairs, hallway, or elevator on the loading path</li>
        </ul>
      </div>
    </div>
  );
}