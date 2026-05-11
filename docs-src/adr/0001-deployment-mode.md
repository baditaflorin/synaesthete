---
title: 0001 - Deployment mode is Mode A (pure GitHub Pages)
status: accepted
date: 2026-05-11
---

# 0001 — Deployment mode

## Status

Accepted.

## Context

Synaesthete turns live microphone input into responsive shader transforms of the
camera feed. Every input is local to the user's device. Every output is a single
WebGL2 / WebGPU canvas painting at frame-rate. There is no shared state between
users, no account, no persistent server-side data, and no third-party API the
browser cannot hit directly with anonymous credentials.

## Decision

**Mode A — pure GitHub Pages.** The whole app is shipped as static assets from
`docs/`. No backend at runtime, no build-time data pipeline (Mode B), no Docker
(Mode C).

## Consequences

- No runtime API surface, no auth, no privacy review beyond "the browser is the
  only place audio goes".
- Pages serves `docs/`. The `docs/` directory is built locally and committed
  (consistent with this workspace's "Build locally only" convention — no GitHub
  Actions).
- We use `vite build` with `base: '/synaesthete/'` so the bundle works at
  `https://baditaflorin.github.io/synaesthete/`.
- §3, §8, §9, §10 (backend, Docker, deploy, nginx) of the meta-prompt are
  intentionally absent.

## Alternatives considered

- **Mode B (build-time data).** There is no data corpus to precompute.
  Rejected.
- **Mode C (runtime backend).** Would require justifying why audio/video
  analysis can't run client-side. It can, with margin. Rejected.
