import type { AudioFeatures } from '../audio/features';

export type EffectMode = 'prism' | 'ripple' | 'bloom' | 'kaleido' | 'combo';

export interface RenderParams {
  features: AudioFeatures;
  effect: EffectMode;
  sensitivity: number;
  mirror: boolean;
  /** Seconds since renderer start; drives autonomous motion. */
  time: number;
}

export interface Renderer {
  readonly kind: 'webgpu' | 'webgl2';
  resize(width: number, height: number): void;
  render(params: RenderParams): void;
  destroy(): void;
}

export const EFFECT_INDEX: Record<EffectMode, number> = {
  prism: 0,
  ripple: 1,
  bloom: 2,
  kaleido: 3,
  combo: 4,
};
