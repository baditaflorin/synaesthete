import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPrefs, savePrefs } from '../prefs';

interface FakeWindow {
  localStorage: Storage;
  location: { hash: string; pathname: string; search: string; href: string };
  history: { replaceState: (state: unknown, title: string, url: string) => void };
}

function setupGlobals(initialHash = ''): FakeWindow {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
  };
  const loc = {
    hash: initialHash,
    pathname: '/',
    search: '',
    get href() {
      return `http://localhost${loc.pathname}${loc.search}${loc.hash}`;
    },
  };
  const history = {
    replaceState: vi.fn((_state: unknown, _title: string, url: string) => {
      const i = url.indexOf('#');
      loc.hash = i === -1 ? '' : url.slice(i);
    }),
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('location', loc);
  vi.stubGlobal('history', history);
  return { localStorage: storage, location: loc, history };
}

describe('prefs', () => {
  beforeEach(() => {
    setupGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns defaults when nothing is stored', () => {
    const p = loadPrefs();
    expect(p).toEqual({ effect: 'combo', sensitivity: 1, mirror: true });
  });

  it('reads compact url hash params (e/s/m)', () => {
    setupGlobals('#e=ripple&s=1.7&m=0');
    const p = loadPrefs();
    expect(p.effect).toBe('ripple');
    expect(p.sensitivity).toBeCloseTo(1.7, 5);
    expect(p.mirror).toBe(false);
  });

  it('hash overrides localStorage', () => {
    const w = setupGlobals('#e=bloom');
    w.localStorage.setItem(
      'synaesthete:prefs:v1',
      JSON.stringify({ effect: 'prism', sensitivity: 1.5, mirror: false }),
    );
    const p = loadPrefs();
    expect(p.effect).toBe('bloom');
    // values not in hash come from storage:
    expect(p.sensitivity).toBeCloseTo(1.5, 5);
    expect(p.mirror).toBe(false);
  });

  it('clamps out-of-range sensitivity', () => {
    setupGlobals('#s=99');
    expect(loadPrefs().sensitivity).toBe(3);
    setupGlobals('#s=-1');
    expect(loadPrefs().sensitivity).toBe(0.2);
  });

  it('rejects unknown effect names', () => {
    setupGlobals('#e=garbage');
    expect(loadPrefs().effect).toBe('combo');
  });

  it('savePrefs writes both storage and hash', () => {
    const w = setupGlobals();
    savePrefs({ effect: 'kaleido', sensitivity: 0.75, mirror: true });
    expect(w.localStorage.getItem('synaesthete:prefs:v1')).toContain('kaleido');
    expect(w.location.hash).toBe('#e=kaleido&s=0.75&m=1');
  });
});
