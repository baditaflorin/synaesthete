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

/**
 * Load prefs with the precedence: URL hash → localStorage → defaults.
 * The hash wins so a shared link always opens with the sender's settings.
 */
export function loadPrefs(): Prefs {
  const stored = readStorage();
  const fromHash = readHash();
  return { ...DEFAULTS, ...stored, ...fromHash };
}

/** Persist to localStorage AND the URL hash so the URL is always shareable. */
export function savePrefs(p: Prefs): void {
  writeStorage(p);
  writeHash(p);
}

function readStorage(): Partial<Prefs> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return sanitize(parsed);
  } catch {
    return {};
  }
}

function writeStorage(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode / quota — silently ignore */
  }
}

function readHash(): Partial<Prefs> {
  if (!location.hash || location.hash.length < 2) return {};
  const params = new URLSearchParams(location.hash.slice(1));
  const out: Partial<Prefs> = {};
  const e = params.get('e');
  if (e) {
    const v = validEffect(e);
    if (v) out.effect = v;
  }
  const s = params.get('s');
  if (s !== null) {
    const n = Number(s);
    if (Number.isFinite(n)) out.sensitivity = n;
  }
  const m = params.get('m');
  if (m !== null) out.mirror = m === '1' || m === 'true';
  return sanitize(out);
}

function writeHash(p: Prefs): void {
  const params = new URLSearchParams();
  params.set('e', p.effect);
  params.set('s', p.sensitivity.toFixed(2));
  params.set('m', p.mirror ? '1' : '0');
  // replaceState avoids creating a back-button entry per slider tick.
  const next = `#${params.toString()}`;
  if (location.hash !== next) {
    history.replaceState(null, '', `${location.pathname}${location.search}${next}`);
  }
}

function sanitize(p: Partial<Prefs>): Partial<Prefs> {
  const out: Partial<Prefs> = {};
  if (p.effect !== undefined) {
    const v = validEffect(p.effect);
    if (v) out.effect = v;
  }
  if (typeof p.sensitivity === 'number' && Number.isFinite(p.sensitivity)) {
    out.sensitivity = Math.min(3, Math.max(0.2, p.sensitivity));
  }
  if (typeof p.mirror === 'boolean') out.mirror = p.mirror;
  return out;
}

function validEffect(v: unknown): EffectMode | null {
  return v === 'prism' || v === 'ripple' || v === 'bloom' || v === 'kaleido' || v === 'combo'
    ? v
    : null;
}
