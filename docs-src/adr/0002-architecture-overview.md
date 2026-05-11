---
title: 0002 - Architecture overview & module boundaries
status: accepted
date: 2026-05-11
---

# 0002 — Architecture overview & module boundaries

## Decision

Three small, sharply separated layers under `src/`:

```
src/
  audio/      # microphone → AudioContext → AudioFeatures snapshot
  media/      # getUserMedia for camera + mic, error mapping
  render/     # WebGPU + WebGL2 paths, WGSL/GLSL shaders, uniform packing
  state/      # localStorage prefs
  ui/         # HUD meters, FPS counter, DOM helpers
  main.ts     # composition root — owns the rAF loop
```

## Rules

- `audio/`, `render/`, and `media/` know nothing about each other or the DOM
  beyond the elements passed in.
- `main.ts` is the only place that wires them together. It also owns lifetime
  (cleanup on `pagehide`).
- Renderers conform to the `Renderer` interface; `createRenderer` picks WebGPU
  if available, otherwise WebGL2. The two implementations share the same
  uniform layout via `render/uniforms.ts`.
- No global mutable state. Everything is constructed in `main.ts` and passed
  in.

## Consequences

- Adding a new effect = add a branch in both shader files and bump
  `EFFECT_INDEX`. The pipeline doesn't change.
- Replacing the audio extractor with (e.g.) a Pyodide+librosa worker = swap
  the `AudioFeatureExtractor` for a wrapper with the same `read()` contract.
