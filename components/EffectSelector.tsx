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
  {
    id: 'soft-light',
    name: 'Soft Light',
    description: 'Halation + glow',
    preview: '/effect-previews/soft-light.jpg',
  },
  {
    id: 'film-grain',
    name: 'Film Grain',
    description: 'Japanese cinema',
    preview: '/effect-previews/film-grain.jpg',
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
    <>
      {/* Desktop: 2x2 grid */}
      <div className="hidden md:grid grid-cols-2 gap-3">
        {EFFECTS.map((effect) => (
          <EffectCard
            key={effect.id}
            effect={effect}
            selected={selectedEffect === effect.id}
            onSelect={() => onEffectSelect(effect.id)}
          />
        ))}
      </div>

      {/* Mobile: horizontal scroller */}
      <div className="md:hidden flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        {EFFECTS.map((effect) => (
          <div key={effect.id} className="flex-shrink-0 w-24">
            <EffectCard
              effect={effect}
              selected={selectedEffect === effect.id}
              onSelect={() => onEffectSelect(effect.id)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
