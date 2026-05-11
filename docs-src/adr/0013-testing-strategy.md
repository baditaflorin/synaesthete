---
title: 0013 - Testing strategy
status: accepted
date: 2026-05-11
---

# 0013 — Testing strategy

## Decision

Three layers, each fast enough to run pre-push:

1. **Unit tests** — Vitest over `src/audio/features.ts`. The feature extractor
   is the only piece with non-trivial pure logic; we mock `AnalyserNode` to
   feed in deterministic byte arrays and assert on smoothing, band energies,
   onset detection, chroma normalisation. Renderer code is GPU-bound and not
   profitably unit-tested.
2. **Smoke test** — Playwright (Chromium) drives the built `docs/` served by
   Vite preview. Verifies the app boots, the permission overlay renders, no
   console errors fire on load, and key elements are present.
3. **Manual** — camera/mic permission flow has to be exercised by a human;
   browsers don't expose synthetic prompts in a stable cross-browser way.
   Documented in the README's "Try it" section.

## Out of scope

- WebGPU integration testing (Playwright + headless Chrome's WebGPU is still
  experimental; not stable enough for pre-push).
- End-to-end audio→visual loop (no reliable way to assert pixel output of a
  shader from CI; manual smoke covers it).
