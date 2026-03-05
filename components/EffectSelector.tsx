'use client';

import { Effect, EffectType } from '@/types';
import { EffectCard } from './EffectCard';

const EFFECTS: Effect[] = [
  {
    id: 'lateral-motion',
    name: 'Lateral Motion',
    description: 'Horizontal movement blur',
    preview: '/effect-previews/lateral.jpg',
  },
  {
    id: 'vertical-zoom',
    name: 'Zoom Pull',
    description: 'Radial zoom effect',
    preview: '/effect-previews/zoom.jpg',
  },
  {
    id: 'handheld-drift',
    name: 'Handheld Drift',
    description: 'Organic camera shake',
    preview: '/effect-previews/drift.jpg',
  },
  {
    id: 'cinematic-swirl',
    name: 'Cinematic Swirl',
    description: 'Tokyo nights radial spin',
    preview: '/effect-previews/swirl.jpg',
  },
];

interface EffectSelectorProps {
  selectedEffect: EffectType;
  onEffectSelect: (effect: EffectType) => void;
}

export function EffectSelector({
  selectedEffect,
  onEffectSelect,
}: EffectSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {EFFECTS.map((effect) => (
        <EffectCard
          key={effect.id}
          effect={effect}
          selected={selectedEffect === effect.id}
          onSelect={() => onEffectSelect(effect.id)}
        />
      ))}
    </div>
  );
}
