'use client';

import { Download, Share2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportControlsProps {
  canvas: HTMLCanvasElement | null;
  originalImage?: HTMLImageElement | null;
  onReset: () => void;
}

export function ExportControls({ canvas, originalImage, onReset }: ExportControlsProps) {
  const [isSharing, setIsSharing] = useState(false);

  // Use canvas if available, otherwise create one from original image
  const getExportCanvas = (): HTMLCanvasElement | null => {
    if (canvas) return canvas;
    if (!originalImage) return null;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = originalImage.width;
    exportCanvas.height = originalImage.height;
    const ctx = exportCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(originalImage, 0, 0);
      return exportCanvas;
    }
    return null;
  };

  const canExport = !!(canvas || originalImage);

  const handleDownload = () => {
    const exportCanvas = getExportCanvas();
    if (!exportCanvas) return;

    exportCanvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slow-shutter-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Image saved');
    }, 'image/jpeg', 0.95);
  };

  const handleShare = async () => {
    const exportCanvas = getExportCanvas();
    if (!exportCanvas) return;

    // Mobile: Use native share sheet
    if (navigator.share && navigator.canShare) {
      setIsSharing(true);
      try {
        const blob = await new Promise<Blob>((resolve) => {
          exportCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/jpeg', 0.95);
        });

        const file = new File([blob], `slow-shutter-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Slow Shutter',
          });
          toast.success('Shared successfully');
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          toast.error('Share failed');
        }
      } finally {
        setIsSharing(false);
      }
      return;
    }

    // Desktop: Copy image to clipboard
    try {
      const blob = await new Promise<Blob>((resolve) => {
        exportCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);

      toast.success('Image copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy image');
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleDownload}
        disabled={!canExport}
        className="w-full px-4 py-3 text-sm font-medium bg-white text-black
                   rounded-lg transition-all hover:bg-white/90 active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="inline mr-2 h-4 w-4" />
        Save
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleShare}
          disabled={isSharing || !canExport}
          className="px-4 py-3 text-sm font-medium text-white/80
                     border border-white/10 rounded-lg transition-all
                     hover:bg-white/5 disabled:opacity-50 active:scale-[0.98]"
        >
          <Share2 className="inline mr-2 h-4 w-4" />
          Share
        </button>
        <button
          onClick={onReset}
          className="px-4 py-3 text-sm font-medium text-white/80
                     border border-white/10 rounded-lg transition-all
                     hover:bg-white/5 active:scale-[0.98]"
        >
          <RotateCcw className="inline mr-2 h-4 w-4" />
          New
        </button>
      </div>
    </div>
  );
}
