'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MoveRight, Maximize, Wind, RotateCw, Sparkles, Zap, Film, Crop } from 'lucide-react';
import { EffectType } from '@/types';
import { DropZone } from '@/components/DropZone';
import { EffectSelector } from '@/components/EffectSelector';
import { LensDial } from '@/components/LensDial';
import { ImagePreview } from '@/components/ImagePreview';
import { ExportControls } from '@/components/ExportControls';
import { LoadingState } from '@/components/LoadingState';
import { GridBackground } from '@/components/GridBackground';
import { CropModal } from '@/components/CropModal';
import {
  validateImageFile,
  loadImage,
  scaleImageIfNeeded,
} from '@/lib/image-utils';
import { EffectProcessor } from '@/lib/webgl/processor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<EffectType>('cinematic-swirl');
  const [intensity, setIntensity] = useState(50);
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dockMinimized, setDockMinimized] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartIntensity, setDragStartIntensity] = useState(0);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showingBefore, setShowingBefore] = useState(false);
  const [swirlCenter, setSwirlCenter] = useState({ x: 0.5, y: 0.45 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processorRef = useRef<EffectProcessor | null>(null);
  const previewProcessorRef = useRef<EffectProcessor | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intensityRef = useRef(intensity);
  const effectRef = useRef(selectedEffect);
  const rafRef = useRef<number | null>(null);
  const isPreviewingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { intensityRef.current = intensity; }, [intensity]);
  useEffect(() => { effectRef.current = selectedEffect; }, [selectedEffect]);

  // Reset intensity to 50 when switching effects
  useEffect(() => {
    setIntensity(50);
  }, [selectedEffect]);

  useEffect(() => {
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    if (!previewCanvasRef.current) previewCanvasRef.current = document.createElement('canvas');

    if (!processorRef.current) {
      try {
        processorRef.current = new EffectProcessor(canvasRef.current);
      } catch (err) {
        setError('Failed to initialize WebGL');
      }
    }

    if (!previewProcessorRef.current) {
      try {
        previewProcessorRef.current = new EffectProcessor(previewCanvasRef.current);
      } catch (err) {
        console.error('Failed to initialize preview');
      }
    }

    return () => {
      processorRef.current?.dispose();
      previewProcessorRef.current?.dispose();
    };
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      const img = await loadImage(file);
      const scaledImg = scaleImageIfNeeded(img);

      let finalImg: HTMLImageElement;
      if (scaledImg instanceof HTMLCanvasElement) {
        finalImg = new Image();
        finalImg.src = scaledImg.toDataURL();
        await new Promise((resolve) => { finalImg.onload = resolve; });
      } else {
        finalImg = scaledImg;
      }

      const MAX_PREVIEW_SIZE = 1000;
      const scale = Math.min(1, MAX_PREVIEW_SIZE / Math.max(finalImg.width, finalImg.height));

      if (scale < 1) {
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = Math.floor(finalImg.width * scale);
        previewCanvas.height = Math.floor(finalImg.height * scale);
        const ctx = previewCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(finalImg, 0, 0, previewCanvas.width, previewCanvas.height);
          const previewImg = new Image();
          previewImg.src = previewCanvas.toDataURL();
          await new Promise((resolve) => { previewImg.onload = resolve; });
          setPreviewImage(previewImg);
        }
      } else {
        setPreviewImage(finalImg);
      }

      setUploadedImage(finalImg);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
      setError(`Upload failed: ${errorMessage}`);
      console.error('Upload error:', err);
      alert(`Upload failed: ${errorMessage}`);
    }
  }, [selectedEffect, intensity]);

  const processPreviewImmediate = useCallback(async (effectOverride?: EffectType, intensityOverride?: number) => {
    if (!previewImage || !previewProcessorRef.current) return;
    // Skip if already processing, but don't block forever
    if (isPreviewingRef.current) {
      // Schedule a retry
      requestAnimationFrame(() => processPreviewImmediate(effectOverride, intensityOverride));
      return;
    }
    isPreviewingRef.current = true;
    try {
      const result = await previewProcessorRef.current.applyEffect(
        previewImage,
        effectOverride ?? effectRef.current,
        intensityOverride ?? intensityRef.current,
        { swirlCenter }
      );
      setProcessedCanvas(result);
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      isPreviewingRef.current = false;
    }
  }, [previewImage, swirlCenter]);

  // RAF-throttled preview for smooth slider dragging
  const schedulePreview = useCallback(() => {
    if (rafRef.current) return; // Already scheduled
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      processPreviewImmediate();
    });
  }, [processPreviewImmediate]);

  const processFullQuality = useCallback(async (effectOverride?: EffectType, intensityOverride?: number) => {
    if (!uploadedImage || !processorRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await processorRef.current.applyEffect(
        uploadedImage,
        effectOverride ?? effectRef.current,
        intensityOverride ?? intensityRef.current,
        { swirlCenter }
      );
      setProcessedCanvas(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      setError(`Effect failed: ${errorMessage}`);
      console.error('Processing error:', err);
      alert(`Effect processing failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImage, isProcessing, swirlCenter]);

  // Process immediately when image is first uploaded
  useEffect(() => {
    if (previewImage) {
      processPreviewImmediate(selectedEffect, intensity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewImage]);

  useEffect(() => {
    if (previewImage) processPreviewImmediate(selectedEffect, intensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEffect]);

  // Process full quality when image is first uploaded
  useEffect(() => {
    if (uploadedImage) {
      const timeout = setTimeout(() => processFullQuality(selectedEffect, intensity), 100);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedImage]);

  useEffect(() => {
    if (!uploadedImage) return;
    const timeout = setTimeout(() => processFullQuality(selectedEffect, intensity), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEffect]);

  // RAF-throttled preview update when intensity changes (60fps max)
  useEffect(() => {
    if (!previewImage) return;
    schedulePreview();
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity]);

  // Debounced full quality update when intensity changes
  useEffect(() => {
    if (!uploadedImage) return;
    const timeout = setTimeout(() => processFullQuality(selectedEffect, intensity), 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity]);

  // Keyboard shortcut: Hold spacebar to show before (desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && uploadedImage) {
        e.preventDefault();
        setShowingBefore(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && uploadedImage) {
        e.preventDefault();
        setShowingBefore(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [uploadedImage]);

  // Helper to get actual image bounds accounting for object-contain
  const getImageBounds = (img: HTMLImageElement) => {
    const rect = img.getBoundingClientRect();
    const imgAspect = uploadedImage ? uploadedImage.width / uploadedImage.height : 1;
    const containerAspect = rect.width / rect.height;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (containerAspect > imgAspect) {
      // Container is wider - image is constrained by height
      displayHeight = rect.height;
      displayWidth = displayHeight * imgAspect;
      offsetX = (rect.width - displayWidth) / 2;
      offsetY = 0;
    } else {
      // Container is taller - image is constrained by width
      displayWidth = rect.width;
      displayHeight = displayWidth / imgAspect;
      offsetX = 0;
      offsetY = (rect.height - displayHeight) / 2;
    }

    return { displayWidth, displayHeight, offsetX, offsetY, rect };
  };

  // Handle click/tap to set swirl center (works on both mobile and desktop)
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement> | React.TouchEvent<HTMLImageElement>) => {
    if (selectedEffect === 'cinematic-swirl') {
      const img = e.currentTarget;
      const bounds = getImageBounds(img);

      // Get click/touch position
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Calculate position relative to actual displayed image (not container)
      const x = (clientX - bounds.rect.left - bounds.offsetX) / bounds.displayWidth;
      const y = (clientY - bounds.rect.top - bounds.offsetY) / bounds.displayHeight;

      // Clamp to 0-1 range
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));

      // Only invert Y to match texture coordinate space (screen Y is inverted from texture Y)
      setSwirlCenter({ x: clampedX, y: 1.0 - clampedY });

      // Re-process with new center
      setTimeout(() => {
        processPreviewImmediate(selectedEffect, intensity);
        processFullQuality(selectedEffect, intensity);
      }, 50);
    } else {
      // For other effects, toggle before/after
      setShowingBefore(!showingBefore);
    }
  };

  // Desktop: Click and hold to show before
  const handleCompareStart = (e: React.PointerEvent) => {
    // Only for mouse/trackpad, not touch
    if (e.pointerType !== 'touch') {
      setShowingBefore(true);
    }
  };

  const handleCompareEnd = (e: React.PointerEvent) => {
    // Only for mouse/trackpad, not touch
    if (e.pointerType !== 'touch') {
      setShowingBefore(false);
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setPreviewImage(null);
    setProcessedCanvas(null);
    setSelectedEffect('cinematic-swirl');
    setIntensity(50);
    setError(null);
    setDockMinimized(false);
  };

  const handleSliderDragStart = (e: React.PointerEvent) => {
    setIsDraggingSlider(true);
    setDragStartX(e.clientX);
    setDragStartIntensity(intensity);
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
  };

  const handleSliderDragMove = (e: React.PointerEvent) => {
    if (!isDraggingSlider) return;
    const deltaX = e.clientX - dragStartX;
    const percentChange = (deltaX / window.innerWidth) * 100;
    const newIntensity = Math.max(0, Math.min(100, dragStartIntensity + percentChange));
    setIntensity(Math.round(newIntensity));
  };

  const handleSliderDragEnd = () => {
    setIsDraggingSlider(false);
    fadeTimeoutRef.current = setTimeout(() => {
      setIsDraggingSlider(false);
    }, 500);
  };

  const handleCropApply = (croppedCanvas: HTMLCanvasElement) => {
    setProcessedCanvas(croppedCanvas);
    setShowCropModal(false);
  };

  return (
    <>
      {/* Desktop Layout - ZERO SHIFT */}
      <div className="hidden md:flex h-screen overflow-hidden max-h-screen">
        {/* Image Container - LEFT 70% */}
        <div className="w-[70%] h-screen overflow-hidden flex items-center justify-center bg-[#050505] relative">
          {/* Grid Background (Empty State) */}
          {!uploadedImage && <GridBackground />}

          {!uploadedImage && (
            <div className="max-w-md w-full px-8 relative z-10">
              <DropZone onFileSelect={handleFileSelect} />
            </div>
          )}
          {uploadedImage && uploadedImage.src && (
            <>
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                  <LoadingState />
                </div>
              )}
              <div className="w-full h-full p-8 flex items-center justify-center">
                <img
                  src={
                    showingBefore
                      ? uploadedImage.src
                      : processedCanvas
                        ? processedCanvas.toDataURL('image/jpeg', 0.95)
                        : uploadedImage.src
                  }
                  alt="Processed"
                  className="max-h-[85vh] max-w-[90%] object-contain transition-none cursor-pointer select-none"
                  draggable={false}
                  onClick={handleImageClick}
                  onPointerDown={handleCompareStart}
                  onPointerUp={handleCompareEnd}
                  onPointerLeave={handleCompareEnd}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            </>
          )}
        </div>

        {/* Sidebar - RIGHT 30% */}
        <div className="w-[30%] h-screen bg-[#080808] border-l border-white/10 flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-sm font-light tracking-[0.2em] text-white/80 uppercase">
              Slow Shutter
            </h1>
          </div>

          {/* Manifesto (Empty State) */}
          {!uploadedImage && (
            <div className="flex-1 p-8 flex flex-col justify-center">
              <h2 className="text-2xl font-light text-white/90 mb-4 leading-tight">
                A Studio for Motion
              </h2>
              <p className="text-sm text-white/60 leading-relaxed mb-6">
                Apply cinematic slow shutter effects to your photographs.
                Transform static moments into dynamic visual narratives with
                professional motion blur techniques.
              </p>
              <div className="space-y-3 text-xs text-white/40 font-mono">
                <div>→ Lateral Motion Blur</div>
                <div>→ Radial Zoom Pull</div>
                <div>→ Handheld Drift</div>
                <div>→ Cinematic Swirl</div>
                <div>→ Soft Light Halation</div>
                <div>→ Film Grain Texture</div>
              </div>
            </div>
          )}

          {uploadedImage && (
            <div className="flex-1 p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-medium tracking-wider text-white/50 uppercase block">
                  Effect
                </label>
                <EffectSelector
                  selectedEffect={selectedEffect}
                  onEffectSelect={setSelectedEffect}
                />
              </div>

              <LensDial value={intensity} onChange={setIntensity} />

              <div className="pt-6 border-t border-white/10">
                <ExportControls canvas={processedCanvas} originalImage={uploadedImage} onReset={handleReset} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout - Instagram-Style Dock */}
      <div className="block md:hidden h-[100dvh] overflow-hidden bg-black relative">
        {/* Grid Background (Empty State) - Full Screen Fixed */}
        {!uploadedImage && (
          <div className="fixed inset-0 z-0">
            <GridBackground />
          </div>
        )}

        {/* Dropzone - Centered in Full Viewport */}
        {!uploadedImage && (
          <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <DropZone onFileSelect={handleFileSelect} />
            </div>
          </div>
        )}

        {/* Full-Screen Image Container - h-[100dvh] */}
        <div className="fixed inset-0 z-0 h-[100dvh] flex items-center bg-[#050505]">
          {uploadedImage && uploadedImage.src && (
            <>
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                  <LoadingState />
                </div>
              )}

              <img
                src={
                  showingBefore
                    ? uploadedImage.src
                    : processedCanvas
                      ? processedCanvas.toDataURL('image/jpeg', 0.95)
                      : uploadedImage.src
                }
                alt="Processed"
                className="w-full h-full object-contain transition-none select-none cursor-pointer"
                draggable={false}
                style={{
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                  objectPosition: 'center 35%',
                }}
                onClick={handleImageClick}
                onTouchEnd={handleImageClick}
                onPointerDown={handleCompareStart}
                onPointerUp={handleCompareEnd}
                onPointerLeave={handleCompareEnd}
                onContextMenu={(e) => e.preventDefault()}
              />
            </>
          )}
        </div>

        {/* Collapsible HUD - z-10 Layer */}
        {uploadedImage && (
          <div
            className={`fixed bottom-0 left-0 right-0 z-10 bg-black/60 border-t border-white/10 transition-transform duration-300 ${
              dockMinimized ? 'translate-y-[calc(100%-80px)]' : 'translate-y-0'
            }`}
            style={{
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
            }}
          >
            {/* Swipe Handle */}
            <div
              className="flex justify-center py-3 cursor-pointer touch-none"
              onTouchStart={(e) => {
                const startY = e.touches[0].clientY;
                const handleMove = (moveEvent: TouchEvent) => {
                  const deltaY = moveEvent.touches[0].clientY - startY;
                  if (deltaY > 80) setDockMinimized(true);
                  else if (deltaY < -80) setDockMinimized(false);
                };
                const handleEnd = () => {
                  document.removeEventListener('touchmove', handleMove);
                  document.removeEventListener('touchend', handleEnd);
                };
                document.addEventListener('touchmove', handleMove);
                document.addEventListener('touchend', handleEnd);
              }}
              onClick={() => setDockMinimized(!dockMinimized)}
            >
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>

            {!dockMinimized && (
              <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
                {/* Row 1: Effect Icons */}
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
                  {[
                    { id: 'lateral-motion', icon: MoveRight, label: 'Motion' },
                    { id: 'vertical-zoom', icon: Maximize, label: 'Zoom' },
                    { id: 'handheld-drift', icon: Wind, label: 'Drift' },
                    { id: 'cinematic-swirl', icon: RotateCw, label: 'Swirl' },
                    { id: 'soft-light', icon: Sparkles, label: 'Light' },
                    { id: 'light-trails', icon: Zap, label: 'Trails' },
                    { id: 'film-grain', icon: Film, label: 'Grain' },
                  ].map((effect) => {
                    const Icon = effect.icon;
                    return (
                      <button
                        key={effect.id}
                        onClick={() => setSelectedEffect(effect.id as EffectType)}
                        className={`
                          snap-center flex-shrink-0 w-[60px] h-[60px] rounded-lg
                          border transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5
                          ${
                            selectedEffect === effect.id
                              ? 'border-white bg-white/10'
                              : 'border-white/10 bg-white/5'
                          }
                        `}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            selectedEffect === effect.id ? 'text-white' : 'text-white/50'
                          }`}
                        />
                        <span className={`text-[8px] font-medium uppercase tracking-wider ${
                          selectedEffect === effect.id ? 'text-white' : 'text-white/40'
                        }`}>
                          {effect.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Row 2: Gesture Slider Area */}
                <div
                  className="px-2 py-4 touch-none"
                  onPointerDown={handleSliderDragStart}
                  onPointerMove={handleSliderDragMove}
                  onPointerUp={handleSliderDragEnd}
                  onPointerLeave={handleSliderDragEnd}
                >
                  <div className="text-center text-xs text-white/40 mb-2">
                    {intensity}%
                  </div>
                  <div className="h-0.5 bg-white/10 rounded-full">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${intensity}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Always Visible: Crop | Share | New Buttons */}
            <div className={`px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] ${dockMinimized ? '' : 'pt-4 border-t border-white/10'}`}>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setShowCropModal(true)}
                  className="px-4 py-3 text-sm font-medium text-white/40
                             border border-white/10 rounded-lg transition-all
                             active:bg-white/5 active:scale-[0.98]"
                >
                  Crop
                </button>
                <button
                  onClick={async () => {
                    // Use processedCanvas or fallback to original image
                    let exportCanvas: HTMLCanvasElement | null = processedCanvas;
                    if (!exportCanvas && uploadedImage) {
                      exportCanvas = document.createElement('canvas');
                      exportCanvas.width = uploadedImage.width;
                      exportCanvas.height = uploadedImage.height;
                      const ctx = exportCanvas.getContext('2d');
                      if (ctx) ctx.drawImage(uploadedImage, 0, 0);
                    }
                    if (!exportCanvas) return;

                    // Mobile: Use native share sheet to save to Photos
                    if (navigator.share && navigator.canShare) {
                      try {
                        const blob = await new Promise<Blob>((resolve) => {
                          exportCanvas!.toBlob((blob) => {
                            if (blob) resolve(blob);
                          }, 'image/jpeg', 0.95);
                        });

                        const file = new File([blob], `slow-shutter-${Date.now()}.jpg`, {
                          type: 'image/jpeg',
                        });

                        if (navigator.canShare({ files: [file] })) {
                          await navigator.share({
                            files: [file],
                            title: 'Slow Shutter',
                          });
                        }
                      } catch (error: any) {
                        if (error.name !== 'AbortError') {
                          console.error('Share failed:', error);
                        }
                      }
                    }
                  }}
                  className="px-4 py-3 text-sm font-medium bg-white text-black
                             rounded-lg transition-all active:scale-[0.98]"
                >
                  Share
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 text-sm font-medium text-white/40
                             border border-white/10 rounded-lg transition-all
                             active:bg-white/5 active:scale-[0.98]"
                >
                  New
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Crop Modal */}
      {showCropModal && processedCanvas && (
        <CropModal
          image={processedCanvas}
          onClose={() => setShowCropModal(false)}
          onApply={handleCropApply}
        />
      )}

      {/* Error Dialog */}
      <Dialog open={!!error} onOpenChange={() => setError(null)}>
        <DialogContent className="bg-[#080808] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Error</DialogTitle>
            <DialogDescription className="text-white/60">{error}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
