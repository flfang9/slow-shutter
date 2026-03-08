'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Check, RotateCcw, ZoomIn } from 'lucide-react';

interface CropModalProps {
  image: HTMLCanvasElement;
  onClose: () => void;
  onApply: (croppedCanvas: HTMLCanvasElement) => void;
}

const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', ratio: -1 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '5:4', label: '5:4', ratio: 5 / 4 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
];

export function CropModal({ image, onClose, onApply }: CropModalProps) {
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]); // Default to Original
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropFrameRef = useRef<HTMLDivElement>(null);

  // Refs for smooth dragging without state updates
  const positionRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Memoize the data URL
  const imageDataUrl = useMemo(() => image.toDataURL('image/jpeg', 0.92), [image]);

  // Calculate the actual original aspect ratio
  const originalRatio = useMemo(() => {
    const ratio = image.width / image.height;
    console.log('Original image ratio:', ratio, 'from', image.width, 'x', image.height);
    return ratio;
  }, [image.width, image.height]);

  // Get effective ratio
  const effectiveRatio = useMemo(() => {
    if (selectedRatio.ratio === -1) {
      return originalRatio;
    }
    return selectedRatio.ratio;
  }, [selectedRatio.ratio, originalRatio]);

  // Reset everything when ratio changes
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
    setZoom(1);
    setRotation(0);
  }, [selectedRatio]);

  // Direct DOM update for smooth 60fps dragging
  const updateImagePosition = useCallback(() => {
    if (imageRef.current) {
      const { x, y } = positionRef.current;
      imageRef.current.style.transform = `translate(${x}px, ${y}px) scale(${zoom}) rotate(${rotation}deg)`;
    }
  }, [zoom, rotation]);

  // Sync position ref with state
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Pointer handlers for dragging
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();

    positionRef.current = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    };

    // Direct DOM update for smooth dragging
    updateImagePosition();
  }, [updateImagePosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    // Sync state with final position
    setPosition({ ...positionRef.current });
  }, []);

  const handleApply = useCallback(() => {
    if (!containerRef.current || !cropFrameRef.current || !imageRef.current) return;

    const cropFrame = cropFrameRef.current;
    const imageEl = imageRef.current;

    const frameRect = cropFrame.getBoundingClientRect();
    const imageRect = imageEl.getBoundingClientRect();

    // For "Original", use the full original image dimensions
    let outputWidth: number;
    let outputHeight: number;

    if (selectedRatio.ratio === -1) {
      // Original: preserve exact source dimensions
      outputWidth = image.width;
      outputHeight = image.height;
    } else {
      // Other ratios: scale to max 2000px
      const maxSize = 2000;
      if (effectiveRatio >= 1) {
        outputWidth = maxSize;
        outputHeight = Math.round(maxSize / effectiveRatio);
      } else {
        outputHeight = maxSize;
        outputWidth = Math.round(maxSize * effectiveRatio);
      }
    }

    // Create output canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = outputWidth;
    croppedCanvas.height = outputHeight;

    const ctx = croppedCanvas.getContext('2d');
    if (!ctx) return;

    // Image's displayed size (before zoom)
    const displayedWidth = imageRect.width / zoom;
    const displayedHeight = imageRect.height / zoom;

    // Scale from displayed size to original image size
    const scaleToOriginal = image.width / displayedWidth;

    // Center of the image in screen coordinates
    const imageCenterX = imageRect.left + imageRect.width / 2;
    const imageCenterY = imageRect.top + imageRect.height / 2;

    // Crop frame center in screen coordinates
    const frameCenterX = frameRect.left + frameRect.width / 2;
    const frameCenterY = frameRect.top + frameRect.height / 2;

    // Offset from image center to frame center (in screen pixels, accounting for zoom)
    const offsetX = (frameCenterX - imageCenterX) / zoom;
    const offsetY = (frameCenterY - imageCenterY) / zoom;

    // Convert to original image coordinates
    const sourceX = (image.width / 2) + (offsetX * scaleToOriginal) - ((frameRect.width / zoom) * scaleToOriginal / 2);
    const sourceY = (image.height / 2) + (offsetY * scaleToOriginal) - ((frameRect.height / zoom) * scaleToOriginal / 2);
    const sourceWidth = (frameRect.width / zoom) * scaleToOriginal;
    const sourceHeight = (frameRect.height / zoom) * scaleToOriginal;

    // Apply rotation if needed
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(outputWidth / 2, outputHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(
        image,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(sourceWidth, image.width - sourceX),
        Math.min(sourceHeight, image.height - sourceY),
        -outputWidth / 2,
        -outputHeight / 2,
        outputWidth,
        outputHeight
      );
      ctx.restore();
    } else {
      ctx.drawImage(
        image,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(sourceWidth, image.width - sourceX),
        Math.min(sourceHeight, image.height - sourceY),
        0,
        0,
        outputWidth,
        outputHeight
      );
    }

    onApply(croppedCanvas);
  }, [image, effectiveRatio, selectedRatio.ratio, zoom, rotation, onApply]);

  // Calculate crop frame dimensions using container-relative sizing
  const [frameSize, setFrameSize] = useState({ width: 300, height: 300 });

  useEffect(() => {
    const updateFrameSize = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth * 0.85;
      const containerHeight = container.clientHeight * 0.75;

      let frameWidth: number;
      let frameHeight: number;

      if (effectiveRatio >= 1) {
        // Landscape or square: constrain by width first
        frameWidth = Math.min(containerWidth, containerHeight * effectiveRatio);
        frameHeight = frameWidth / effectiveRatio;
      } else {
        // Portrait: constrain by height first
        frameHeight = Math.min(containerHeight, containerWidth / effectiveRatio);
        frameWidth = frameHeight * effectiveRatio;
      }

      setFrameSize({ width: frameWidth, height: frameHeight });
    };

    updateFrameSize();
    window.addEventListener('resize', updateFrameSize);
    return () => window.removeEventListener('resize', updateFrameSize);
  }, [effectiveRatio]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overscroll-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 text-white/60 hover:text-white transition-colors active:scale-95"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-base font-medium text-white">Crop</h2>
        <button
          onClick={handleApply}
          className="p-2 text-white hover:text-white/80 transition-colors active:scale-95"
        >
          <Check className="w-6 h-6" />
        </button>
      </div>

      {/* Image Preview with Crop Frame */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden bg-black min-h-0"
      >
        {/* Draggable Image */}
        <div
          className="absolute inset-0 flex items-center justify-center select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            cursor: isDraggingRef.current ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
        >
          <img
            ref={imageRef}
            src={imageDataUrl}
            alt="Crop preview"
            className="select-none will-change-transform pointer-events-none"
            draggable={false}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center',
              maxWidth: 'none',
              maxHeight: 'none',
              width: 'auto',
              height: '75vh',
            }}
          />
        </div>

        {/* Fixed Crop Frame Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            ref={cropFrameRef}
            className="crop-frame relative border-2 border-white"
            style={{
              width: frameSize.width,
              height: frameSize.height,
            }}
          >
            {/* Corner Brackets */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-white" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-white" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-white" />

            {/* Grid lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/20" />
              ))}
            </div>

            {/* Darkened overlay outside crop */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/80 backdrop-blur-sm border-t border-white/10 flex-shrink-0">
        {/* Aspect Ratio Presets */}
        <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.id}
              onClick={() => setSelectedRatio(ratio)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                selectedRatio.id === ratio.id ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div
                className={`w-11 h-11 border-2 rounded-lg flex items-center justify-center ${
                  selectedRatio.id === ratio.id
                    ? 'border-white bg-white/10'
                    : 'border-white/30'
                }`}
              >
                {ratio.ratio === -1 ? (
                  // Show actual image aspect ratio icon
                  <div
                    className="border border-white/60 rounded"
                    style={{
                      width: originalRatio >= 1 ? '1.75rem' : `${1.75 * originalRatio}rem`,
                      height: originalRatio >= 1 ? `${1.75 / originalRatio}rem` : '1.75rem',
                    }}
                  />
                ) : ratio.ratio < 1 ? (
                  <div className="w-3.5 h-7 bg-white/50 rounded" />
                ) : ratio.ratio === 1 ? (
                  <div className="w-5 h-5 bg-white/50 rounded" />
                ) : (
                  <div className="w-7 h-3.5 bg-white/50 rounded" />
                )}
              </div>
              <span className="text-[10px] text-white/60 font-medium">{ratio.label}</span>
            </button>
          ))}
        </div>

        {/* Zoom Slider */}
        <div className="px-5 py-2.5">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
            <div className="flex items-center gap-2">
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Zoom</span>
            </div>
            <span className="tabular-nums font-medium">{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.02"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-0
                       [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                       [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:border-0"
            style={{ touchAction: 'none' }}
          />
        </div>

        {/* Rotation Slider */}
        <div className="px-5 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rotate</span>
            </div>
            <span className="tabular-nums font-medium">{rotation}°</span>
          </div>
          <input
            type="range"
            min="-45"
            max="45"
            step="1"
            value={rotation}
            onChange={(e) => setRotation(parseInt(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-0
                       [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                       [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:border-0"
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
