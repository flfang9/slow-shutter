'use client';

import { Download, Share2, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { downloadCanvas, shareCanvas } from '@/lib/image-utils';
import { useState } from 'react';

interface ExportControlsProps {
  canvas: HTMLCanvasElement | null;
  onReset: () => void;
}

export function ExportControls({ canvas, onReset }: ExportControlsProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleDownload = () => {
    if (!canvas) return;
    const timestamp = new Date().getTime();
    downloadCanvas(canvas, `slow-shutter-${timestamp}.jpg`);
  };

  const handleShare = async () => {
    if (!canvas) return;

    if (!navigator.share) {
      // Fallback to download if share is not supported
      handleDownload();
      return;
    }

    setIsSharing(true);
    try {
      const timestamp = new Date().getTime();
      await shareCanvas(canvas, `slow-shutter-${timestamp}.jpg`);
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleDownload}
        className="w-full px-4 py-3 text-sm font-medium bg-white text-black
                   rounded-lg transition-all hover:bg-white/90 active:scale-[0.98]"
      >
        <Download className="inline mr-2 h-4 w-4" />
        Save
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleShare}
          disabled={isSharing}
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
