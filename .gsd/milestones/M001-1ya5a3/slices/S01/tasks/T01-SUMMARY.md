---
id: T01
parent: S01
milestone: M001-1ya5a3
provides:
  - Electron + electron-vite studio workspace scaffold with React 19, Tailwind v4 theme tokens, bundled fonts, and typed preload bridge stubs
key_files:
  - package.json
  - studio/package.json
  - studio/electron.vite.config.ts
  - studio/src/main/index.ts
  - studio/src/preload/index.ts
  - studio/src/renderer/src/styles/index.css
  - studio/src/renderer/src/App.tsx
key_decisions:
  - Aligned electron-vite v5 with @vitejs/plugin-react v5 to satisfy the current Vite peer range instead of forcing a broken Vite 8 combo
  - Added a local token smoke test so theme/font contract drift is caught before UI slices build on it
patterns_established:
  - Electron workspace packages need an explicit `main` field for electron-vite v5 dev startup
  - Design tokens are defined once in Tailwind v4 `@theme` CSS and mirrored in TypeScript for renderer-side programmatic consumers
observability_surfaces:
  - `npm run dev -w studio` stdout logs `[studio] preload loaded`, `[studio] window created`, and `GSD Studio ready`
  - `npm run build -w studio`
  - `npm run test -w studio`
duration: 37m
verification_result: passed
completed_at: 2026-03-18T00:37:00-05:00
blocker_discovered: false
---

# T01: Scaffold Electron project with electron-vite, React, Tailwind v4, and design system tokens

**Scaffolded the `studio` Electron workspace with a working electron-vite/React/Tailwind pipeline, bundled font assets, typed preload stubs, and a verified dark theme shell.**

## What Happened

Loaded the frontend-design skill first, then fixed the pre-flight plan gaps by adding explicit startup diagnostics to the slice verification, reducing the task estimate footprint, and documenting observability for this runtime-facing scaffold.

Built the new `studio/` workspace from scratch: package metadata, electron-vite config, TypeScript project references, Electron main process, preload bridge types/stubs, renderer entry HTML/TSX, theme CSS, programmatic tokens, and a minimal React app that visibly proves the font stack and amber-on-black palette.

Bundled five local woff2 files for Inter and JetBrains Mono instead of relying on CDN delivery. Added a small node test that checks the required CSS tokens and `font-display: block` declarations so future slices inherit a guarded theme contract.

During verification, `npm install` initially failed because `@vitejs/plugin-react` v6 pulled Vite 8 while `electron-vite` v5 peers only through Vite 7. Fixed the actual incompatibility by pinning the React plugin back to the v5 line. The first dev run then failed because electron-vite v5 requires a `main` field in `studio/package.json`; adding that resolved startup cleanly.

## Verification

Verified workspace installation from the repo root, ran the studio smoke test, ran production builds both via the root workspace command and from inside `studio/`, and exercised the live dev flow until Electron launched and emitted the expected startup logs.

Visual verification was completed against the launched window: the dark background, Inter UI typography, JetBrains Mono code styling, and amber accent all rendered correctly.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm install` | 0 | ✅ pass | 3m30s + 4s retry |
| 2 | `npm run test -w studio` | 0 | ✅ pass | 0.04s |
| 3 | `npm run build -w studio` | 0 | ✅ pass | 1.67s |
| 4 | `cd studio && npm run build` | 0 | ✅ pass | 1.67s |
| 5 | `cd studio && npm run dev` | 0 | ✅ pass | 120s observed; startup logs reached ready state |

## Diagnostics

Use `npm run dev -w studio` from the repo root to inspect runtime behavior. Healthy startup prints the renderer dev server URL followed by `[studio] window created` and `GSD Studio ready`. The preload script also logs `[studio] preload loaded` in the Electron process. Theme/token regressions can be checked quickly with `npm run test -w studio`, and packaging/build regressions surface through `npm run build -w studio`.

## Deviations

Created `.gsd/milestones/M001-1ya5a3/slices/S01/S01-PLAN.md` and `.gsd/STATE.md` because those required bookkeeping files were not present in this checkout even though the execution contract required updating them.

## Known Issues

The renderer bundle is currently large for a scaffold (`index` JS ~575 kB). That is acceptable for T01, but later slices should keep an eye on renderer bundle growth as Monaco/Shiki land.

## Files Created/Modified

- `package.json` — added `studio` to the root npm workspaces
- `studio/package.json` — created the Electron workspace package, scripts, and dependency set
- `studio/tsconfig.json` — created the TypeScript project reference root
- `studio/tsconfig.node.json` — configured strict TS for main/preload
- `studio/tsconfig.web.json` — configured strict TS for the renderer with `@/` aliasing
- `studio/electron.vite.config.ts` — configured main, preload, and renderer builds with Tailwind in renderer only
- `studio/src/main/index.ts` — added BrowserWindow bootstrap and startup logging
- `studio/src/preload/index.ts` — exposed typed `window.studio` bridge stubs and preload logging
- `studio/src/preload/index.d.ts` — declared the renderer-side `window.studio` type
- `studio/src/renderer/index.html` — added the renderer root and font preload tags
- `studio/src/renderer/src/main.tsx` — bootstrapped the React renderer
- `studio/src/renderer/src/App.tsx` — built the dark-shell proof UI
- `studio/src/renderer/src/styles/index.css` — defined local fonts, Tailwind v4 theme tokens, base styling, and scrollbar treatment
- `studio/src/renderer/src/lib/theme/tokens.ts` — mirrored the CSS theme contract in TypeScript
- `studio/src/renderer/src/assets/fonts/Inter-Regular.woff2` — bundled local UI font asset
- `studio/src/renderer/src/assets/fonts/Inter-Medium.woff2` — bundled local UI font asset
- `studio/src/renderer/src/assets/fonts/Inter-SemiBold.woff2` — bundled local UI font asset
- `studio/src/renderer/src/assets/fonts/JetBrainsMono-Regular.woff2` — bundled local code font asset
- `studio/src/renderer/src/assets/fonts/JetBrainsMono-Medium.woff2` — bundled local code font asset
- `studio/test/tokens.test.mjs` — added scaffold-level token/font smoke tests
- `.gsd/milestones/M001-1ya5a3/slices/S01/S01-PLAN.md` — marked T01 complete in the expected auto-mode location
- `.gsd/STATE.md` — recorded the current execution state and next task
