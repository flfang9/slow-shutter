'use client';

interface ImagePreviewProps {
  canvas: HTMLCanvasElement | null;
}

export function ImagePreview({ canvas }: ImagePreviewProps) {
  if (!canvas) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">Result</h2>
      <div className="rounded-lg overflow-hidden bg-muted">
        <img
          src={canvas.toDataURL('image/jpeg', 0.95)}
          alt="Processed result"
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
