'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { EffectType } from '@/types';
import { DropZone } from '@/components/DropZone';
import { EffectSelector } from '@/components/EffectSelector';
import { AdvancedControls } from '@/components/AdvancedControls';
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
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(
    null
  );
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(
    null
  ); // Scaled-down version for fast preview
  const [selectedEffect, setSelectedEffect] =
    useState<EffectType>('lateral-motion');
  const [intensity, setIntensity] = useState(50);
  const [processedCanvas, setProcessedCanvas] =
    useState<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processorRef = useRef<EffectProcessor | null>(null);
  const previewProcessorRef = useRef<EffectProcessor | null>(null);

  // Initialize canvas and processors (full-res and preview)
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    if (!previewCanvasRef.current) {
      previewCanvasRef.current = document.createElement('canvas');
    }

    if (!processorRef.current) {
      try {
        processorRef.current = new EffectProcessor(canvasRef.current);
      } catch (err) {
        setError(
          'Failed to initialize WebGL. Your browser may not support it.'
        );
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
      if (processorRef.current) {
        processorRef.current.dispose();
        processorRef.current = null;
      }
      if (previewProcessorRef.current) {
        previewProcessorRef.current.dispose();
        previewProcessorRef.current = null;
      }
    };
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      // Load image
      const img = await loadImage(file);

      // Scale if needed
      const scaledImg = scaleImageIfNeeded(img);

      // Convert canvas to image if needed
      let finalImg: HTMLImageElement;
      if (scaledImg instanceof HTMLCanvasElement) {
        finalImg = new Image();
        finalImg.src = scaledImg.toDataURL();
        await new Promise((resolve) => {
          finalImg.onload = resolve;
        });
      } else {
        finalImg = scaledImg;
      }

      // Create a lower-resolution preview image for real-time updates
      const MAX_PREVIEW_SIZE = 1000;
      const scale = Math.min(
        1,
        MAX_PREVIEW_SIZE / Math.max(finalImg.width, finalImg.height)
      );

      if (scale < 1) {
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = Math.floor(finalImg.width * scale);
        previewCanvas.height = Math.floor(finalImg.height * scale);
        const ctx = previewCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            finalImg,
            0,
            0,
            previewCanvas.width,
            previewCanvas.height
          );
          const previewImg = new Image();
          previewImg.src = previewCanvas.toDataURL();
          await new Promise((resolve) => {
            previewImg.onload = resolve;
          });
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

  // Quick preview processing (low-res, instant)
  const processPreview = useCallback(async () => {
    if (
      !previewImage ||
      !previewProcessorRef.current ||
      !previewCanvasRef.current
    ) {
      return;
    }

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

  // Full quality processing (high-res, for final result)
  const processFullQuality = useCallback(async () => {
    if (
      !uploadedImage ||
      !processorRef.current ||
      !canvasRef.current ||
      isProcessing
    ) {
      return;
    }

    console.log('Starting full quality processing:', { effect: selectedEffect, intensity });
    setIsProcessing(true);

    try {
      const result = await processorRef.current.applyEffect(
        uploadedImage,
        selectedEffect,
        intensity
      );
      console.log('Full quality processing complete');
      setProcessedCanvas(result);
    } catch (err) {
      setError('Failed to process image. Please try again.');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImage, selectedEffect, intensity, isProcessing]);

  // Immediate preview when effect changes
  useEffect(() => {
    if (previewImage) {
      processPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEffect, previewImage]);

  // Full quality render after effect changes
  useEffect(() => {
    if (!uploadedImage) return;

    const timeout = setTimeout(() => {
      processFullQuality();
    }, 500);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEffect]);

  // Real-time preview on intensity change (instant)
  useEffect(() => {
    if (!previewImage) return;
    processPreview(); // Instant preview
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity]);

  // Full quality render after intensity stops changing
  useEffect(() => {
    if (!uploadedImage) return;

    const timeout = setTimeout(() => {
      processFullQuality();
    }, 800); // Render full quality after user stops adjusting

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity]);

  const handleReset = useCallback(() => {
    setUploadedImage(null);
    setProcessedCanvas(null);
    setSelectedEffect('lateral-motion');
    setIntensity(50);
    setError(null);
  }, []);

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Slow <span className="text-primary">Shutter</span>
          </h1>
          <p className="text-muted-foreground">
            Apply cinematic slow-shutter blur effects to your photos
          </p>
        </div>

        {/* Upload Step */}
        {!uploadedImage && <DropZone onFileSelect={handleFileSelect} />}

        {/* Processing Flow */}
        {uploadedImage && (
          <div className="space-y-6">
            {/* Effect Selection */}
            <EffectSelector
              selectedEffect={selectedEffect}
              onEffectSelect={setSelectedEffect}
            />

            {/* Advanced Controls */}
            <AdvancedControls
              intensity={intensity}
              onIntensityChange={setIntensity}
            />

            {/* Loading State */}
            {isProcessing && <LoadingState />}

            {/* Result */}
            {!isProcessing && processedCanvas && (
              <>
                <ImagePreview canvas={processedCanvas} />
                <ExportControls canvas={processedCanvas} onReset={handleReset} />
              </>
            )}
          </div>
        )}

        {/* Error Dialog */}
        <Dialog open={!!error} onOpenChange={() => setError(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Error</DialogTitle>
              <DialogDescription>{error}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
