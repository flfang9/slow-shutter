'use client';

import { Effect } from '@/types';

interface EffectCardProps {
  effect: Effect;
  selected: boolean;
  onSelect: () => void;
}

export function EffectCard({ effect, selected, onSelect }: EffectCardProps) {
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
      {/* Blurred background image placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />

      {/* Label */}
      <div className="absolute inset-0 flex items-end p-3">
        <div className="w-full">
          <h3 className={`text-xs font-medium tracking-wide uppercase transition-colors
                         ${selected ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
            {effect.name}
          </h3>
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow-lg shadow-white/50" />
      )}
    </button>
  );
}
