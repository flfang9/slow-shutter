'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

interface AdvancedControlsProps {
  intensity: number;
  onIntensityChange: (value: number) => void;
}

export function AdvancedControls({
  intensity,
  onIntensityChange,
}: AdvancedControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2"
      >
        Advanced
        {isOpen ? (
          <ChevronUp className="ml-2 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-2 h-4 w-4" />
        )}
      </Button>

      {isOpen && (
        <div className="p-4 bg-card border border-border rounded-lg">
          <label className="block text-sm font-medium mb-3">
            Intensity: {intensity}%
          </label>
          <Slider
            value={[intensity]}
            onValueChange={(values) => onIntensityChange(values[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Subtle</span>
            <span>Intense</span>
          </div>
        </div>
      )}
    </div>
  );
}
