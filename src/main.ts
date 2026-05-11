import './styles.css';
import { AudioFeatureExtractor, type AudioFeatures } from './audio/features';
import { acquireMedia, stopStream, type MediaBundle } from './media/devices';
import { CanvasRecorder } from './media/recorder';
import { createRenderer, type EffectMode } from './render';
import { loadPrefs, savePrefs, type Prefs } from './state/prefs';
import { buildMeters, makeFpsCounter } from './ui/hud';

interface El {
  canvas: HTMLCanvasElement;
  overlay: HTMLElement;
  overlayHint: HTMLElement;
  startBtn: HTMLButtonElement;
  hud: HTMLElement;
  hudToggle: HTMLButtonElement;
  rendererBadge: HTMLElement;
  meters: HTMLElement;
  effectSelect: HTMLSelectElement;
  sensitivity: HTMLInputElement;
  mirror: HTMLInputElement;
  recordBtn: HTMLButtonElement;
  shareBtn: HTMLButtonElement;
  fps: HTMLElement;
  hint: HTMLElement;
}

const EFFECT_KEYS: readonly EffectMode[] = ['prism', 'ripple', 'bloom', 'kaleido', 'combo'];

function getEl(): El {
  return {
    canvas: must<HTMLCanvasElement>('#stage'),
    overlay: must<HTMLElement>('#permission-overlay'),
    overlayHint: must<HTMLElement>('#overlay-hint'),
    startBtn: must<HTMLButtonElement>('#start-btn'),
    hud: must<HTMLElement>('#hud'),
    hudToggle: must<HTMLButtonElement>('#hud-toggle'),
    rendererBadge: must<HTMLElement>('#renderer-badge'),
    meters: must<HTMLElement>('#meters'),
    effectSelect: must<HTMLSelectElement>('#effect-select'),
    sensitivity: must<HTMLInputElement>('#sensitivity'),
    mirror: must<HTMLInputElement>('#mirror'),
    recordBtn: must<HTMLButtonElement>('#record-btn'),
    shareBtn: must<HTMLButtonElement>('#share-btn'),
    fps: must<HTMLElement>('#fps'),
    hint: must<HTMLElement>('#hint'),
  };
}

function must<T extends Element>(sel: string): T {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
}

function applyPrefsToUi(el: El, prefs: Prefs): void {
  el.effectSelect.value = prefs.effect;
  el.sensitivity.value = String(prefs.sensitivity);
  el.mirror.checked = prefs.mirror;
}

