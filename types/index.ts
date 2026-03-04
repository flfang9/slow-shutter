export type EffectType = 'lateral-motion' | 'vertical-zoom' | 'handheld-drift';

export interface Effect {
  id: EffectType;
  name: string;
  description: string;
  preview: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ProcessingOptions {
  effect: EffectType;
  intensity: number;
}
