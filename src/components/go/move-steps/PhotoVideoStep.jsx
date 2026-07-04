import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Camera, Video, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { checkImageBlur } from '@/lib/blurDetection';

export default function PhotoVideoStep({ media, onAddMedia, onRemoveMedia }) {
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

  const blurryCount = media.filter(m => m.blurry).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Photos & Video</h2>
        <p className="text-muted-foreground text-sm">Upload photos or videos of your rooms and items so drivers know what to expect.</p>
      </div>

      {blurryCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {blurryCount} photo{blurryCount > 1 ? 's' : ''} appear blurry
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Blurry photos may lead to inaccurate estimates. Consider retaking them for better results.
            </p>
          </div>
        </div>
      )}

      <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center">
        {media.length === 0 ? (
          <div className="py-4">
            <Camera className="mx-auto text-muted-foreground mb-2" size={32} />
            <p className="text-sm text-muted-foreground mb-3">Tap to add photos or videos of your space</p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Camera size={16} className="mr-1" /> Add Photos / Videos
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {media.map((m, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                  {m.type === 'video' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                      <Video size={20} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1 px-1 truncate w-full text-center">Video</span>
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
                    aria-label="Remove media"
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

      <p className="text-xs text-muted-foreground text-center">
        We automatically check your photos for blur and will warn you if any are unclear.
      </p>
    </div>
  );
}