'use client';

import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
}

export function DropZone({ onFileSelect }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
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
      onDragLeave={handleDragLeave}
      className={`
        relative rounded-2xl border border-white/10
        bg-black/30 transition-all duration-300 cursor-pointer
        w-64 h-64 md:w-auto md:h-auto
        ${isDragging ? 'bg-black/50 border-white/30' : ''}
      `}
      style={{
        backdropFilter: 'blur(16px) saturate(150%)',
        WebkitBackdropFilter: 'blur(16px) saturate(150%)',
      }}
    >
      <label className="flex flex-col items-center justify-center h-full md:min-h-[400px] p-8 cursor-pointer">
        {/* Minimalist Upload Icon */}
        <Upload className="w-10 h-10 text-white/60 mb-4 md:mb-6" strokeWidth={1.5} />

        {/* Instruction Text */}
        <h2 className="text-sm font-light tracking-wide text-white/60 mb-3 md:mb-4">
          <span className="md:hidden">Tap to Start</span>
          <span className="hidden md:inline">Drop Image Here</span>
        </h2>

        {/* Pills */}
        <div className="flex gap-2">
          <span className="px-2 py-1 text-[10px] font-medium text-white/40
                          bg-white/5 border border-white/10 rounded-full uppercase tracking-wider">
            JPG
          </span>
          <span className="px-2 py-1 text-[10px] font-medium text-white/40
                          bg-white/5 border border-white/10 rounded-full uppercase tracking-wider">
            HEIC
          </span>
          <span className="px-2 py-1 text-[10px] font-medium text-white/40
                          bg-white/5 border border-white/10 rounded-full uppercase tracking-wider">
            Max 4kpx
          </span>
        </div>

        <input
          type="file"
          accept=".jpg,.jpeg,.heic,.heif,image/jpeg,image/heic,image/heif"
          onChange={handleFileInput}
          className="hidden"
        />
      </label>
    </div>
  );
}
