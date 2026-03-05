'use client';

import { Effect } from '@/types';
import { MoveRight, RefreshCw, Maximize, TrendingUp } from 'lucide-react';

const EFFECT_ICONS = {
  'lateral-motion': MoveRight,
  'vertical-zoom': Maximize,
  'handheld-drift': TrendingUp,
  'cinematic-swirl': RefreshCw,
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
      className={`group relative aspect-square overflow-hidden rounded-lg
                  bg-white/5 backdrop-blur-xl transition-all
                  ${selected
                    ? 'ring-2 ring-white shadow-lg shadow-white/20'
                    : 'ring-1 ring-white/10 hover:ring-white/30'
                  }`}
    >
      {/* Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className={`w-8 h-8 transition-colors ${
          selected ? 'text-white/80' : 'text-white/30 group-hover:text-white/50'
        }`} />
      </div>

      {/* Label */}
      <div className="absolute inset-0 flex items-end p-3">
        <div className="w-full">
          <h3 className={`text-[10px] font-medium tracking-wider uppercase transition-colors
                         ${selected ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
            {effect.name}
          </h3>
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/50" />
      )}
    </button>
  );
}
