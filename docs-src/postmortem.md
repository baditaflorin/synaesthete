# Synaesthete v0.1.0 — postmortem

**Date:** 2026-05-11
**Time spent:** ~one session (~90 minutes scaffold + implement + verify).

## What was built

A static site that captures camera + microphone, computes seven audio features
in real time (RMS loudness, bass/mid/treble band energies, spectral centroid,
spectral-flux onset envelope + discrete hits, chroma argmax, bloom envelope),
and uses them to drive a fragment shader that paints the camera feed every
frame. The renderer prefers WebGPU and falls back to WebGL2 with an identical
shader written in two dialects.

Five composable effect modes (Prism, Ripple, Bloom, Kaleidoscope, Combined)
selectable from a glass HUD. Preferences persist to `localStorage`. PWA
manifest + favicon shipped.

Built artefact lives in `docs/` (~24 KB JS, 9 KB gzipped) and is committed to
`main` for GitHub Pages.

## Was Mode A correct in hindsight?

Yes — emphatically. There is literally no shared state between users, no
secret to protect, no API to call. The temptation to spin up a backend would
have only added attack surface. The full pipeline runs in the browser comfortably.

## What worked

- **Single fragment shader, two dialects.** Keeping WGSL and GLSL effect logic
  in sync by writing them in the same idiom (uniforms struct → branchy
  effect mode → shared HSV helpers) made the WebGL2 fallback essentially free.
- **AnalyserNode-only audio extraction.** Skipping Pyodide/librosa cut ~10 MB
  off the payload and made unit testing trivial — we mock `getByteFrequencyData`
  with a fixed `Uint8Array` and assert on smoothing/onset/chroma directly.
- **`importExternalTexture` for WebGPU.** No texture upload step, no
  per-frame copy; the GPU samples the video frame directly.
- **Fast iteration loop.** Vite dev + Vitest + Playwright smoke is under a
  second to run end-to-end pre-push.

## What didn't work the first time

- **Vite preview's `outDir`/`base` defaults.** `vite preview` ignores
  `defineConfig`'s function-form `base` because it computes config without the
  same `command` context, then silently SPA-falls-back missing assets to
  `index.html` — which Chromium then refuses to evaluate as a module. Symptom
  was a 404 on the JS bundle even though `curl` returned 200 (the HTML
  fallback). Fixed by passing `--outDir docs --base /synaesthete/` explicitly
  to both `npm run preview` and the smoke script.
- **TypeScript 5.7 typed `Uint8Array` more strictly.** `new Uint8Array(n)`
  produces `Uint8Array<ArrayBuffer>` but a plain field annotation widens to
  `Uint8Array<ArrayBufferLike>`, which breaks the call to
  `analyser.getByteFrequencyData`. Annotated explicitly.

## Tech debt accepted

- **No e2e audio→pixel verification.** Headless Chromium can't easily feed a
  fake audio stream into a live `MediaStream`; we rely on unit tests for the
  feature extractor and manual verification for the renderer.
- **Effect implementation lives in two files.** Adding a new effect means
  editing both `effects.wgsl` and `effects.glsl`. A small shader-templating
  step could deduplicate, but the cost (one more build dependency) outweighs
  the benefit at v1.
- **No service worker / installable PWA install prompt.** Manifest is shipped
  but no SW yet — adds installability + offline shell. Cheap follow-up.
- **No keyboard shortcut for HUD toggle.** Accessibility-correct but a power
  user would want `H` or `?`.

## Next 3 most valuable improvements

1. **Pyodide-backed "Studio mode"** behind a toggle for true librosa parity
   (chroma_cqt, MFCC, beat tracking). Would deliver the originally-pitched
   librosa angle without paying its 10 MB cost on first load.
2. **Effect templating.** A `effects.shader.txt` source-of-truth that
   generates `effects.wgsl` and `effects.glsl` at build time. Removes the
   "edit both files" footgun.
3. **Recording / share.** `MediaRecorder` to capture canvas + mic into a
   downloadable WebM. Listed as a non-goal for v1 but is the obvious "wow"
   feature to ship next.

## Time spent vs estimate

No prior estimate. Actual time was bounded by `npm install` (~13 s) and
Playwright Chromium reuse from the workspace cache (~0 s). The Vite preview
base-path bug ate about 10 minutes; everything else was as expected.
