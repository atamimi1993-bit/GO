import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Download, Loader2 } from 'lucide-react';

export default function ReceiptDownload({ move }) {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (window.self !== window.top) {
      alert('Receipt download is only available from the published app, not the editor preview.');
      return;
    }
    setDownloading(true);
    try {
      const res = await base44.functions.invoke('generate-move-receipt', {
        move_request_id: move.id,
      });

      // The function returns a PDF binary — convert to blob and download
      const contentType = res.headers?.['content-type'] || 'application/pdf';
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${move.id.slice(-8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Receipt downloaded', description: 'Your PDF receipt has been saved.' });
    } catch (err) {
      toast({
        title: 'Could not generate receipt',
        description: err.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={downloading}
      variant="outline"
      className="w-full min-h-[44px]"
    >
      {downloading
        ? <><Loader2 size={16} className="animate-spin mr-1" /> Generating...</>
        : <><Download size={16} className="mr-1" /> Download PDF Receipt</>}
    </Button>
  );
}