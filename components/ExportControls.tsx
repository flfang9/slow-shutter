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
    <div className="flex gap-3">
      <Button onClick={handleDownload} className="flex-1">
        <Download className="mr-2 h-4 w-4" />
        Save
      </Button>
      <Button onClick={handleShare} variant="secondary" disabled={isSharing}>
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>
      <Button onClick={onReset} variant="outline">
        <RotateCcw className="mr-2 h-4 w-4" />
        New
      </Button>
    </div>
  );
}
