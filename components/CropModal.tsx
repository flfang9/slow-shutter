'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';

interface CropModalProps {
  image: HTMLCanvasElement;
  onClose: () => void;
  onApply: (croppedCanvas: HTMLCanvasElement) => void;
}

const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', ratio: null },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '5:4', label: '5:4', ratio: 5 / 4 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
];

export function CropModal({ image, onClose, onApply }: CropModalProps) {
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]);
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Draw the image
    canvasRef.current.width = image.width;
    canvasRef.current.height = image.height;

    // Apply rotation
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(image.width / 2, image.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);
      ctx.restore();
    } else {
      ctx.drawImage(image, 0, 0);
    }
  }, [image, rotation]);

  useEffect(() => {
    // Calculate initial crop area based on selected ratio
    if (selectedRatio.ratio === null) {
      setCropArea({ x: 0, y: 0, width: 100, height: 100 });
    } else {
      const imageAspect = image.width / image.height;
      const targetAspect = selectedRatio.ratio;

      if (imageAspect > targetAspect) {
        // Image is wider, crop width
        const newWidth = (targetAspect / imageAspect) * 100;
        const offsetX = (100 - newWidth) / 2;
        setCropArea({ x: offsetX, y: 0, width: newWidth, height: 100 });
      } else {
        // Image is taller, crop height
        const newHeight = (imageAspect / targetAspect) * 100;
        const offsetY = (100 - newHeight) / 2;
        setCropArea({ x: 0, y: offsetY, width: 100, height: newHeight });
      }
    }
  }, [selectedRatio, image.width, image.height]);

  const handleApply = () => {
    if (!canvasRef.current) return;

    // Create cropped canvas
    const croppedCanvas = document.createElement('canvas');
    const sourceCanvas = canvasRef.current;

    const cropX = (cropArea.x / 100) * sourceCanvas.width;
    const cropY = (cropArea.y / 100) * sourceCanvas.height;
    const cropWidth = (cropArea.width / 100) * sourceCanvas.width;
    const cropHeight = (cropArea.height / 100) * sourceCanvas.height;

    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;

    const ctx = croppedCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        sourceCanvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );
    }

    onApply(croppedCanvas);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          onClick={onClose}
          className="p-2 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-base font-medium text-white">Crop</h2>
        <button
          onClick={handleApply}
          className="p-2 text-white hover:text-white/80 transition-colors"
        >
          <Check className="w-6 h-6" />
        </button>
      </div>

      {/* Image Preview with Crop Overlay */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        <div className="relative max-w-full max-h-full">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain"
          />
          {/* Crop Overlay */}
          <div
            className="absolute border-2 border-white"
            style={{
              left: `${cropArea.x}%`,
              top: `${cropArea.y}%`,
              width: `${cropArea.width}%`,
              height: `${cropArea.height}%`,
            }}
          >
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-white" />
            <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-white" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-white" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-white" />
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/60 border-t border-white/10 pb-safe">
        {/* Aspect Ratio Presets */}
        <div className="flex gap-4 overflow-x-auto px-4 py-4 scrollbar-hide">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.id}
              onClick={() => setSelectedRatio(ratio)}
              className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all ${
                selectedRatio.id === ratio.id ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div
                className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center ${
                  selectedRatio.id === ratio.id
                    ? 'border-white bg-white/10'
                    : 'border-white/30'
                }`}
              >
                {ratio.ratio === null ? (
                  <div className="w-8 h-8 border border-white/50 rounded" />
                ) : ratio.ratio < 1 ? (
                  <div className="w-4 h-8 bg-white/50 rounded" />
                ) : ratio.ratio === 1 ? (
                  <div className="w-6 h-6 bg-white/50 rounded" />
                ) : (
                  <div className="w-8 h-4 bg-white/50 rounded" />
                )}
              </div>
              <span className="text-xs text-white/60">{ratio.label}</span>
            </button>
          ))}
        </div>

        {/* Rotation Slider */}
        <div className="px-6 py-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>Rotate</span>
            </div>
            <span>{rotation}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                       [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
