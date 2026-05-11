# Synaesthete

> Live microphone audio transforms your camera feed through responsive WebGPU visual effects.

The world becomes responsive to its own sounds. A passing car bends the colors,
a slamming door sends a ripple, a child's laugh blooms gold.

**Live site:** https://baditaflorin.github.io/synaesthete/

## What it does

Synaesthete opens your camera and microphone, extracts a handful of audio
features in real time, and feeds them into a fragment shader that paints the
camera feed every frame. Five distinct features drive five distinct kinds of
transformation:

| Audio feature                  | Visual effect                                |
| ------------------------------ | -------------------------------------------- |
| Loudness (RMS)                 | Vignette breathing + saturation              |
| Bass band (~20–250 Hz)         | Magenta tint, prism shift direction          |
| Treble + spectral centroid     | Chromatic aberration ("a passing car")       |
| Spectral flux / onset          | Radial ripples ("a slamming door")           |
| Bloom envelope (sustained mid) | Warm gold glow on bright pixels ("laughter") |
| Chroma argmax (12-tone)        | Hue rotation + kaleidoscope fold count       |

Pick from five effect modes (Prism, Ripple, Bloom, Kaleidoscope, Combined) in
the HUD; tweak sensitivity and mirror.

## Quickstart

```bash
npm install
npm run dev          # http://127.0.0.1:5173/
```

The dev server reuses the same audio + camera permissions as the production
site. Permissions need either `localhost` or HTTPS.

To build the GitHub Pages artefact and serve it exactly as Pages would:

```bash
npm run build        # writes docs/
npm run preview      # http://127.0.0.1:4173/synaesthete/
```

## Architecture

```
src/
  audio/      AudioFeatureExtractor — RMS, bands, spectral centroid,
              spectral flux + adaptive onset, hits, chroma, bloom envelope
  media/      getUserMedia for camera + mic, friendly error mapping
  render/     WebGPU primary renderer + WebGL2 fallback, both consuming
              the same uniform layout. WGSL and GLSL shaders kept in sync.
  state/      localStorage prefs (effect, sensitivity, mirror)
  ui/         HUD meters + FPS counter
  main.ts     composition root + rAF loop
```

The full architectural reasoning lives in `docs-src/adr/`:

- 0001 — Deployment mode (Mode A — pure GitHub Pages)
- 0002 — Architecture overview
- 0003 — Frontend stack (Vite + TS, no UI framework)
- 0006 — Why no Pyodide/librosa in v1, and the WebGPU+GLSL approach
- 0010 — GitHub Pages publishing strategy (`docs/` from `main`)
- 0013 — Testing strategy
- 0016 — Local git hooks (no GitHub Actions)

## Testing

```bash
npm run typecheck    # tsc --noEmit
npm run test         # vitest — audio feature extractor unit tests
npm run smoke        # Playwright headless: build is reachable, no console errors
```

Tests run pre-commit (Husky); `npm run build` and `npm run smoke` run pre-push.
There is no GitHub Actions — see ADR 0016 for the rationale.

## Browser support

- **Chrome/Edge desktop** — WebGPU path. Best experience.
- **Safari (Tech Preview), Firefox** — WebGL2 fallback, identical visual
  behaviour.
- **iOS Safari, Android Chrome** — WebGL2 fallback. Mic + back camera both
  work; expect lower FPS on phones.

WebGPU and WebGL2 are both detected at runtime; the HUD badge shows which path
is live.

## Privacy

Audio and video never leave the tab. There is no analytics, no telemetry, no
backend. Only your preferences (effect, sensitivity, mirror) are written to
`localStorage`.

## License

MIT — see `LICENSE`.
