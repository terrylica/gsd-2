# S01: Electron Shell + Design System Foundation

## Goal

Establish the desktop shell, renderer theming contract, and foundational UI/layout primitives that every later slice builds on. This slice must leave the Studio app running as a polished Electron surface rather than an empty scaffold.

## Tasks

- [x] **T01: Scaffold Electron project with electron-vite, React, Tailwind v4, and design system tokens**
  - **Why:** Create the Electron workspace, renderer build pipeline, font assets, preload bridge stubs, and token system that all UI slices depend on.
  - **Files:** `package.json`, `studio/package.json`, `studio/electron.vite.config.ts`, renderer style/token files, preload/main bootstrap.
  - **Do:** Stand up a working `electron-vite` app with React 19, Tailwind v4 theme tokens, bundled Inter + JetBrains Mono fonts, and a smoke-testable dark shell.
  - **Verify:** `npm run test -w studio`, `npm run build -w studio`, and `npm run dev -w studio` show a healthy renderer URL and `[studio] window created` / `GSD Studio ready` logs.

- [x] **T02: Three-column resizable layout, custom title bar, and UI primitives with placeholder content**
  - **Why:** Replace the bootstrap marketing shell with the actual desktop application frame used by future conversation, filesystem, and editor slices.
  - **Files:** `studio/src/renderer/src/App.tsx`, `studio/src/renderer/src/components/layout/*`, `studio/src/renderer/src/components/ui/*`, `studio/src/renderer/src/styles/index.css`, `studio/package.json`.
  - **Do:** Implement a macOS-aware title bar, a persisted three-column `react-resizable-panels` layout, Phosphor-backed UI primitives, and realistic placeholder surfaces for files, conversation, and editor panels.
  - **Verify:** `npm run build -w studio` passes; `npm run dev -w studio` renders three visible columns with draggable amber resize handles, a draggable title bar, and placeholder content that survives resize/collapse interactions.

## Observability / Diagnostics

- Electron dev startup must continue to emit the renderer dev server URL plus `[studio] window created`, `[studio] preload loaded`, and `GSD Studio ready` so shell boot regressions are visible from the terminal.
- The renderer should fail loudly through Vite/TypeScript diagnostics during `npm run build -w studio`; no silent CSS/token/layout failures should be masked.
- Layout persistence is inspectable through browser devtools localStorage under the `react-resizable-panels:gsd-studio-layout` key (or the library’s current autosave key format) after a panel resize.
- Title bar drag region and resize handles are inspectable in DOM/CSS via browser automation: handles must expose hover/active visual state and the title bar must preserve a non-interactive drag surface except for explicit controls.
- Placeholder panels should surface typography, iconography, and code-font rendering directly in the UI so future regressions are visible without connecting backend data.
- Redaction constraint: no task in this slice should log secrets or environment values; diagnostics are limited to boot state, layout state, and renderer/build errors.

## Verification

- `npm run test -w studio`
- `npm run build -w studio`
- `npm run dev -w studio` and verify the terminal shows the expected Electron/preload/window logs.
- Browser/UI verification of the rendered shell confirms title bar text, three-column layout, and placeholder panel content.
- Failure-path check: if the renderer/build is broken, `npm run build -w studio` or the dev server output must expose the concrete TypeScript/Vite/Electron error without requiring manual guesswork.
