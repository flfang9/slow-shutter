'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCcw, ZoomIn } from 'lucide-react';

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
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[3]); // Default to 1:1
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset position and zoom when ratio changes
    setPosition({ x: 0, y: 0 });
    setZoom(1);
  }, [selectedRatio]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleApply = () => {
    if (!containerRef.current) return;

    // Get the crop frame dimensions
    const container = containerRef.current;
    const cropFrame = container.querySelector('.crop-frame') as HTMLElement;
    if (!cropFrame) return;

    const frameRect = cropFrame.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Calculate crop dimensions
    let cropWidth = frameRect.width;
    let cropHeight = frameRect.height;

    // Determine output dimensions based on aspect ratio
    if (selectedRatio.ratio !== null) {
      const maxSize = 2000; // Max output dimension
      if (selectedRatio.ratio > 1) {
        // Landscape
        cropWidth = maxSize;
        cropHeight = maxSize / selectedRatio.ratio;
      } else {
        // Portrait or square
        cropHeight = maxSize;
        cropWidth = maxSize * selectedRatio.ratio;
      }
    }

    // Create output canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;

    const ctx = croppedCanvas.getContext('2d');
    if (!ctx) return;

    // Calculate the source area from the original image
    const scaleX = image.width / (containerRect.width * zoom);
    const scaleY = image.height / (containerRect.height * zoom);

    const sourceX = ((frameRect.left - containerRect.left - position.x) / zoom) * scaleX;
    const sourceY = ((frameRect.top - containerRect.top - position.y) / zoom) * scaleY;
    const sourceWidth = (frameRect.width / zoom) * scaleX;
    const sourceHeight = (frameRect.height / zoom) * scaleY;

    // Apply rotation if needed
    if (rotation !== 0) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.save();
        tempCtx.translate(image.width / 2, image.height / 2);
        tempCtx.rotate((rotation * Math.PI) / 180);
        tempCtx.drawImage(image, -image.width / 2, -image.height / 2);
        tempCtx.restore();

        ctx.drawImage(
          tempCanvas,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );
      }
    } else {
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
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

      {/* Image Preview with Crop Frame */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden bg-black"
      >
        {/* Draggable Image */}
        <div
          className="absolute inset-0 flex items-center justify-center touch-none"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <img
            src={image.toDataURL()}
            alt="Crop preview"
            className="select-none"
            draggable={false}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center',
              maxWidth: 'none',
              maxHeight: 'none',
              width: 'auto',
              height: '80vh',
            }}
          />
        </div>

        {/* Fixed Crop Frame Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="crop-frame relative border-2 border-white"
            style={{
              width: selectedRatio.ratio
                ? selectedRatio.ratio > 1
                  ? '90%'
                  : `${90 * selectedRatio.ratio}%`
                : '90%',
              aspectRatio: selectedRatio.ratio || 'auto',
              maxWidth: '90%',
              maxHeight: '80vh',
            }}
          >
            {/* Corner Brackets */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-white" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-white" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-white" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-white" />

            {/* Darkened overlay outside crop */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0" style={{
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
              }} />
            </div>
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

        {/* Zoom Slider */}
        <div className="px-6 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <div className="flex items-center gap-2">
              <ZoomIn className="w-4 h-4" />
              <span>Zoom</span>
            </div>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                       [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>

        {/* Rotation Slider */}
        <div className="px-6 py-3 space-y-2 border-t border-white/10">
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
