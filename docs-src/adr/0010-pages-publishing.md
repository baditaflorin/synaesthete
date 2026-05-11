---
title: 0010 - GitHub Pages publishing strategy
status: accepted
date: 2026-05-11
---

# 0010 — GitHub Pages publishing strategy

## Status

Accepted.

## Context

The Pages site needs to be served from somewhere. Options:

1. `gh-pages` branch (built artefact lives off `main`).
2. `main` / root.
3. `main` / `docs` folder.

This workspace has had account-wide GitHub Actions billing locks before, so we
build locally and commit the artefact rather than relying on Actions. That rules
out option 1 (which is usually populated by CI).

## Decision

- Pages serves **`main` / `docs/`**.
- `vite build` is configured with `outDir: 'docs'` and `base: '/synaesthete/'`,
  producing a directory that Pages can serve verbatim.
- Source documentation lives in `docs-src/` to avoid being clobbered by the
  build (and to keep the build directory contract simple: "everything in `docs/`
  is generated").
- Asset filenames are content-hashed via Vite's default `[name].[hash][extname]`
  pattern, so we get cache-busting for free.
- A `404.html` fallback is not currently needed — there is no client-side
  router. If routing is added later, copy `index.html` to `docs/404.html` in the
  build script.

## Consequences

- `.gitignore` does **not** ignore `docs/`. The pre-push hook is responsible
  for ensuring `docs/index.html` exists and is valid.
- Contributors must run `npm run build` before pushing (covered by the
  `pre-push` Husky hook).
- The Pages URL is `https://baditaflorin.github.io/synaesthete/`. The `base`
  config has to match the repo name; if the repo is renamed, update
  `vite.config.ts`.

## Alternatives considered

- **gh-pages branch.** Rejected — relies on CI.
- **Custom domain.** Out of scope for v1; can be added by writing `docs/CNAME`
  later.