async function start(el: El, prefs: Prefs): Promise<void> {
  el.overlayHint.textContent = 'Requesting camera + microphone…';
  el.startBtn.disabled = true;

  let bundle: MediaBundle;
  try {
    bundle = await acquireMedia();
  } catch (err) {
    el.overlayHint.textContent =
      err instanceof Error ? err.message : 'Could not acquire camera or microphone.';
    el.startBtn.disabled = false;
    return;
  }

  if (!bundle.camera && !bundle.mic) {
    el.overlayHint.textContent =
      bundle.cameraError ?? bundle.micError ?? 'Camera and microphone unavailable.';
    el.startBtn.disabled = false;
    return;
  }

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  if (bundle.camera) {
    video.srcObject = bundle.camera;
  } else {
    video.srcObject = makeBlankStream();
  }

  try {
    await video.play();
  } catch {
    /* the button click counts as the gesture; this should not happen */
  }

  const renderer = await createRenderer(el.canvas, video);
  el.rendererBadge.textContent = renderer.kind;
  el.rendererBadge.classList.add(renderer.kind === 'webgpu' ? 'ok' : 'warn');

  let extractor: AudioFeatureExtractor | null = null;
  let audioCtx: AudioContext | null = null;
  if (bundle.mic) {
    audioCtx = new AudioContext({ latencyHint: 'interactive' });
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch {
        /* ignore */
      }
    }
    const source = audioCtx.createMediaStreamSource(bundle.mic);
    extractor = new AudioFeatureExtractor(audioCtx, source);
  }

  const silentFeatures: AudioFeatures = {
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

  el.overlay.hidden = true;
  el.hud.hidden = false;

  if (bundle.cameraError) el.hint.textContent = 'No camera — audio-only mode.';
  else if (bundle.micError) el.hint.textContent = 'No mic — visuals are passive.';

  const meters = buildMeters(el.meters);
  const tickFps = makeFpsCounter(el.fps);

  let effect: EffectMode = prefs.effect;
  let sensitivity = prefs.sensitivity;
  let mirror = prefs.mirror;

  const persist = (): void => savePrefs({ effect, sensitivity, mirror });

  const setEffect = (next: EffectMode): void => {
    if (next === effect) return;
    effect = next;
    el.effectSelect.value = next;
    persist();
  };
  const setSensitivity = (next: number): void => {
    const clamped = Math.min(3, Math.max(0.2, next));
    if (clamped === sensitivity) return;
    sensitivity = clamped;
    el.sensitivity.value = String(clamped);
    persist();
  };
  const setMirror = (next: boolean): void => {
    if (next === mirror) return;
    mirror = next;
    el.mirror.checked = next;
    persist();
  };

  el.effectSelect.addEventListener('change', () => setEffect(el.effectSelect.value as EffectMode));
  el.sensitivity.addEventListener('input', () => setSensitivity(Number(el.sensitivity.value)));
  el.mirror.addEventListener('change', () => setMirror(el.mirror.checked));

  el.hudToggle.addEventListener('click', () => toggleHud(el));

  // --- Recorder wiring ---
  const micTrack = bundle.mic?.getAudioTracks()[0] ?? null;
  const recorder = new CanvasRecorder({ canvas: el.canvas, micTrack });
  if (!recorder.isAvailable) {
    el.recordBtn.disabled = true;
    el.recordBtn.title = 'Recording is not supported in this browser.';
  }
  const updateRecordLabel = (): void => {
    const label = el.recordBtn.querySelector('.label');
    if (recorder.state === 'recording') {
      const secs = Math.floor(recorder.elapsedSeconds());
      if (label)
        label.textContent = `Stop ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(
          secs % 60,
        ).padStart(2, '0')}`;
      el.recordBtn.setAttribute('aria-pressed', 'true');
    } else {
      if (label) label.textContent = 'Record';
      el.recordBtn.setAttribute('aria-pressed', 'false');
    }
  };
  const toggleRecord = async (): Promise<void> => {
    if (!recorder.isAvailable) return;
    if (recorder.state === 'recording') {
      const result = await recorder.stop();
      updateRecordLabel();
      if (result) {
        const secs = Math.round(result.durationMs / 1000);
        el.hint.textContent = `Saved ${result.filename} (${secs}s, ${formatBytes(result.bytes)})`;
      }
    } else {
      recorder.start();
      updateRecordLabel();
      el.hint.textContent = '';
    }
  };
  el.recordBtn.addEventListener('click', () => {
    void toggleRecord();
  });

  // --- Share button ---
  el.shareBtn.addEventListener('click', () => {
    persist(); // make sure the hash is current
    const url = location.href;
    const fallback = (): void => {
      el.hint.textContent = 'Copy from address bar — clipboard blocked.';
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        el.hint.textContent = 'Share link copied to clipboard.';
      }, fallback);
    } else {
      fallback();
    }
  });

  // --- Keyboard shortcuts ---
  window.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const target = ev.target as HTMLElement | null;
    if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;

    const k = ev.key.toLowerCase();
    if (k >= '1' && k <= '5') {
      ev.preventDefault();
      const idx = Number(k) - 1;
      const next = EFFECT_KEYS[idx];
      if (next) setEffect(next);
      return;
    }
    if (k === 'h') {
      ev.preventDefault();
      toggleHud(el);
      return;
    }
    if (k === 'm') {
      ev.preventDefault();
      setMirror(!mirror);
      return;
    }
    if (k === 'r') {
      ev.preventDefault();
      void toggleRecord();
      return;
    }
    if (k === '?') {
      ev.preventDefault();
      el.hint.textContent = '1-5 effect · H hud · M mirror · R record';
    }
  });

  // --- Resize ---
  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(el.canvas.clientWidth * dpr);
    const h = Math.round(el.canvas.clientHeight * dpr);
    if (w > 0 && h > 0) renderer.resize(w, h);
  };
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // --- Cross-tab pref sync (other Synaesthete tabs share the URL hash). ---
  window.addEventListener('hashchange', () => {
    const next = loadPrefs();
    setEffect(next.effect);
    setSensitivity(next.sensitivity);
    setMirror(next.mirror);
  });

  const t0 = performance.now();
  function frame(): void {
    const features = extractor ? extractor.read() : silentFeatures;
    renderer.render({
      features,
      effect,
      sensitivity,
      mirror,
      time: (performance.now() - t0) * 0.001,
    });
    meters(features);
    if (recorder.state === 'recording') updateRecordLabel();
    tickFps();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener('pagehide', () => {
    void recorder.stop().catch(() => undefined);
    renderer.destroy();
    if (audioCtx) audioCtx.close().catch(() => undefined);
    stopStream(bundle.camera);
    stopStream(bundle.mic);
  });
}

function toggleHud(el: El): void {
  const collapsed = el.hud.classList.toggle('collapsed');
  el.hudToggle.textContent = collapsed ? '+' : '−';
  el.hudToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function makeBlankStream(): MediaStream {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, c.width, c.height);
  }
  return c.captureStream(15);
}

function main(): void {
  const el = getEl();
  const prefs = loadPrefs();
  applyPrefsToUi(el, prefs);
  // Make sure the hash is normalised on load so the share button always works.
  savePrefs(prefs);

  const insecure =
    location.protocol !== 'https:' &&
    location.hostname !== 'localhost' &&
    location.hostname !== '127.0.0.1';
  if (insecure) {
    el.overlayHint.textContent =
      'Camera and microphone require HTTPS. Open the GitHub Pages URL or run via localhost.';
  }

  el.overlay.hidden = false;
  el.startBtn.addEventListener('click', () => {
    void start(el, prefs);
  });
}

main();
