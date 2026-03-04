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
  const [selectedEffect, setSelectedEffect] =
    useState<EffectType>('lateral-motion');
  const [intensity, setIntensity] = useState(50);
  const [processedCanvas, setProcessedCanvas] =
    useState<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const processorRef = useRef<EffectProcessor | null>(null);

  // Initialize canvas and processor
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
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

    return () => {
      if (processorRef.current) {
        processorRef.current.dispose();
        processorRef.current = null;
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

      setUploadedImage(finalImg);
    } catch (err) {
      setError('Failed to load image. Please try another file.');
      console.error(err);
    }
  }, []);

  const processImage = useCallback(async () => {
    if (
      !uploadedImage ||
      !processorRef.current ||
      !canvasRef.current
    ) {
      console.log('Skipping process:', { uploadedImage: !!uploadedImage, processor: !!processorRef.current, canvas: !!canvasRef.current });
      return;
    }

    console.log('Starting processing:', { effect: selectedEffect, intensity });
    setIsProcessing(true);
    try {
      const result = await processorRef.current.applyEffect(
        uploadedImage,
        selectedEffect,
        intensity
      );
      console.log('Processing complete, canvas:', result);
      setProcessedCanvas(result);
    } catch (err) {
      setError('Failed to process image. Please try again.');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImage, selectedEffect, intensity]);

  // Auto-process when effect or image changes
  useEffect(() => {
    if (uploadedImage && !isProcessing) {
      processImage();
    }
  }, [uploadedImage, selectedEffect, processImage, isProcessing]);

  // Debounced intensity change
  useEffect(() => {
    if (!uploadedImage || isProcessing) return;

    const timeout = setTimeout(() => {
      processImage();
    }, 150); // Debounce for smooth slider

    return () => clearTimeout(timeout);
  }, [intensity, uploadedImage, isProcessing, processImage]);

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
