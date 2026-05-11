/**
 * Real-time audio feature extraction in the browser.
 *
 * We avoid pulling in librosa / pyodide for v1 — every needed feature is cheap
 * to compute from an AnalyserNode's frequency and time-domain data. Each frame
 * the renderer asks for a fresh `AudioFeatures` snapshot and paints with it.
 */

export interface AudioFeatures {
  /** Linear loudness in [0, 1] (smoothed RMS of the time-domain signal). */
  loudness: number;
  /** Bass band energy in [0, 1] (~20–250Hz). */
  bass: number;
  /** Mid band energy in [0, 1] (~250–2000Hz). */
  mid: number;
  /** Treble band energy in [0, 1] (~2k–8kHz). */
  treble: number;
  /** Spectral centroid normalised to [0, 1]; high = bright / sibilant. */
  brightness: number;
  /** Spectral flux based onset envelope, smoothed [0, 1]. */
  onset: number;
  /** Discrete onset hit; 1.0 right after a transient, decays. */
  hit: number;
  /** 12-bin chroma vector summed mod-octave [0, 1] each. */
  chroma: Float32Array;
  /** Hue derived from chroma argmax in [0, 1) (12-tone wheel). */
  chromaHue: number;
  /** Bloom envelope: rises on sustained, harmonic, mid-band energy (laughter, voice). */
  bloom: number;
  /** Time the snapshot was taken (performance.now). */
  t: number;
}

const NOTE_HUES = new Float32Array(12);
for (let i = 0; i < 12; i++) NOTE_HUES[i] = i / 12;

export class AudioFeatureExtractor {
  readonly ctx: AudioContext;
  readonly source: MediaStreamAudioSourceNode;
  readonly analyser: AnalyserNode;

  private readonly fft: Uint8Array<ArrayBuffer>;
  private readonly time: Uint8Array<ArrayBuffer>;
  private readonly prevSpectrum: Float32Array;

  // Smoothing state.
  private loudnessS = 0;
  private bassS = 0;
  private midS = 0;
  private trebleS = 0;
  private brightnessS = 0;
  private onsetS = 0;
  private bloomS = 0;
  private hitDecay = 0;
  private fluxBaseline = 0;

  // Output buffer reused each frame.
  private readonly out: AudioFeatures;

  constructor(ctx: AudioContext, source: MediaStreamAudioSourceNode) {
    this.ctx = ctx;
    this.source = source;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    source.connect(analyser);
    this.analyser = analyser;

    this.fft = new Uint8Array(analyser.frequencyBinCount);
    this.time = new Uint8Array(analyser.fftSize);
    this.prevSpectrum = new Float32Array(analyser.frequencyBinCount);

    this.out = {
      loudness: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      brightness: 0,
      onset: 0,
      hit: 0,
      chroma: new Float32Array(12),
      chromaHue: 0,
      bloom: 0,
      t: 0,
    };
  }

