import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, X, Sparkles, Video } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AIScanItems({ onItemsGenerated, existingItems = [] }) {
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [scanning, setScanning] = useState(false);
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const newPreviews = selected.map(f => ({
      file: f,
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      isVideo: f.type.startsWith('video/'),
      name: f.name,
    }));
    setPreviews([...previews, ...newPreviews]);
    setFiles([...files, ...selected]);
  };

  const removeFile = (idx) => {
    URL.revokeObjectURL(previews[idx]?.url);
    setPreviews(previews.filter((_, i) => i !== idx));
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleScan = async () => {
    if (files.length === 0 && !description.trim()) {
      toast({ title: 'Add photos, videos, or a description', description: 'Upload media or describe your items so AI can estimate them.', variant: 'destructive' });
      return;
    }

    setScanning(true);
    try {
      // Upload all files first
      const uploadedUrls = [];
      for (const f of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        uploadedUrls.push(file_url);
      }

      // Build a rich prompt for the LLM
      const prompt = `You are a professional moving estimator. Analyze the provided ${uploadedUrls.length > 0 ? 'photos/videos' : 'description'} and generate a comprehensive item list for a move.

${description.trim() ? `Customer description: "${description.trim()}"` : ''}

For each item you can identify, provide:
- name: a clear item name (e.g. "Sofa (3-seat)", "Queen Mattress", "54\" TV")
- category: one of furniture, electronics, appliances, boxes, fragile, heavy_equipment, clothing, other
- weight_lbs: realistic estimated weight in pounds for ONE unit
- quantity: how many of this item you see
- special_handling: true if the item is fragile, oversized, or needs extra care

Be thorough — identify every visible or described item. If you see a room photo, list all furniture and boxes visible. For videos, consider multiple frames. If the description mentions "2 bedrooms" or "living room", generate typical items for those rooms.

Return ONLY a JSON array of items.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string', enum: ['furniture', 'electronics', 'appliances', 'boxes', 'fragile', 'heavy_equipment', 'clothing', 'other'] },
                  weight_lbs: { type: 'number' },
                  quantity: { type: 'number' },
                  special_handling: { type: 'boolean' },
                },
              },
            },
          },
        },
      });

      const detected = res.items || [];
      if (detected.length === 0) {
        toast({ title: 'No items detected', description: 'Try uploading clearer photos or adding more detail to your description.', variant: 'destructive' });
      } else {
        onItemsGenerated(detected);
        toast({ title: 'AI scan complete!', description: `${detected.length} items detected and added to your list.` });
        // Reset
        previews.forEach(p => p.url && URL.revokeObjectURL(p.url));
        setFiles([]);
        setPreviews([]);
        setDescription('');
      }
    } catch (err) {
      toast({ title: 'AI scan failed', description: err.message || 'Could not analyze your items. Try again.', variant: 'destructive' });
    }
    setScanning(false);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="bg-emerald-500/10 rounded-lg p-1.5">
          <Sparkles size={18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="font-display font-bold text-base">AI Smart Scan</h3>
          <p className="text-xs text-muted-foreground">Upload photos or videos of your space, and AI will detect your items automatically.</p>
        </div>
      </div>

      {/* File upload area */}
      <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
        {previews.length === 0 ? (
          <div className="py-4">
            <Camera className="mx-auto text-muted-foreground mb-2" size={28} />
            <p className="text-sm text-muted-foreground mb-3">Tap to add photos or videos of your rooms</p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Camera size={14} className="mr-1" /> Add Photos / Videos
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 justify-center">
              {previews.map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                  {p.isVideo ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                      <Video size={20} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1 px-1 truncate w-full text-center">Video</span>
                    </div>
                  ) : (
                    <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-0 right-0 bg-black/60 rounded-full min-h-[32px] min-w-[32px] flex items-center justify-center text-white"
                    aria-label="Remove file"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Camera size={14} className="mr-1" /> Add More
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

      {/* Description */}
      <div>
        <Label htmlFor="ai-description" className="text-sm mb-1.5 block">Describe your items (optional)</Label>
        <Textarea
          id="ai-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. 2-bedroom apartment — living room has a couch, TV stand, and coffee table. Kitchen has a table with 4 chairs. Both bedrooms have queen beds and dressers."
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">The more detail you provide, the more accurate your estimate will be.</p>
      </div>

      <Button
        onClick={handleScan}
        disabled={scanning}
        className="w-full bg-emerald-500 hover:bg-emerald-600"
      >
        {scanning ? (
          <><Loader2 size={16} className="mr-1 animate-spin" /> Analyzing your items...</>
        ) : (
          <><Sparkles size={16} className="mr-1" /> Scan & Generate Items</>
        )}
      </Button>
    </div>
  );
}