---
title: 0006 - WASM, shaders, and the librosa question
status: accepted
date: 2026-05-11
---

# 0006 — WASM, shaders, and the librosa question

## Context

The pitch mentioned `librosa`. librosa is a Python library; running it in the
browser means Pyodide (~10MB WASM payload) plus a worker, plus a copy of NumPy.
That cost is worth paying only if the features it provides cannot be
approximated cheaply with `AnalyserNode`.

## Decision

- **No Pyodide / librosa in v1.** All audio features are computed from
  `AnalyserNode` byte arrays in `src/audio/features.ts`:
  RMS loudness, band energies (bass/mid/treble), spectral centroid
  (brightness), spectral flux with adaptive baseline (onset envelope), discrete
  hits, and a 12-bin chroma vector with argmax-derived hue.
- **WebGPU (WGSL) is the primary renderer.** WebGL2 (GLSL ES 3.00) is the
  fallback for Safari and older browsers. Both share the same uniform layout
  and effect indices so behaviour is consistent across paths.
- **No COOP/COEP needed.** `importExternalTexture` and `texImage2D` from a
  same-origin video element are both allowed without cross-origin isolation.

## Consequences

- v1 ships with a tiny audio pipeline (<3KB of TypeScript) instead of a 10MB
  WASM payload. Loadtime stays fast; the "5 sound features" success metric is
  met (loudness, onset, brightness, bass, chroma — plus mid, treble, bloom
  envelope as bonuses).
- A future v2 could mount Pyodide in a Web Worker behind a "studio mode"
  toggle for true librosa parity (chroma_cqt, MFCC, beat_track) without
  changing the renderer interface.