  /**
   * Compute the next snapshot. Reuses internal buffers — copy if you need to
   * keep a value across frames.
   */
  read(): AudioFeatures {
    const { analyser, fft, time, prevSpectrum, out } = this;
    analyser.getByteFrequencyData(fft);
    analyser.getByteTimeDomainData(time);

    // 1. RMS loudness from time-domain (more responsive than dB-binned spectrum).
    let sumSq = 0;
    for (let i = 0; i < time.length; i++) {
      const v = (time[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / time.length);
    // Compress so quiet rooms still register without ceiling out on speech.
    const loudness = Math.min(1, rms * 3.5);
    this.loudnessS = lerp(this.loudnessS, loudness, 0.35);

    // 2. Band energies from byte spectrum (0..255 → 0..1).
    const sr = this.ctx.sampleRate;
    const nyquist = sr * 0.5;
    const binHz = nyquist / fft.length;
    const bassEnd = Math.min(fft.length, Math.floor(250 / binHz));
    const midEnd = Math.min(fft.length, Math.floor(2000 / binHz));
    const trebleEnd = Math.min(fft.length, Math.floor(8000 / binHz));

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;
    let total = 0;
    let weighted = 0;
    for (let i = 1; i < trebleEnd; i++) {
      const v = fft[i] / 255;
      total += v;
      weighted += v * i;
      if (i < bassEnd) bassSum += v;
      else if (i < midEnd) midSum += v;
      else trebleSum += v;
    }
    const bass = clamp01((bassSum / Math.max(1, bassEnd)) * 1.5);
    const mid = clamp01((midSum / Math.max(1, midEnd - bassEnd)) * 1.6);
    const treble = clamp01((trebleSum / Math.max(1, trebleEnd - midEnd)) * 2.2);
    this.bassS = lerp(this.bassS, bass, 0.4);
    this.midS = lerp(this.midS, mid, 0.4);
    this.trebleS = lerp(this.trebleS, treble, 0.4);

    // 3. Spectral centroid → brightness, normalised against trebleEnd.
    const centroidBin = total > 1e-6 ? weighted / total : 0;
    const brightness = clamp01(centroidBin / Math.max(1, trebleEnd));
    this.brightnessS = lerp(this.brightnessS, brightness, 0.3);

    // 4. Spectral flux (rectified positive change) → onset envelope.
    let flux = 0;
    for (let i = 0; i < fft.length; i++) {
      const v = fft[i] / 255;
      const d = v - prevSpectrum[i];
      if (d > 0) flux += d;
      prevSpectrum[i] = v;
    }
    flux /= fft.length;
    // Adaptive baseline so steady-state noise doesn't paint constant onset.
    this.fluxBaseline = lerp(this.fluxBaseline, flux, 0.02);
    const onsetRaw = clamp01((flux - this.fluxBaseline) * 12);
    this.onsetS = lerp(this.onsetS, onsetRaw, 0.5);

    // Discrete hit: trigger on rising edge above threshold; decay over ~250ms.
    if (onsetRaw > 0.45 && this.hitDecay < 0.1) {
      this.hitDecay = 1;
    } else {
      this.hitDecay *= 0.92;
    }

    // 5. Chroma vector: fold magnitudes into 12 pitch classes via log2 of freq.
    const chroma = out.chroma;
    chroma.fill(0);
    // Skip DC and very-low bins (<30Hz) which can't be reliably mapped.
    const startBin = Math.max(1, Math.floor(30 / binHz));
    for (let i = startBin; i < midEnd; i++) {
      const freq = i * binHz;
      const midi = 69 + 12 * Math.log2(freq / 440);
      const cls = ((Math.round(midi) % 12) + 12) % 12;
      chroma[cls] += fft[i] / 255;
    }
    let chromaMax = 0;
    let chromaArg = 0;
    let chromaSum = 0;
    for (let i = 0; i < 12; i++) {
      if (chroma[i] > chromaMax) {
        chromaMax = chroma[i];
        chromaArg = i;
      }
      chromaSum += chroma[i];
    }
    if (chromaSum > 1e-6) {
      const inv = 1 / chromaSum;
      for (let i = 0; i < 12; i++) chroma[i] *= inv;
    }
    out.chromaHue = NOTE_HUES[chromaArg];

    // 6. Bloom — sustained mid + harmonic energy, ramps slow, fades slower.
    // Reads as a "warm vocal/laughter" envelope distinct from instantaneous loudness.
    const bloomTarget = clamp01(this.midS * 0.7 + this.brightnessS * 0.4) * this.loudnessS;
    const ramp = bloomTarget > this.bloomS ? 0.06 : 0.015;
    this.bloomS = lerp(this.bloomS, bloomTarget, ramp);

    out.loudness = this.loudnessS;
    out.bass = this.bassS;
    out.mid = this.midS;
    out.treble = this.trebleS;
    out.brightness = this.brightnessS;
    out.onset = this.onsetS;
    out.hit = this.hitDecay;
    out.bloom = this.bloomS;
    out.t = performance.now();
    return out;
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
