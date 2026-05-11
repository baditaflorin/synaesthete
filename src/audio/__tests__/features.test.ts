import { describe, expect, it } from 'vitest';
import { AudioFeatureExtractor } from '../features';

interface FakeAnalyserOpts {
  freq: Uint8Array;
  time: Uint8Array;
}

function makeExtractor(opts: FakeAnalyserOpts): AudioFeatureExtractor {
  const fakeAnalyser = {
    fftSize: opts.time.length,
    frequencyBinCount: opts.freq.length,
    smoothingTimeConstant: 0.6,
    minDecibels: -90,
    maxDecibels: -10,
    getByteFrequencyData(out: Uint8Array) {
      out.set(opts.freq);
    },
    getByteTimeDomainData(out: Uint8Array) {
      out.set(opts.time);
    },
  } as unknown as AnalyserNode;

  const fakeCtx = {
    sampleRate: 48000,
    createAnalyser: () => fakeAnalyser,
  } as unknown as AudioContext;

  const fakeSource = { connect: () => undefined } as unknown as MediaStreamAudioSourceNode;
  return new AudioFeatureExtractor(fakeCtx, fakeSource);
}

describe('AudioFeatureExtractor', () => {
  it('reports near-zero loudness for silence', () => {
    const time = new Uint8Array(2048).fill(128);
    const freq = new Uint8Array(1024).fill(0);
    const ex = makeExtractor({ freq, time });
    const f = ex.read();
    expect(f.loudness).toBeLessThan(0.05);
    expect(f.bass).toBeLessThan(0.05);
  });

  it('responds to loud time-domain content', () => {
    const time = new Uint8Array(2048);
    for (let i = 0; i < time.length; i++) {
      time[i] = i % 2 === 0 ? 0 : 255;
    }
    const freq = new Uint8Array(1024).fill(0);
    const ex = makeExtractor({ freq, time });
    // Smoothing means we need a couple of frames to see steady-state.
    let last = ex.read().loudness;
    for (let i = 0; i < 5; i++) last = ex.read().loudness;
    expect(last).toBeGreaterThan(0.5);
  });

  it('places energy in the bass band when low bins are hot', () => {
    const time = new Uint8Array(2048).fill(128);
    const freq = new Uint8Array(1024);
    // Low bins only.
    for (let i = 1; i < 8; i++) freq[i] = 240;
    const ex = makeExtractor({ freq, time });
    let f = ex.read();
    for (let i = 0; i < 5; i++) f = ex.read();
    expect(f.bass).toBeGreaterThan(f.treble);
  });

  it('detects onset hits on rising spectral flux', () => {
    const time = new Uint8Array(2048).fill(128);
    const quiet = new Uint8Array(1024).fill(10);
    const loud = new Uint8Array(1024).fill(220);

    const ex = makeExtractor({ freq: quiet, time });
    for (let i = 0; i < 4; i++) ex.read();
    // Swap to loud spectrum to spike flux.
    (
      ex as unknown as { analyser: { getByteFrequencyData: (a: Uint8Array) => void } }
    ).analyser.getByteFrequencyData = (out: Uint8Array) => out.set(loud);
    const after = ex.read();
    expect(after.hit).toBeGreaterThan(0.5);
  });

  it('produces a normalised chroma vector summing to ~1', () => {
    const time = new Uint8Array(2048).fill(128);
    const freq = new Uint8Array(1024);
    for (let i = 1; i < 200; i++) freq[i] = 100;
    const ex = makeExtractor({ freq, time });
    const f = ex.read();
    let s = 0;
    for (let i = 0; i < 12; i++) s += f.chroma[i];
    expect(s).toBeCloseTo(1, 2);
  });
});
