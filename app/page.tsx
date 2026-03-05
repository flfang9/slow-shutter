'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EffectType } from '@/types';
import { DropZone } from '@/components/DropZone';
import { EffectSelector } from '@/components/EffectSelector';
import { LensDial } from '@/components/LensDial';
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
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processorRef = useRef<EffectProcessor | null>(null);
  const previewProcessorRef = useRef<EffectProcessor | null>(null);

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
      setError('Failed to load image');
      console.error(err);
    }
  }, []);

  const processPreview = useCallback(async () => {
    if (!previewImage || !previewProcessorRef.current) return;
    try {
      const result = await previewProcessorRef.current.applyEffect(
        previewImage,
        selectedEffect,
        intensity
      );
      setProcessedCanvas(result);
    } catch (err) {
      console.error('Preview error:', err);
    }
  }, [previewImage, selectedEffect, intensity]);

  const processFullQuality = useCallback(async () => {
    if (!uploadedImage || !processorRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await processorRef.current.applyEffect(uploadedImage, selectedEffect, intensity);
      setProcessedCanvas(result);
    } catch (err) {
      setError('Processing failed');
      console.error(err);
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
  };

  const handleCompareEnd = () => {
    setIntensity(savedIntensity);
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
      {/* Desktop Layout - ZERO SCROLL */}
      <div className="hidden md:flex h-screen overflow-hidden">
        {/* Canvas - 70%, max-height 100vh */}
        <div className="w-[70%] h-screen max-h-screen overflow-hidden relative bg-black flex items-center justify-center">
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
              <ImagePreview
                canvas={processedCanvas}
                onPointerDown={handleCompareStart}
                onPointerUp={handleCompareEnd}
              />
            </>
          )}
        </div>

        {/* Sidebar - 30% with border-l */}
        <div className="w-[30%] h-screen bg-[#080808] border-l border-white/10 flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-sm font-light tracking-[0.2em] text-white/80 uppercase">
              Slow Shutter
            </h1>
          </div>

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
                <ExportControls canvas={processedCanvas} onReset={handleReset} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout - Fixed image, glass tray */}
      <div className="md:hidden h-screen overflow-hidden bg-black relative">
        {/* Fixed Full-Screen Image */}
        <div className="fixed inset-0 flex items-center justify-center">
          {!uploadedImage && (
            <div className="max-w-sm w-full px-4">
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
              <ImagePreview
                canvas={processedCanvas}
                onPointerDown={handleCompareStart}
                onPointerUp={handleCompareEnd}
              />
            </>
          )}
        </div>

        {/* Glass Control Tray */}
        <AnimatePresence>
          {uploadedImage && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-2xl
                         border-t border-white/10 rounded-t-3xl safe-area-pb"
            >
              <div className="p-6 space-y-4">
                {/* Handle */}
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-2" />

                {/* Effects (horizontal scroll) */}
                <EffectSelector
                  selectedEffect={selectedEffect}
                  onEffectSelect={setSelectedEffect}
                />

                {/* Slider */}
                <LensDial value={intensity} onChange={setIntensity} />

                {/* Actions - Save pinned to bottom */}
                <div className="pt-2">
                  <ExportControls canvas={processedCanvas} onReset={handleReset} />
                </div>
              </div>
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
