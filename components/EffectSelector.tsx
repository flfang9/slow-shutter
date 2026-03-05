'use client';

import { Effect, EffectType } from '@/types';
import { EffectCard } from './EffectCard';

const EFFECTS: Effect[] = [
  {
    id: 'lateral-motion',
    name: 'Lateral Motion',
    description: 'Side-to-side motion blur',
    preview: '/effect-previews/lateral.jpg',
  },
  {
    id: 'vertical-zoom',
    name: 'Zoom Pull',
    description: 'Dolly zoom effect',
    preview: '/effect-previews/zoom.jpg',
  },
  {
    id: 'handheld-drift',
    name: 'Handheld Drift',
    description: 'Natural camera shake',
    preview: '/effect-previews/drift.jpg',
  },
  {
    id: 'cinematic-swirl',
    name: 'Cinematic Swirl',
    description: 'Tap to set center',
    preview: '/effect-previews/swirl.jpg',
  },
  {
    id: 'soft-light',
    name: 'Soft Light',
    description: 'Film halation glow',
    preview: '/effect-previews/soft-light.jpg',
  },
  {
    id: 'light-trails',
    name: 'Light Trails',
    description: 'Glow → Trails at 65%',
    preview: '/effect-previews/light-trails.jpg',
  },
  {
    id: 'film-grain',
    name: 'Film Grain',
    description: 'Fuji cinema texture',
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

      {/* Mobile: horizontal scroller with snap */}
      <div className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
        {EFFECTS.map((effect) => (
          <div key={effect.id} className="snap-center">
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
