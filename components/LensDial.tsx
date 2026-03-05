'use client';

import { useState } from 'react';

interface LensDialProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function LensDial({ value, onChange, min = 0, max = 100 }: LensDialProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wider text-white/50 uppercase">
          Intensity
        </span>
        <span className={`text-sm font-mono tabular-nums transition-opacity ${
          isDragging ? 'opacity-100' : 'opacity-50'
        }`}>
          {value}%
        </span>
      </div>

      <div className="relative">
        {/* Tick marks */}
        <div className="absolute inset-x-0 top-0 flex justify-between px-1 -translate-y-2">
          {[0, 25, 50, 75, 100].map((tick) => (
            <div
              key={tick}
              className="w-px h-1.5 bg-white/20"
              style={{
                opacity: Math.abs(value - tick) < 5 ? 1 : 0.3,
              }}
            />
          ))}
        </div>

        {/* Custom slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:cursor-grab
                     [&::-webkit-slider-thumb]:shadow-lg
                     [&::-webkit-slider-thumb]:shadow-black/50
                     [&::-webkit-slider-thumb]:transition-transform
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-webkit-slider-thumb]:active:cursor-grabbing
                     [&::-moz-range-thumb]:w-4
                     [&::-moz-range-thumb]:h-4
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:border-0
                     [&::-moz-range-thumb]:cursor-grab
                     [&::-moz-range-thumb]:shadow-lg
                     [&::-moz-range-thumb]:shadow-black/50"
          style={{
            background: `linear-gradient(to right,
              rgba(255,255,255,0.3) 0%,
              rgba(255,255,255,0.3) ${value}%,
              rgba(255,255,255,0.1) ${value}%,
              rgba(255,255,255,0.1) 100%)`,
          }}
        />

        {/* Subtle markers */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 translate-y-4">
          <span className="text-[10px] text-white/30">0</span>
          <span className="text-[10px] text-white/30">100</span>
        </div>
      </div>
    </div>
  );
}
