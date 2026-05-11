import './styles.css';
import { AudioFeatureExtractor, type AudioFeatures } from './audio/features';
import { acquireMedia, stopStream, type MediaBundle } from './media/devices';
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
  fps: HTMLElement;
  hint: HTMLElement;
}

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

  // Need at least one of the two.
  if (!bundle.camera && !bundle.mic) {
    el.overlayHint.textContent =
      bundle.cameraError ?? bundle.micError ?? 'Camera and microphone unavailable.';
    el.startBtn.disabled = false;
    return;
  }

  // Build video element off-DOM; it just feeds the texture upload.
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  if (bundle.camera) {
    video.srcObject = bundle.camera;
  } else {
    // No camera — paint a synthetic gradient frame via a 1×1 canvas-derived stream.
    video.srcObject = makeBlankStream();
  }

  try {
    await video.play();
  } catch {
    // Some browsers reject autoplay without user gesture; the button click is the gesture.
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

  // Silent baseline features when mic is unavailable — keeps the renderer alive.
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

  el.effectSelect.addEventListener('change', () => {
    effect = el.effectSelect.value as EffectMode;
    savePrefs({ effect, sensitivity, mirror });
  });
  el.sensitivity.addEventListener('input', () => {
    sensitivity = Number(el.sensitivity.value);
    savePrefs({ effect, sensitivity, mirror });
  });
  el.mirror.addEventListener('change', () => {
    mirror = el.mirror.checked;
    savePrefs({ effect, sensitivity, mirror });
  });

  el.hudToggle.addEventListener('click', () => {
    const collapsed = el.hud.classList.toggle('collapsed');
    el.hudToggle.textContent = collapsed ? '+' : '−';
    el.hudToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(el.canvas.clientWidth * dpr);
    const h = Math.round(el.canvas.clientHeight * dpr);
    if (w > 0 && h > 0) renderer.resize(w, h);
  };
  resize();
  window.addEventListener('resize', resize);
  // Some browsers don't fire resize when the address bar collapses on mobile.
  window.addEventListener('orientationchange', resize);

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
    tickFps();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Cleanup hook — page navigation will tear down anyway, but be tidy.
  window.addEventListener('pagehide', () => {
    renderer.destroy();
    if (audioCtx) audioCtx.close().catch(() => undefined);
    stopStream(bundle.camera);
    stopStream(bundle.mic);
  });
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
