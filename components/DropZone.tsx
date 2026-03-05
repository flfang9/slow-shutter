'use client';

import { useCallback } from 'react';
import { Upload } from 'lucide-react';

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
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-2 border-dashed border-white/10 rounded-2xl
                 bg-white/5 backdrop-blur-xl hover:border-white/30
                 transition-all cursor-pointer"
    >
      <label className="flex flex-col items-center justify-center min-h-[400px] p-8 cursor-pointer">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <Upload className="w-8 h-8 text-white/60" />
        </div>
        <h2 className="text-lg font-light tracking-wide text-white/80 mb-2">
          Drop Image Here
        </h2>
        <p className="text-sm text-white/50 text-center mb-6">
          or tap to browse
        </p>
        <p className="text-xs text-white/30 font-mono">JPEG • Max 4000px</p>
        <input
          type="file"
          accept=".jpg,.jpeg,image/jpeg"
          onChange={handleFileInput}
          className="hidden"
        />
      </label>
    </div>
  );
}
