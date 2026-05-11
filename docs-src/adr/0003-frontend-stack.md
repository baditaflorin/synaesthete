---
title: 0003 - Frontend framework & build tooling
status: accepted
date: 2026-05-11
---

# 0003 — Frontend framework & build tooling

## Decision

- **Vite 6 + TypeScript (strict)**. No UI framework.
- No React/Vue/Svelte: the whole "UI" is one canvas, a permission overlay, and
  a HUD with five widgets. A framework would add weight (>30KB gzipped) for no
  benefit; the bundle target is <200KB gzipped first-load per §5.
- **Vitest** for unit tests (shares Vite's resolver, fast).
- **Playwright** for the headless smoke test (page loads, button is clickable,
  canvas is non-zero, no console errors).
- **Prettier** + the TypeScript compiler for formatting / typechecking;
  ESLint with `@typescript-eslint`.
- `@webgpu/types` for type definitions; `?raw` Vite imports for shader files.

## Consequences

- Bundle is tiny — initial download is essentially the bootstrapping JS plus
  the two shader strings.
- We trade ecosystem ergonomics (no JSX, no router, no state library) for
  ~150KB of headroom and a much simpler test surface.
