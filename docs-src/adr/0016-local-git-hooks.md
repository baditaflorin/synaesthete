---
title: 0016 - Local git hooks (no GitHub Actions)
status: accepted
date: 2026-05-11
---

# 0016 — Local git hooks (no GitHub Actions)

## Decision

Husky 9 manages local hooks. No GitHub Actions, per the workspace standing
order ("Build locally only", account-wide Actions billing lock).

- **`pre-commit`** runs Prettier `--check`, `tsc --noEmit`, and `vitest run`.
  Fast (~5s for a small codebase); blocks the commit on failure.
- **`pre-push`** runs `npm run build` (must succeed and produce
  `docs/index.html`) and `npm run smoke`.

Hooks are installed by `npm install` (the `prepare` script runs `husky`).

## Consequences

- Contributors who clone the repo and skip `npm install` will not have hooks;
  this is acceptable — CI doesn't exist as a backstop, but the repository owner
  runs the hooks before pushing.
- Hook scripts are checked in under `.husky/` (Husky 9 convention).
