import type { EffectMode } from '../render/types';

const KEY = 'synaesthete:prefs:v1';

export interface Prefs {
  effect: EffectMode;
  sensitivity: number;
  mirror: boolean;
}

const DEFAULTS: Prefs = {
  effect: 'combo',
  sensitivity: 1,
  mirror: true,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      effect: validEffect(parsed.effect) ?? DEFAULTS.effect,
      sensitivity: clampNum(parsed.sensitivity, 0.2, 3, DEFAULTS.sensitivity),
      mirror: typeof parsed.mirror === 'boolean' ? parsed.mirror : DEFAULTS.mirror,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode / quota exceeded — silently ignore */
  }
}

function validEffect(v: unknown): EffectMode | null {
  return v === 'prism' || v === 'ripple' || v === 'bloom' || v === 'kaleido' || v === 'combo'
    ? v
    : null;
}

function clampNum(v: unknown, lo: number, hi: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
}
