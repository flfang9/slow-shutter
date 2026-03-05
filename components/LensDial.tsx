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
    <div className="relative pt-6">
      {/* Percentage above slider */}
      <div className="absolute left-0 right-0 -top-1 flex justify-center">
        <span className={`text-xs font-mono tabular-nums transition-all ${
          isDragging ? 'text-white/80 scale-110' : 'text-white/40'
        }`}>
          {value}%
        </span>
      </div>

      <div className="relative">
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
          className="w-full h-0.5 bg-white/10 rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:cursor-grab
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-webkit-slider-thumb]:shadow-black/50
                     [&::-webkit-slider-thumb]:transition-all
                     [&::-webkit-slider-thumb]:hover:scale-125
                     [&::-webkit-slider-thumb]:active:cursor-grabbing
                     [&::-moz-range-thumb]:w-3
                     [&::-moz-range-thumb]:h-3
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:border-0
                     [&::-moz-range-thumb]:cursor-grab
                     [&::-moz-range-thumb]:shadow-md
                     [&::-moz-range-thumb]:shadow-black/50"
          style={{
            background: `linear-gradient(to right,
              rgba(255,255,255,0.2) 0%,
              rgba(255,255,255,0.2) ${value}%,
              rgba(255,255,255,0.1) ${value}%,
              rgba(255,255,255,0.1) 100%)`,
          }}
        />
      </div>
    </div>
  );
}
