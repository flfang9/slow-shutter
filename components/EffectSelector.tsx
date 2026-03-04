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
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Choose Effect</h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {EFFECTS.map((effect) => (
          <EffectCard
            key={effect.id}
            effect={effect}
            selected={selectedEffect === effect.id}
            onSelect={() => onEffectSelect(effect.id)}
          />
        ))}
      </div>
    </div>
  );
}
