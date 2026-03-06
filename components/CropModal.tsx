'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[3]);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  // Memoize the data URL to prevent expensive re-computation
  const imageDataUrl = useMemo(() => image.toDataURL('image/jpeg', 0.9), [image]);

  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
    setZoom(1);
  }, [selectedRatio]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Direct DOM manipulation for smooth dragging
  const updateImageTransform = useCallback(() => {
    if (imageRef.current) {
      const { x, y } = positionRef.current;
      imageRef.current.style.transform = `translate(${x}px, ${y}px) scale(${zoom}) rotate(${rotation}deg)`;
    }
  }, [zoom, rotation]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    positionRef.current = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    };

    // Direct DOM update for 60fps smoothness
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        updateImageTransform();
        rafRef.current = null;
      });
    }
  }, [updateImageTransform]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    // Sync state with ref
    setPosition({ ...positionRef.current });
  }, []);

  // Keep position ref in sync when state changes (e.g., ratio reset)
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Update image transform when zoom/rotation changes
  useEffect(() => {
    updateImageTransform();
  }, [zoom, rotation, updateImageTransform]);

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

    // Optimized: Rotate only the output canvas, not the entire source image
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(cropWidth / 2, cropHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        -cropWidth / 2,
        -cropHeight / 2,
        cropWidth,
        cropHeight
      );
      ctx.restore();
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
          className="absolute inset-0 flex items-center justify-center touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ cursor: 'grab', touchAction: 'none' }}
        >
          <img
            ref={imageRef}
            src={imageDataUrl}
            alt="Crop preview"
            className="select-none will-change-transform"
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
            <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={zoom}
            onInput={(e) => setZoom(Number((e.target as HTMLInputElement).value))}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer touch-none
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:shadow-lg"
          />
        </div>

        {/* Rotation Slider */}
        <div className="px-6 py-3 space-y-2 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-white/60">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>Rotate</span>
            </div>
            <span className="tabular-nums">{rotation}°</span>
          </div>
          <input
            type="range"
            min="-45"
            max="45"
            step="1"
            value={rotation}
            onInput={(e) => setRotation(Number((e.target as HTMLInputElement).value))}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer touch-none
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
