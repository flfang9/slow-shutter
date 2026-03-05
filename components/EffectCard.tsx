'use client';

import { Effect } from '@/types';
import { MoveRight, Maximize, Wind, RotateCw, Sparkles, Film } from 'lucide-react';

const EFFECT_ICONS = {
  'lateral-motion': MoveRight,
  'vertical-zoom': Maximize,
  'handheld-drift': Wind,
  'cinematic-swirl': RotateCw,
  'soft-light': Sparkles,
  'film-grain': Film,
};

interface EffectCardProps {
  effect: Effect;
  selected: boolean;
  onSelect: () => void;
}

export function EffectCard({ effect, selected, onSelect }: EffectCardProps) {
  const Icon = EFFECT_ICONS[effect.id as keyof typeof EFFECT_ICONS];

  return (
    <button
      onClick={onSelect}
      className={`flex-shrink-0 w-[60px] h-[60px] rounded-lg flex flex-col items-center justify-center
                  backdrop-blur-xl transition-all
                  ${selected
                    ? 'border border-white bg-white/10'
                    : 'border border-white/10 hover:border-white/30'
                  }`}
    >
      <Icon className={`w-5 h-5 mb-1 transition-colors ${
        selected ? 'text-white' : 'text-white/50'
      }`} />
      <span className={`text-[8px] font-medium tracking-wider uppercase transition-colors ${
        selected ? 'text-white' : 'text-white/40'
      }`}>
        {effect.name.split(' ')[0]}
      </span>
    </button>
  );
}
