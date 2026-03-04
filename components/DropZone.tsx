'use client';

import { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { Card } from './ui/card';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
}

export function DropZone({ onFileSelect }: DropZoneProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  return (
    <Card
      className="border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <label className="flex flex-col items-center justify-center min-h-[400px] p-8 cursor-pointer">
        <Upload className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Upload Photo</h2>
        <p className="text-muted-foreground text-center mb-6">
          Drag & drop or tap to select
        </p>
        <p className="text-sm text-muted-foreground">JPEG only • Max 4000px</p>
        <input
          type="file"
          accept=".jpg,.jpeg,image/jpeg"
          onChange={handleFileInput}
          className="hidden"
        />
      </label>
    </Card>
  );
}
