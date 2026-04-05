'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MoveRight, Maximize, Wind, RotateCw, Sparkles, Zap, Film, Crop, Circle, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { EffectType } from '@/types';
import { DropZone } from '@/components/DropZone';
import { EffectSelector } from '@/components/EffectSelector';
import { LensDial } from '@/components/LensDial';
// ImagePreview not used
import { ExportControls } from '@/components/ExportControls';
import { LoadingState } from '@/components/LoadingState';
import { GridBackground } from '@/components/GridBackground';
import { CropModal } from '@/components/CropModal';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { GalleryCarousel } from '@/components/GalleryCarousel';
import { WaitlistForm } from '@/components/WaitlistForm';
import {
  validateImageFile,
  loadImage,
  scaleImageIfNeeded,
} from '@/lib/image-utils';
import { EffectProcessor } from '@/lib/webgl/processor';
// Dialog removed - using simple div instead

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<EffectType>('cinematic-swirl');
  const [intensity, setIntensity] = useState(75);
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
  const [showSwirlIndicator, setShowSwirlIndicator] = useState(false);
  const [swirlIndicatorPos, setSwirlIndicatorPos] = useState({ x: 0, y: 0 }); // Screen position for crosshair
  const [userExpandedDock, setUserExpandedDock] = useState(false);
  const [enhanceEnabled, setEnhanceEnabled] = useState(false);
  const [waitlistMinimized, setWaitlistMinimized] = useState(false);
  const swirlIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processorRef = useRef<EffectProcessor | null>(null);
  const previewProcessorRef = useRef<EffectProcessor | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intensityRef = useRef(intensity);
  const effectRef = useRef(selectedEffect);
  const rafRef = useRef<number | null>(null);
  const isPreviewingRef = useRef(false);
  const activeTouchListenersRef = useRef<Array<() => void>>([]);
  const prevIntensityRef = useRef(intensity);
  const waitlistTouchCleanupRef = useRef<(() => void) | null>(null);
  const waitlistTouchMovedRef = useRef(false);

  // Clean up active touch listeners on unmount
  useEffect(() => {
    return () => {
      activeTouchListenersRef.current.forEach(cleanup => cleanup());
      activeTouchListenersRef.current = [];
    };
  }, []);

  useEffect(() => {
    return () => {
      waitlistTouchCleanupRef.current?.();
      waitlistTouchCleanupRef.current = null;
    };
  }, []);

  // Keep refs in sync
  useEffect(() => { intensityRef.current = intensity; }, [intensity]);
  useEffect(() => { effectRef.current = selectedEffect; }, [selectedEffect]);

  // Track previous intensity for any future use
  useEffect(() => {
    prevIntensityRef.current = intensity;
  }, [intensity]);

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

      // Smaller preview on mobile for faster processing
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const MAX_PREVIEW_SIZE = isMobile ? 720 : 1000;
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

  const enhanceEnabledRef = useRef(enhanceEnabled);
  useEffect(() => { enhanceEnabledRef.current = enhanceEnabled; }, [enhanceEnabled]);

  const processPreviewImmediate = useCallback(async (effectOverride?: EffectType, intensityOverride?: number, swirlCenterOverride?: { x: number; y: number }) => {
    if (!previewImage || !previewProcessorRef.current) return;
    // Skip if already processing, but don't block forever
    if (isPreviewingRef.current) {
      // Schedule a retry
      requestAnimationFrame(() => processPreviewImmediate(effectOverride, intensityOverride, swirlCenterOverride));
      return;
    }
    isPreviewingRef.current = true;
    try {
      const result = await previewProcessorRef.current.applyEffect(
        previewImage,
        effectOverride ?? effectRef.current,
        intensityOverride ?? intensityRef.current,
        {
          swirlCenter: swirlCenterOverride ?? swirlCenter,
          enhance: enhanceEnabledRef.current,
          enhanceIntensity: 0.7
        }
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

  const processFullQuality = useCallback(async (effectOverride?: EffectType, intensityOverride?: number, swirlCenterOverride?: { x: number; y: number }) => {
    if (!uploadedImage || !processorRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await processorRef.current.applyEffect(
        uploadedImage,
        effectOverride ?? effectRef.current,
        intensityOverride ?? intensityRef.current,
        {
          swirlCenter: swirlCenterOverride ?? swirlCenter,
          enhance: enhanceEnabledRef.current,
          enhanceIntensity: 0.7
        }
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

  // Auto-minimize dock for swirl effect on mobile to allow tapping center of image
  useEffect(() => {
    if (selectedEffect === 'cinematic-swirl' && uploadedImage && !userExpandedDock) {
      setDockMinimized(true);
    } else if (selectedEffect !== 'cinematic-swirl') {
      // Reset preference when switching away from swirl
      setUserExpandedDock(false);
      setDockMinimized(false);
    }
  }, [selectedEffect, uploadedImage, userExpandedDock]);

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

  // Re-process when enhance toggle changes
  useEffect(() => {
    if (!previewImage || !uploadedImage) return;
    processPreviewImmediate(selectedEffect, intensity);
    const timeout = setTimeout(() => processFullQuality(selectedEffect, intensity), 100);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhanceEnabled]);

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
      const newSwirlCenter = { x: clampedX, y: 1.0 - clampedY };
      setSwirlCenter(newSwirlCenter);

      // Store screen position for crosshair display (relative to viewport)
      setSwirlIndicatorPos({ x: clientX, y: clientY });

      // Show indicator briefly
      setShowSwirlIndicator(true);
      if (swirlIndicatorTimeoutRef.current) {
        clearTimeout(swirlIndicatorTimeoutRef.current);
      }
      swirlIndicatorTimeoutRef.current = setTimeout(() => {
        setShowSwirlIndicator(false);
      }, 800);

      // Re-process immediately with new center for instant feedback
      processPreviewImmediate(selectedEffect, intensity, newSwirlCenter);
      processFullQuality(selectedEffect, intensity, newSwirlCenter);
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
    setIntensity(75);
    setError(null);
    setDockMinimized(false);
    setUserExpandedDock(false);
    setEnhanceEnabled(false);
  };

  const sliderBarRef = useRef<HTMLDivElement>(null);
  const sliderTextRef = useRef<HTMLSpanElement>(null);
  const sliderRafRef = useRef<number | null>(null);

  const handleSliderDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSlider(true);
    setDragStartX(e.clientX);
    setDragStartIntensity(intensity);
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSliderDragMove = (e: React.PointerEvent) => {
    if (!isDraggingSlider) return;
    e.preventDefault();

    const deltaX = e.clientX - dragStartX;
    const percentChange = (deltaX / window.innerWidth) * 100;
    const newIntensity = Math.max(0, Math.min(100, Math.round(dragStartIntensity + percentChange)));

    // Direct DOM update for instant visual feedback (always)
    if (sliderBarRef.current) {
      sliderBarRef.current.style.width = `${newIntensity}%`;
    }
    if (sliderTextRef.current) {
      sliderTextRef.current.textContent = `${newIntensity}%`;
    }

    // Throttle state updates with separate RAF
    if (sliderRafRef.current) {
      cancelAnimationFrame(sliderRafRef.current);
    }
    sliderRafRef.current = requestAnimationFrame(() => {
      sliderRafRef.current = null;
      setIntensity(newIntensity);
    });
  };

  const handleSliderDragEnd = (e: React.PointerEvent) => {
    if (sliderRafRef.current) {
      cancelAnimationFrame(sliderRafRef.current);
      sliderRafRef.current = null;
    }
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    // Get final value from DOM
    const finalValue = sliderBarRef.current
      ? parseInt(sliderBarRef.current.style.width) || intensity
      : intensity;
    setIntensity(finalValue);
    setIsDraggingSlider(false);
  };

  const handleCropApply = (croppedCanvas: HTMLCanvasElement) => {
    setProcessedCanvas(croppedCanvas);
    setShowCropModal(false);
  };

  const toggleWaitlistCard = useCallback((minimized?: boolean) => {
    setWaitlistMinimized((current) => minimized ?? !current);
  }, []);

  const handleWaitlistTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const startY = e.touches[0].clientY;
    waitlistTouchMovedRef.current = false;

    waitlistTouchCleanupRef.current?.();

    const handleMove = (moveEvent: TouchEvent) => {
      const deltaY = moveEvent.touches[0].clientY - startY;
      if (deltaY > 50) {
        waitlistTouchMovedRef.current = true;
        setWaitlistMinimized(true);
      } else if (deltaY < -50) {
        waitlistTouchMovedRef.current = true;
        setWaitlistMinimized(false);
      }
    };

    const handleEnd = () => {
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
      if (waitlistTouchCleanupRef.current === handleEnd) {
        waitlistTouchCleanupRef.current = null;
      }
    };

    waitlistTouchCleanupRef.current = handleEnd;
    document.addEventListener('touchmove', handleMove, { passive: true });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);
  }, []);

  return (
    <>
      {/* Desktop Layout - ZERO SHIFT */}
      <div className="hidden md:flex h-screen overflow-hidden max-h-screen">
        {/* Image Container - LEFT 70% */}
        <div className="w-[70%] h-screen overflow-hidden flex items-center justify-center bg-[#050505] relative perspective-[1000px]">
          {/* 3D Rotating Card Carousel */}
          {!uploadedImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-[800px] h-[500px] animate-carousel-spin" style={{ transformStyle: 'preserve-3d' }}>
                {[
                  '/demo-images/tokyo-after.jpg',
                  '/demo-images/carousel-arch.jpg',
                  '/demo-images/carousel-portrait.jpg',
                  '/demo-images/carousel-tokyo-street.jpg',
                  '/demo-images/carousel-bulls.jpg',
                  '/demo-images/carousel-reflection.jpg',
                  '/demo-images/carousel-tokyo-night.jpg',
                  '/demo-images/carousel-lantern-swirl.jpg',
                  '/demo-images/carousel-concert.jpg',
                  '/demo-images/carousel-times-square.jpg',
                ].map((src, i) => {
                  const angle = (i * 360) / 10;
                  return (
                    <div
                      key={src}
                      className="absolute left-1/2 top-1/2 w-72 h-96 -ml-36 -mt-48 rounded-2xl overflow-hidden shadow-2xl"
                      style={{
                        transform: `rotateY(${angle}deg) translateZ(420px)`,
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-cover opacity-50"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!uploadedImage && (
            <div className="max-w-md w-full px-8 relative z-10">
              <DropZone onFileSelect={handleFileSelect} />
            </div>
          )}
          {uploadedImage && (
            <>
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                  <LoadingState />
                </div>
              )}
              <div className="w-full h-full p-8 flex items-center justify-center relative">
                {uploadedImage.src && (
                  <>
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
                      onError={(e) => {
                        console.error('Image failed to load:', {
                          showingBefore,
                          uploadedImageSrc: uploadedImage.src?.substring(0, 50),
                          hasProcessedCanvas: !!processedCanvas
                        });
                      }}
                    />
                    {/* Swirl center indicator - minimal crosshair, fades after tap */}
                    {selectedEffect === 'cinematic-swirl' && !showingBefore && showSwirlIndicator && (
                      <div
                        className="fixed pointer-events-none animate-in fade-in duration-100 z-20"
                        style={{
                          left: swirlIndicatorPos.x,
                          top: swirlIndicatorPos.y,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        {/* Minimal crosshair */}
                        <div className="relative w-6 h-6">
                          <div className="absolute left-1/2 top-0 w-px h-full bg-white/50 -translate-x-1/2" />
                          <div className="absolute top-1/2 left-0 h-px w-full bg-white/50 -translate-y-1/2" />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar - RIGHT 30% */}
        <div className="w-[30%] h-screen bg-[#080808] border-l border-white/10 flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Blurrr" className="w-8 h-8 rounded-lg" />
              <h1 className="text-sm font-light tracking-[0.2em] text-white/80 uppercase">
                Blurrr
              </h1>
            </div>
          </div>

          {/* Manifesto (Empty State) */}
          {!uploadedImage && (
            <div className="flex-1 p-8 flex flex-col justify-center">
              <h2 className="text-2xl font-light text-white/90 mb-4 leading-tight">
                Motion in Every Frame
              </h2>
              <p className="text-sm text-white/60 leading-relaxed mb-6">
                Transform static photos into dynamic visual stories.
                Professional motion blur and cinematic effects that bring
                your images to life.
              </p>
              <div className="space-y-3 text-xs text-white/40 font-mono">
                <div>→ Motion Blur</div>
                <div>→ Zoom Pull</div>
                <div>→ Handheld Drift</div>
                <div>→ Cinematic Swirl</div>
                <div>→ Soft Glow</div>
                <div>→ Film Grade</div>
                <div>→ Vortex</div>
              </div>

              {/* Blurrr iOS Waitlist - Prominent Card */}
              <div className="mt-8 p-6 bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-2xl border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <img src="/logo.jpg" alt="Blurrr" className="w-10 h-10 rounded-xl" />
                  <div>
                    <h3 className="text-base font-semibold text-white">Blurrr for iOS</h3>
                    <p className="text-xs text-white/50">Coming soon to the App Store</p>
                  </div>
                </div>
                <WaitlistForm />
              </div>

              {/* Made by footer */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-white/30">Made by Freddy Fang</span>
                  <div className="flex gap-3">
                    <a
                      href="https://www.instagram.com/irlfreddyfang/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/30 hover:text-white/60 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                    <a
                      href="https://x.com/freddyfvng"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/30 hover:text-white/60 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>
                  </div>
                </div>
                {/* Legal Links */}
                <div className="flex gap-4 mt-3">
                  <a href="/privacy" className="text-xs text-white/20 hover:text-white/40 transition-colors">Privacy</a>
                  <a href="/terms" className="text-xs text-white/20 hover:text-white/40 transition-colors">Terms</a>
                  <a href="/support" className="text-xs text-white/20 hover:text-white/40 transition-colors">Support</a>
                </div>
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

              <LensDial value={intensity} onChange={setIntensity} effect={selectedEffect} />

              {/* Enhance Toggle */}
              <div className="pt-4">
                <button
                  onClick={() => setEnhanceEnabled(!enhanceEnabled)}
                  className={`w-full px-4 py-3 text-sm font-medium rounded-lg border transition-all flex items-center justify-center gap-2 ${
                    enhanceEnabled
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                      : 'bg-transparent text-white/70 border-white/20 hover:border-white/40'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${enhanceEnabled ? 'fill-amber-400' : ''}`} />
                  Enhance {enhanceEnabled ? 'On' : 'Off'}
                </button>
              </div>

              {/* Compare Button */}
              <div className="pt-2">
                <button
                  onClick={() => setShowingBefore(!showingBefore)}
                  className={`w-full px-4 py-3 text-sm font-medium rounded-lg border transition-all ${
                    showingBefore
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-white/70 border-white/20 hover:border-white/40'
                  }`}
                >
                  {showingBefore ? 'Show Effect' : 'Show Original'}
                </button>
              </div>

              {/* Crop Button */}
              <div className="pt-2">
                <button
                  onClick={() => setShowCropModal(true)}
                  className="w-full px-4 py-3 text-sm font-medium rounded-lg border transition-all flex items-center justify-center gap-2 bg-transparent text-white/70 border-white/20 hover:border-white/40"
                >
                  <Crop className="w-4 h-4" />
                  Crop
                </button>
              </div>

              <div className="pt-6 border-t border-white/10">
                <ExportControls canvas={processedCanvas} originalImage={uploadedImage} onReset={handleReset} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout - Instagram-Style Dock */}
      <div className="block md:hidden h-[100dvh] overflow-hidden bg-black relative overscroll-none">
        {/* Grid Background (Empty State) - Full Screen Fixed */}
        {!uploadedImage && (
          <div className="fixed inset-0 z-0">
            <GridBackground />
          </div>
        )}

        {/* Dropzone + Example - Scrollable */}
        {!uploadedImage && (
          <div className="relative z-10 h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-y-contain">
            <div className="min-h-[100dvh] flex flex-col items-center justify-start pt-16 pb-24 px-4">
              {/* Upload Box */}
              <div className="mb-6">
                <DropZone onFileSelect={handleFileSelect} />
              </div>

              {/* Blurrr iOS Waitlist - mobile (prominent card) */}
              <div className="w-full max-w-sm mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] overflow-hidden">
                <div
                  className="px-5 pt-3 pb-4 cursor-pointer select-none"
                  onClick={() => {
                    if (waitlistTouchMovedRef.current) {
                      waitlistTouchMovedRef.current = false;
                      return;
                    }
                    toggleWaitlistCard();
                  }}
                >
                  <div
                    className="mb-3 flex justify-center touch-pan-y"
                    onTouchStart={handleWaitlistTouchStart}
                  >
                    <div className="h-1 w-10 rounded-full bg-white/20" />
                  </div>
                  <div className="flex items-center gap-3">
                    <img src="/logo.jpg" alt="Blurrr" className="w-12 h-12 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Blurrr for iOS</h3>
                          <p className="text-xs text-white/50">
                            {waitlistMinimized ? 'Swipe up or tap to open' : 'Swipe down to tuck this away'}
                          </p>
                        </div>
                        {waitlistMinimized ? (
                          <ChevronUp className="h-5 w-5 flex-shrink-0 text-white/50" />
                        ) : (
                          <ChevronDown className="h-5 w-5 flex-shrink-0 text-white/50" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    waitlistMinimized ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5">
                      <WaitlistForm />
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6 w-full max-w-sm">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30 font-medium uppercase tracking-wider">
                  See what&apos;s possible
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Before/After Slider */}
              <div className="w-full max-w-sm mb-8">
                <BeforeAfterSlider
                  beforeImage="/demo-images/osaka-before.jpg"
                  afterImage="/demo-images/osaka-after.jpg"
                />
              </div>

              {/* Gallery Carousel */}
              <div className="w-full max-w-sm mb-8">
                <GalleryCarousel />
              </div>

              {/* Made by footer - mobile */}
              <div className="flex flex-col items-center gap-2 mt-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/25">Made by Freddy Fang</span>
                  <div className="flex gap-3">
                    <a
                      href="https://www.instagram.com/irlfreddyfang/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/25 hover:text-white/50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                    <a
                      href="https://x.com/freddyfvng"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/25 hover:text-white/50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>
                  </div>
                </div>
                {/* Legal Links */}
                <div className="flex gap-4">
                  <a href="/privacy" className="text-xs text-white/20 hover:text-white/40 transition-colors">Privacy</a>
                  <a href="/terms" className="text-xs text-white/20 hover:text-white/40 transition-colors">Terms</a>
                  <a href="/support" className="text-xs text-white/20 hover:text-white/40 transition-colors">Support</a>
                </div>
              </div>

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
                  objectPosition: selectedEffect === 'cinematic-swirl' && dockMinimized
                    ? 'center 40%'
                    : 'center 35%',
                }}
                onTouchEnd={(e) => {
                  e.preventDefault(); // Prevent synthetic click event (fixes double-tap bug)
                  handleImageClick(e);
                }}
                onPointerDown={handleCompareStart}
                onPointerUp={handleCompareEnd}
                onPointerLeave={handleCompareEnd}
                onContextMenu={(e) => e.preventDefault()}
              />
              {/* Mobile: Swirl center indicator - minimal crosshair, fades after tap */}
              {selectedEffect === 'cinematic-swirl' && !showingBefore && showSwirlIndicator && (
                <div
                  className="fixed pointer-events-none animate-in fade-in duration-100 z-20"
                  style={{
                    left: swirlIndicatorPos.x,
                    top: swirlIndicatorPos.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Minimal crosshair */}
                  <div className="relative w-8 h-8">
                    <div className="absolute left-1/2 top-0 w-px h-full bg-white/60 -translate-x-1/2" />
                    <div className="absolute top-1/2 left-0 h-px w-full bg-white/60 -translate-y-1/2" />
                  </div>
                </div>
              )}
              {/* Mobile: Swirl tap hint when dock minimized */}
              {selectedEffect === 'cinematic-swirl' && dockMinimized && !showSwirlIndicator && (
                <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none animate-in fade-in duration-300">
                  <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
                    Tap to set swirl center
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Collapsible HUD - fades when adjusting slider for full photo visibility */}
        {uploadedImage && (
          <div
            className={`fixed bottom-0 left-0 right-0 z-10 transition-all duration-100 ${
              dockMinimized ? 'translate-y-[calc(100%-80px)]' : 'translate-y-0'
            }`}
            style={{
              background: isDraggingSlider ? 'transparent' : 'rgba(0, 0, 0, 0.6)',
              borderTop: isDraggingSlider ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: isDraggingSlider ? 'none' : 'blur(40px)',
              WebkitBackdropFilter: isDraggingSlider ? 'none' : 'blur(40px)',
            }}
          >
            {/* Swipe Handle - hidden when dragging slider */}
            <div
              className="flex justify-center py-3 cursor-pointer touch-none transition-opacity duration-100"
              style={{ opacity: isDraggingSlider ? 0 : 1, pointerEvents: isDraggingSlider ? 'none' : 'auto' }}

              onTouchStart={(e) => {
                const startY = e.touches[0].clientY;
                const handleMove = (moveEvent: TouchEvent) => {
                  const deltaY = moveEvent.touches[0].clientY - startY;
                  if (deltaY > 80) {
                    setDockMinimized(true);
                    setUserExpandedDock(false);
                  } else if (deltaY < -80) {
                    setDockMinimized(false);
                    setUserExpandedDock(true);
                  }
                };
                const handleEnd = () => {
                  document.removeEventListener('touchmove', handleMove);
                  document.removeEventListener('touchend', handleEnd);
                  // Remove from active listeners
                  const index = activeTouchListenersRef.current.indexOf(handleEnd);
                  if (index > -1) activeTouchListenersRef.current.splice(index, 1);
                };
                document.addEventListener('touchmove', handleMove);
                document.addEventListener('touchend', handleEnd);
                // Track cleanup function for unmount
                activeTouchListenersRef.current.push(handleEnd);
              }}
              onClick={() => {
                const newMinimized = !dockMinimized;
                setDockMinimized(newMinimized);
                setUserExpandedDock(!newMinimized);
              }}
            >
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>

            {!dockMinimized && (
              <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
                {/* Row 1: Effect Icons - hides when adjusting slider */}
                <div
                  className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1 transition-opacity duration-100"
                  style={{
                    opacity: isDraggingSlider ? 0 : 1,
                    pointerEvents: isDraggingSlider ? 'none' : 'auto'
                  }}
                >
                  {[
                    { id: 'lateral-motion', icon: MoveRight, label: 'Motion' },
                    { id: 'vertical-zoom', icon: Maximize, label: 'Zoom' },
                    { id: 'handheld-drift', icon: Wind, label: 'Drift' },
                    { id: 'cinematic-swirl', icon: RotateCw, label: 'Swirl' },
                    { id: 'soft-light', icon: Sparkles, label: 'Glow' },
                    { id: 'film-grain', icon: Film, label: 'Film' },
                    { id: 'vortex', icon: Loader, label: 'Vortex' },
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

                {/* Row 2: Gesture Slider Area - always visible */}
                <div
                  className="px-2 py-4 outline-none select-none touch-pan-x"
                  style={{ touchAction: 'pan-x' }}
                  onTouchStart={(e) => {
                    // Don't prevent default on start - let the gesture begin
                    const touch = e.touches[0];
                    setIsDraggingSlider(true);
                    setDragStartX(touch.clientX);
                    setDragStartIntensity(intensity);
                    if (fadeTimeoutRef.current) {
                      clearTimeout(fadeTimeoutRef.current);
                    }
                  }}
                  onTouchMove={(e) => {
                    if (!isDraggingSlider) return;
                    e.preventDefault(); // Prevent scroll/refresh during drag
                    e.stopPropagation();
                    const touch = e.touches[0];
                    const deltaX = touch.clientX - dragStartX;
                    const percentChange = (deltaX / window.innerWidth) * 100;
                    const newIntensity = Math.max(0, Math.min(100, Math.round(dragStartIntensity + percentChange)));

                    // Direct DOM update
                    if (sliderBarRef.current) {
                      sliderBarRef.current.style.width = `${newIntensity}%`;
                    }
                    if (sliderTextRef.current) {
                      sliderTextRef.current.textContent = `${newIntensity}%`;
                    }

                    // Throttle state updates
                    if (sliderRafRef.current) {
                      cancelAnimationFrame(sliderRafRef.current);
                    }
                    sliderRafRef.current = requestAnimationFrame(() => {
                      sliderRafRef.current = null;
                      setIntensity(newIntensity);
                    });
                  }}
                  onTouchEnd={() => {
                    if (sliderRafRef.current) {
                      cancelAnimationFrame(sliderRafRef.current);
                      sliderRafRef.current = null;
                    }
                    // Get final value from DOM
                    const finalValue = sliderBarRef.current
                      ? parseInt(sliderBarRef.current.style.width) || intensity
                      : intensity;
                    setIntensity(finalValue);
                    setIsDraggingSlider(false);
                  }}
                >
                  <div className="flex justify-center items-center gap-2 mb-2">
                    <span
                      ref={sliderTextRef}
                      className={`tabular-nums transition-all ${
                        isDraggingSlider
                          ? 'text-base text-white font-medium'
                          : 'text-xs text-white/40'
                      }`}
                    >
                      {intensity}%
                    </span>
                    {selectedEffect === 'soft-light' && (
                      <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                        glow
                      </span>
                    )}
                  </div>
                  <div className={`rounded-full relative transition-all ${
                    isDraggingSlider ? 'h-1 bg-white/20' : 'h-0.5 bg-white/10'
                  }`}>
                    <div
                      ref={sliderBarRef}
                      className={`h-full rounded-full ${
                        isDraggingSlider ? '' : 'transition-all'
                      } ${
                        isDraggingSlider
                          ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]'
                          : 'bg-white/60'
                      }`}
                      style={{ width: `${intensity}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Enhance + Compare Buttons - hidden when dragging slider */}
            {!dockMinimized && (
              <div
                className="px-4 pt-4 border-t border-white/10 transition-opacity duration-100 space-y-2"
                style={{ opacity: isDraggingSlider ? 0 : 1, pointerEvents: isDraggingSlider ? 'none' : 'auto' }}
              >
                {/* Enhance Toggle */}
                <button
                  onClick={() => setEnhanceEnabled(!enhanceEnabled)}
                  className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                    enhanceEnabled
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                      : 'bg-white/5 text-white/60 border border-white/10'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${enhanceEnabled ? 'fill-amber-400' : ''}`} />
                  Enhance {enhanceEnabled ? 'On' : 'Off'}
                </button>

                {/* Compare Button */}
                <button
                  onClick={() => setShowingBefore(!showingBefore)}
                  className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    showingBefore
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}
                >
                  {showingBefore ? 'Show Effect' : 'Show Original'}
                </button>
              </div>
            )}

            {/* Crop | Share | New Buttons - hidden when dragging slider */}
            <div
              className={`px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] ${dockMinimized ? '' : 'pt-3'} transition-opacity duration-100`}
              style={{ opacity: isDraggingSlider ? 0 : 1, pointerEvents: isDraggingSlider ? 'none' : 'auto' }}
            >
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

                        const file = new File([blob], `blurrr-${Date.now()}.jpg`, {
                          type: 'image/jpeg',
                        });

                        if (navigator.canShare({ files: [file] })) {
                          await navigator.share({
                            files: [file],
                            title: 'Blurrr',
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

      {/* Error Dialog - simplified */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setError(null)}>
          <div className="bg-[#080808] border border-white/10 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-white font-semibold mb-2">Error</h3>
            <p className="text-white/60 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-4 px-4 py-2 bg-white text-black rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
