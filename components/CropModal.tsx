'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Check } from 'lucide-react';

interface CropModalProps {
  image: HTMLCanvasElement;
  onClose: () => void;
  onApply: (croppedCanvas: HTMLCanvasElement) => void;
}

const ASPECT_RATIOS = [
  { id: 'free', label: 'Free', ratio: null },
  { id: 'original', label: 'Original', ratio: -1 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '5:4', label: '5:4', ratio: 5 / 4 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
];

type HandleType = 'tl' | 'tr' | 'bl' | 'br' | 'move' | null;

export function CropModal({ image, onClose, onApply }: CropModalProps) {
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]); // Free by default
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Crop box state (in pixels relative to displayed image)
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [imageDisplay, setImageDisplay] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });

  // Drag state
  const [activeHandle, setActiveHandle] = useState<HandleType>(null);
  const dragStartRef = useRef({ x: 0, y: 0, box: { x: 0, y: 0, width: 0, height: 0 } });

  // Memoize the data URL
  const imageDataUrl = useMemo(() => image.toDataURL('image/jpeg', 0.92), [image]);

  // Original aspect ratio
  const originalRatio = useMemo(() => image.width / image.height, [image.width, image.height]);

  // Get effective ratio (null = free, -1 = original, otherwise the ratio)
  const effectiveRatio = useMemo(() => {
    if (selectedRatio.ratio === null) return null; // Free
    if (selectedRatio.ratio === -1) return originalRatio;
    return selectedRatio.ratio;
  }, [selectedRatio.ratio, originalRatio]);

  // Initialize crop box when image loads or container resizes
  useEffect(() => {
    const initCropBox = () => {
      if (!containerRef.current || !imageRef.current) return;

      const container = containerRef.current;
      const img = imageRef.current;

      // Wait for image to have dimensions
      if (img.naturalWidth === 0) return;

      const containerRect = container.getBoundingClientRect();
      const maxWidth = containerRect.width * 0.9;
      const maxHeight = containerRect.height * 0.85;

      // Calculate displayed image size (object-contain)
      const imgRatio = image.width / image.height;
      let displayWidth, displayHeight;

      if (maxWidth / maxHeight > imgRatio) {
        displayHeight = maxHeight;
        displayWidth = displayHeight * imgRatio;
      } else {
        displayWidth = maxWidth;
        displayHeight = displayWidth / imgRatio;
      }

      const offsetX = (containerRect.width - displayWidth) / 2;
      const offsetY = (containerRect.height - displayHeight) / 2;

      setImageDisplay({ width: displayWidth, height: displayHeight, offsetX, offsetY });

      // Initialize crop box to full image
      setCropBox({ x: 0, y: 0, width: displayWidth, height: displayHeight });
    };

    initCropBox();

    const img = imageRef.current;
    if (img) {
      img.onload = initCropBox;
    }

    window.addEventListener('resize', initCropBox);
    return () => window.removeEventListener('resize', initCropBox);
  }, [image.width, image.height]);

  // Reset crop box when aspect ratio changes
  useEffect(() => {
    if (imageDisplay.width === 0) return;

    let newWidth = imageDisplay.width;
    let newHeight = imageDisplay.height;

    if (effectiveRatio !== null) {
      // Constrain to aspect ratio
      const currentRatio = imageDisplay.width / imageDisplay.height;
      if (currentRatio > effectiveRatio) {
        // Image is wider than target ratio - constrain by height
        newHeight = imageDisplay.height;
        newWidth = newHeight * effectiveRatio;
      } else {
        // Image is taller than target ratio - constrain by width
        newWidth = imageDisplay.width;
        newHeight = newWidth / effectiveRatio;
      }
    }

    const x = (imageDisplay.width - newWidth) / 2;
    const y = (imageDisplay.height - newHeight) / 2;

    setCropBox({ x, y, width: newWidth, height: newHeight });
  }, [selectedRatio, effectiveRatio, imageDisplay.width, imageDisplay.height]);

  // Handle pointer down on crop handles or box
  const handlePointerDown = useCallback((e: React.PointerEvent, handle: HandleType) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveHandle(handle);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      box: { ...cropBox }
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [cropBox]);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!activeHandle) return;
    e.preventDefault();

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    const startBox = dragStartRef.current.box;

    let newBox = { ...startBox };
    const minSize = 50;

    if (activeHandle === 'move') {
      // Move the entire box
      newBox.x = Math.max(0, Math.min(imageDisplay.width - startBox.width, startBox.x + deltaX));
      newBox.y = Math.max(0, Math.min(imageDisplay.height - startBox.height, startBox.y + deltaY));
    } else {
      // Resize from corner
      if (activeHandle === 'tl') {
        newBox.x = startBox.x + deltaX;
        newBox.y = startBox.y + deltaY;
        newBox.width = startBox.width - deltaX;
        newBox.height = startBox.height - deltaY;
      } else if (activeHandle === 'tr') {
        newBox.y = startBox.y + deltaY;
        newBox.width = startBox.width + deltaX;
        newBox.height = startBox.height - deltaY;
      } else if (activeHandle === 'bl') {
        newBox.x = startBox.x + deltaX;
        newBox.width = startBox.width - deltaX;
        newBox.height = startBox.height + deltaY;
      } else if (activeHandle === 'br') {
        newBox.width = startBox.width + deltaX;
        newBox.height = startBox.height + deltaY;
      }

      // Apply aspect ratio constraint
      if (effectiveRatio !== null) {
        const currentRatio = newBox.width / newBox.height;
        if (activeHandle === 'tl' || activeHandle === 'br') {
          if (currentRatio > effectiveRatio) {
            newBox.width = newBox.height * effectiveRatio;
            if (activeHandle === 'tl') {
              newBox.x = startBox.x + startBox.width - newBox.width;
            }
          } else {
            newBox.height = newBox.width / effectiveRatio;
            if (activeHandle === 'tl') {
              newBox.y = startBox.y + startBox.height - newBox.height;
            }
          }
        } else {
          if (currentRatio > effectiveRatio) {
            newBox.width = newBox.height * effectiveRatio;
            if (activeHandle === 'bl') {
              newBox.x = startBox.x + startBox.width - newBox.width;
            }
          } else {
            newBox.height = newBox.width / effectiveRatio;
            if (activeHandle === 'tr') {
              newBox.y = startBox.y + startBox.height - newBox.height;
            }
          }
        }
      }

      // Enforce minimum size
      if (newBox.width < minSize) {
        newBox.width = minSize;
        if (activeHandle === 'tl' || activeHandle === 'bl') {
          newBox.x = startBox.x + startBox.width - minSize;
        }
      }
      if (newBox.height < minSize) {
        newBox.height = minSize;
        if (activeHandle === 'tl' || activeHandle === 'tr') {
          newBox.y = startBox.y + startBox.height - minSize;
        }
      }

      // Keep within bounds
      newBox.x = Math.max(0, newBox.x);
      newBox.y = Math.max(0, newBox.y);
      newBox.width = Math.min(newBox.width, imageDisplay.width - newBox.x);
      newBox.height = Math.min(newBox.height, imageDisplay.height - newBox.y);
    }

    setCropBox(newBox);
  }, [activeHandle, effectiveRatio, imageDisplay.width, imageDisplay.height]);

  const handlePointerUp = useCallback(() => {
    setActiveHandle(null);
  }, []);

  // Apply crop
  const handleApply = useCallback(() => {
    if (imageDisplay.width === 0) return;

    // Scale crop box to original image dimensions
    const scaleX = image.width / imageDisplay.width;
    const scaleY = image.height / imageDisplay.height;

    const sourceX = cropBox.x * scaleX;
    const sourceY = cropBox.y * scaleY;
    const sourceWidth = cropBox.width * scaleX;
    const sourceHeight = cropBox.height * scaleY;

    // Create output canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = Math.round(sourceWidth);
    croppedCanvas.height = Math.round(sourceHeight);

    const ctx = croppedCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      croppedCanvas.width,
      croppedCanvas.height
    );

    onApply(croppedCanvas);
  }, [image, cropBox, imageDisplay, onApply]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col overscroll-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
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

      {/* Image with Crop Overlay */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden bg-black min-h-0"
      >
        {/* Image */}
        <img
          ref={imageRef}
          src={imageDataUrl}
          alt="Crop preview"
          className="max-w-[90%] max-h-[85%] object-contain pointer-events-none select-none"
          draggable={false}
        />

        {/* Dark overlay outside crop area */}
        {imageDisplay.width > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: imageDisplay.offsetX,
              top: imageDisplay.offsetY,
              width: imageDisplay.width,
              height: imageDisplay.height,
            }}
          >
            {/* Top dark */}
            <div
              className="absolute bg-black/60 left-0 right-0 top-0"
              style={{ height: cropBox.y }}
            />
            {/* Bottom dark */}
            <div
              className="absolute bg-black/60 left-0 right-0 bottom-0"
              style={{ height: imageDisplay.height - cropBox.y - cropBox.height }}
            />
            {/* Left dark */}
            <div
              className="absolute bg-black/60 left-0"
              style={{
                top: cropBox.y,
                width: cropBox.x,
                height: cropBox.height
              }}
            />
            {/* Right dark */}
            <div
              className="absolute bg-black/60 right-0"
              style={{
                top: cropBox.y,
                width: imageDisplay.width - cropBox.x - cropBox.width,
                height: cropBox.height
              }}
            />
          </div>
        )}

        {/* Crop Box with Handles */}
        {imageDisplay.width > 0 && (
          <div
            className="absolute border-2 border-white"
            style={{
              left: imageDisplay.offsetX + cropBox.x,
              top: imageDisplay.offsetY + cropBox.y,
              width: cropBox.width,
              height: cropBox.height,
              cursor: activeHandle === 'move' ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
            onPointerDown={(e) => handlePointerDown(e, 'move')}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
            </div>

            {/* Corner handles */}
            {/* Top Left */}
            <div
              className="absolute -top-2 -left-2 w-6 h-6 cursor-nwse-resize"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => handlePointerDown(e, 'tl')}
            >
              <div className="absolute top-1 left-1 w-4 h-1 bg-white rounded-full" />
              <div className="absolute top-1 left-1 w-1 h-4 bg-white rounded-full" />
            </div>

            {/* Top Right */}
            <div
              className="absolute -top-2 -right-2 w-6 h-6 cursor-nesw-resize"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => handlePointerDown(e, 'tr')}
            >
              <div className="absolute top-1 right-1 w-4 h-1 bg-white rounded-full" />
              <div className="absolute top-1 right-1 w-1 h-4 bg-white rounded-full" />
            </div>

            {/* Bottom Left */}
            <div
              className="absolute -bottom-2 -left-2 w-6 h-6 cursor-nesw-resize"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => handlePointerDown(e, 'bl')}
            >
              <div className="absolute bottom-1 left-1 w-4 h-1 bg-white rounded-full" />
              <div className="absolute bottom-1 left-1 w-1 h-4 bg-white rounded-full" />
            </div>

            {/* Bottom Right */}
            <div
              className="absolute -bottom-2 -right-2 w-6 h-6 cursor-nwse-resize"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => handlePointerDown(e, 'br')}
            >
              <div className="absolute bottom-1 right-1 w-4 h-1 bg-white rounded-full" />
              <div className="absolute bottom-1 right-1 w-1 h-4 bg-white rounded-full" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls - Aspect Ratios */}
      <div className="bg-black/80 backdrop-blur-sm border-t border-white/10 flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
        <div className="flex gap-2 overflow-x-auto px-4 py-4 scrollbar-hide">
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
                {ratio.ratio === null ? (
                  // Free - dashed border
                  <div className="w-6 h-5 border border-dashed border-white/60 rounded" />
                ) : ratio.ratio === -1 ? (
                  // Original - show actual ratio
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
      </div>
    </div>
  );
}
