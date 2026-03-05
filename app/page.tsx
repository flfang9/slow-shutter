'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EffectType } from '@/types';
import { DropZone } from '@/components/DropZone';
import { EffectSelector } from '@/components/EffectSelector';
import { LensDial } from '@/components/LensDial';
import { CompareButton } from '@/components/CompareButton';
import { ImagePreview } from '@/components/ImagePreview';
import { ExportControls } from '@/components/ExportControls';
import { LoadingState } from '@/components/LoadingState';
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
  const [savedIntensity, setSavedIntensity] = useState(50);
  const [isComparing, setIsComparing] = useState(false);
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processorRef = useRef<EffectProcessor | null>(null);
  const previewProcessorRef = useRef<EffectProcessor | null>(null);

  // Initialize processors
  useEffect(() => {
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    if (!previewCanvasRef.current) previewCanvasRef.current = document.createElement('canvas');

    if (!processorRef.current) {
      try {
        processorRef.current = new EffectProcessor(canvasRef.current);
      } catch (err) {
        setError('Failed to initialize WebGL. Your browser may not support it.');
      }
    }

    if (!previewProcessorRef.current) {
      try {
        previewProcessorRef.current = new EffectProcessor(previewCanvasRef.current);
      } catch (err) {
        console.error('Failed to initialize preview processor');
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

      // Create preview image
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
      setError('Failed to load image. Please try another file.');
      console.error(err);
    }
  }, []);

  const processPreview = useCallback(async () => {
    if (!previewImage || !previewProcessorRef.current || !previewCanvasRef.current) return;

    try {
      const result = await previewProcessorRef.current.applyEffect(
        previewImage,
        selectedEffect,
        intensity
      );
      setProcessedCanvas(result);
    } catch (err) {
      console.error('Preview processing error:', err);
    }
  }, [previewImage, selectedEffect, intensity]);

  const processFullQuality = useCallback(async () => {
    if (!uploadedImage || !processorRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await processorRef.current.applyEffect(uploadedImage, selectedEffect, intensity);
      setProcessedCanvas(result);
    } catch (err) {
      setError('Failed to process image. Please try again.');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImage, selectedEffect, intensity, isProcessing]);

  useEffect(() => {
    if (previewImage) processPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEffect, previewImage]);

  useEffect(() => {
    if (!uploadedImage) return;
    const timeout = setTimeout(processFullQuality, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEffect]);

  useEffect(() => {
    if (!previewImage) return;
    processPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity]);

  useEffect(() => {
    if (!uploadedImage) return;
    const timeout = setTimeout(processFullQuality, 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity]);

  const handleCompareStart = () => {
    setSavedIntensity(intensity);
    setIntensity(0);
    setIsComparing(true);
  };

  const handleCompareEnd = () => {
    setIntensity(savedIntensity);
    setIsComparing(false);
  };

  const handleReset = () => {
    setUploadedImage(null);
    setPreviewImage(null);
    setProcessedCanvas(null);
    setSelectedEffect('cinematic-swirl');
    setIntensity(50);
    setError(null);
  };

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex h-screen overflow-hidden">
        {/* Canvas - 70% */}
        <div className="w-[70%] relative bg-black flex items-center justify-center">
          {!uploadedImage && (
            <div className="max-w-md w-full px-8">
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
              <ImagePreview canvas={processedCanvas} />
            </>
          )}
        </div>

        {/* Utility Sidebar - 30% */}
        <div className="w-[30%] bg-[#080808] border-l border-white/10 flex flex-col overflow-y-auto">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <h1 className="text-sm font-light tracking-[0.2em] text-white/80 uppercase">
              Slow Shutter
            </h1>
          </div>

          {uploadedImage && (
            <div className="flex-1 p-6 space-y-6">
              {/* Effects */}
              <div className="space-y-3">
                <label className="text-xs font-medium tracking-wider text-white/50 uppercase">
                  Effect
                </label>
                <EffectSelector
                  selectedEffect={selectedEffect}
                  onEffectSelect={setSelectedEffect}
                />
              </div>

              {/* Intensity */}
              <div className="space-y-3">
                <LensDial value={intensity} onChange={setIntensity} />
              </div>

              {/* Compare */}
              <CompareButton
                onCompareStart={handleCompareStart}
                onCompareEnd={handleCompareEnd}
              />

              {/* Export */}
              <div className="pt-6 border-t border-white/10">
                <ExportControls canvas={processedCanvas} onReset={handleReset} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden min-h-screen bg-black flex flex-col">
        {/* Fixed Image Viewport */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
          {!uploadedImage && (
            <div className="max-w-md w-full px-4">
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
              <ImagePreview canvas={processedCanvas} />
            </>
          )}
        </div>

        {/* Floating Control Tray */}
        <AnimatePresence>
          {uploadedImage && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-[#080808]/95 backdrop-blur-xl
                         border-t border-white/10 rounded-t-3xl p-6 pb-8 space-y-6"
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-2" />

              <EffectSelector
                selectedEffect={selectedEffect}
                onEffectSelect={setSelectedEffect}
              />

              <LensDial value={intensity} onChange={setIntensity} />

              <div className="grid grid-cols-2 gap-3">
                <CompareButton
                  onCompareStart={handleCompareStart}
                  onCompareEnd={handleCompareEnd}
                />
                <button
                  onClick={handleReset}
                  className="px-4 py-3 text-sm font-medium bg-white/5 hover:bg-white/10
                             border border-white/10 rounded-lg backdrop-blur-xl transition-all"
                >
                  New
                </button>
              </div>

              <ExportControls canvas={processedCanvas} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
