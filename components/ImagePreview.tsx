'use client';

import { useEffect, useState } from 'react';

interface ImagePreviewProps {
  canvas: HTMLCanvasElement | null;
}

export function ImagePreview({ canvas }: ImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    if (!canvas) {
      console.log('ImagePreview: no canvas');
      return;
    }

    try {
      console.log('ImagePreview: converting canvas to data URL', canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      console.log('ImagePreview: data URL created, length:', dataUrl.length);
      setImageUrl(dataUrl);
    } catch (err) {
      console.error('ImagePreview: Failed to convert canvas to data URL:', err);
    }
  }, [canvas]);

  if (!canvas || !imageUrl) {
    console.log('ImagePreview: not rendering (canvas:', !!canvas, 'imageUrl:', !!imageUrl, ')');
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">Result</h2>
      <div className="rounded-lg overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt="Processed result"
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
