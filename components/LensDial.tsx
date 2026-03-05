'use client';

import { useState, useEffect, useRef } from 'react';

interface LensDialProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  effect?: string; // Optional: current effect for phase indicators
}

export function LensDial({ value, onChange, min = 0, max = 100, effect }: LensDialProps) {
  const [isDragging, setIsDragging] = useState(false);
  const prevValueRef = useRef(value);

  // Haptic feedback when crossing threshold (65% for light-trails)
  useEffect(() => {
    if (effect === 'light-trails' && isDragging) {
      const threshold = 65;
      const crossedUp = prevValueRef.current < threshold && value >= threshold;
      const crossedDown = prevValueRef.current >= threshold && value < threshold;

      if (crossedUp || crossedDown) {
        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
    }
    prevValueRef.current = value;
  }, [value, effect, isDragging]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value));
  };

  // Phase label for light-trails effect
  const getPhaseLabel = () => {
    if (effect !== 'light-trails') return null;
    if (value < 65) return 'Glow';
    return 'Trails';
  };

  const phaseLabel = getPhaseLabel();
  const showThreshold = effect === 'light-trails';
  const thresholdPosition = 65;

  return (
    <div className="relative pt-6">
      {/* Percentage and phase label above slider */}
      <div className="absolute left-0 right-0 -top-1 flex justify-center items-center gap-2">
        <span className={`text-xs font-mono tabular-nums transition-all ${
          isDragging ? 'text-white/80 scale-110' : 'text-white/40'
        }`}>
          {value}%
        </span>
        {phaseLabel && (
          <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded transition-all ${
            value >= 65
              ? 'bg-white/15 text-white/80'
              : 'bg-white/5 text-white/40'
          }`}>
            {phaseLabel}
          </span>
        )}
      </div>

      <div className="relative">
        {/* Threshold marker for light-trails */}
        {showThreshold && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-white/30 pointer-events-none z-10"
            style={{ left: `${thresholdPosition}%` }}
          >
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-white/30 whitespace-nowrap">
              trails
            </div>
          </div>
        )}

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
            background: showThreshold
              ? `linear-gradient(to right,
                  rgba(255,255,255,0.15) 0%,
                  rgba(255,255,255,0.15) ${Math.min(value, thresholdPosition)}%,
                  ${value >= thresholdPosition ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)'} ${thresholdPosition}%,
                  ${value >= thresholdPosition ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'} ${value}%,
                  rgba(255,255,255,0.1) ${value}%,
                  rgba(255,255,255,0.1) 100%)`
              : `linear-gradient(to right,
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
