import type { AudioFeatures } from '../audio/features';

interface MeterRef {
  bar: HTMLElement;
  value: HTMLElement;
}

const METER_DEFS: Array<{
  key: keyof Pick<AudioFeatures, 'loudness' | 'bass' | 'mid' | 'treble' | 'brightness' | 'bloom'>;
  label: string;
}> = [
  { key: 'loudness', label: 'loud' },
  { key: 'bass', label: 'bass' },
  { key: 'mid', label: 'mid' },
  { key: 'treble', label: 'treb' },
  { key: 'brightness', label: 'bright' },
  { key: 'bloom', label: 'bloom' },
];

export function buildMeters(container: HTMLElement): (f: AudioFeatures) => void {
  container.innerHTML = '';
  const refs: Record<string, MeterRef> = {};
  for (const def of METER_DEFS) {
    const wrap = document.createElement('div');
    wrap.className = 'meter';
    const label = document.createElement('span');
    const labelText = document.createElement('em');
    labelText.textContent = def.label;
    labelText.style.fontStyle = 'normal';
    const value = document.createElement('em');
    value.textContent = '0.00';
    value.style.fontStyle = 'normal';
    label.append(labelText, value);
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('i');
    bar.appendChild(fill);
    wrap.append(label, bar);
    container.appendChild(wrap);
    refs[def.key] = { bar: fill, value };
  }

  let lastPaint = 0;
  return (f: AudioFeatures) => {
    // Update at ~20 Hz to avoid layout churn dominating the main thread.
    if (f.t - lastPaint < 50) return;
    lastPaint = f.t;
    for (const def of METER_DEFS) {
      const v = f[def.key] as number;
      const ref = refs[def.key];
      ref.bar.style.width = `${Math.round(v * 100)}%`;
      ref.value.textContent = v.toFixed(2);
    }
  };
}

export function makeFpsCounter(target: HTMLElement): () => void {
  let frames = 0;
  let last = performance.now();
  return () => {
    frames++;
    const now = performance.now();
    if (now - last >= 500) {
      const fps = (frames * 1000) / (now - last);
      target.textContent = `${fps.toFixed(0)} fps`;
      frames = 0;
      last = now;
    }
  };
}
