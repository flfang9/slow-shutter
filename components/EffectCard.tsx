'use client';

import { Effect } from '@/types';
import { Card } from './ui/card';

interface EffectCardProps {
  effect: Effect;
  selected: boolean;
  onSelect: () => void;
}

export function EffectCard({ effect, selected, onSelect }: EffectCardProps) {
  return (
    <Card
      className={`flex-shrink-0 w-48 cursor-pointer transition-all ${
        selected
          ? 'border-2 border-primary ring-2 ring-primary/20'
          : 'border border-border hover:border-primary/30'
      }`}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="aspect-square bg-muted rounded-md mb-3 flex items-center justify-center">
          <span className="text-4xl opacity-50">📸</span>
        </div>
        <h3 className="font-semibold mb-1">{effect.name}</h3>
        <p className="text-sm text-muted-foreground">{effect.description}</p>
      </div>
    </Card>
  );
}
