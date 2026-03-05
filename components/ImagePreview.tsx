'use client';

import { useEffect, useState } from 'react';

interface ImagePreviewProps {
  canvas: HTMLCanvasElement | null;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
}

export function ImagePreview({ canvas, onPointerDown, onPointerUp }: ImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setImageUrl(dataUrl);
    } catch (err) {
      console.error('ImagePreview: Failed to convert canvas to data URL:', err);
    }
  }, [canvas]);

  if (!canvas || !imageUrl) return null;

  return (
    <div
      className="w-full h-full flex items-center justify-center p-4 cursor-pointer select-none"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <img
        src={imageUrl}
        alt="Processed result"
        className="max-w-full max-h-full object-contain transition-all duration-300"
        draggable={false}
      />
    </div>
  );
}
