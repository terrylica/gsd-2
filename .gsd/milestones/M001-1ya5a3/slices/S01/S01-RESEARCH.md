# S01: Electron Shell + Design System Foundation — Research

**Date:** 2026-03-18

## Summary

S01 delivers the Electron desktop shell, three-column resizable layout, and the full design system that every subsequent slice builds on. The technology stack is well-understood: electron-vite (v5) for the build pipeline, React 19 + TypeScript in the renderer, Tailwind v4 CSS-first configuration for the design tokens, Radix primitives for accessible UI, react-resizable-panels for the three-column layout, and Phosphor Icons.

The main risk is getting the project scaffolding right — electron-vite imposes a specific directory structure (`src/main/`, `src/preload/`, `src/renderer/`) and the design system must be defined in Tailwind v4's CSS-first `@theme` block rather than a traditional `tailwind.config.js`. The font loading story (Inter + JetBrains Mono) needs to work in Electron's renderer without external network requests — fonts should be bundled as local assets. There are no novel unknowns; this is a scaffolding + design foundation slice.

## Recommendation

Use **electron-vite** as the build tool (not raw Vite + vite-plugin-electron). electron-vite provides a single `electron.vite.config.ts` that configures main, preload, and renderer builds with HMR out of the box. The studio app should live at `studio/` in the repo root and be added to the root `package.json` workspaces array. This gives it access to `@gsd/pi-coding-agent` for RPC types (consumed in S02) while keeping it isolated from the CLI build.

Use **Tailwind v4** with `@tailwindcss/vite` plugin in the renderer Vite config. Define the full color palette, typography scale, and spacing system in a `@theme` block in the main CSS file — no `tailwind.config.js` needed. This is cleaner and gives us CSS custom properties that Radix components and Monaco can reference.

Use **react-resizable-panels** (v4.7+) for the three-column layout. It handles the Group/Panel/Separator pattern, supports pixel min/max constraints, collapsible panels, and localStorage persistence via the `useDefaultLayout` hook.

## Implementation Landscape

### Key Files to Create

- `studio/package.json` — `@gsd/studio`, private, depends on electron, electron-vite, react, tailwindcss, @tailwindcss/vite, @radix-ui/*, react-resizable-panels, @phosphor-icons/react, zustand
- `studio/electron.vite.config.ts` — electron-vite config with three builds (main/preload/renderer). Renderer config includes `@tailwindcss/vite` and `@vitejs/plugin-react`
- `studio/src/main/index.ts` — Electron main process: `app.whenReady()`, `BrowserWindow` creation with preload, IPC handler stubs for S02. Window config: frameless/custom title bar or native with `titleBarStyle: 'hiddenInset'` for macOS
- `studio/src/preload/index.ts` — `contextBridge.exposeInMainWorld('studio', { ... })` exposing typed IPC channels. Stubs for `gsd:event`, `gsd:send-command`, `gsd:spawn`, `gsd:status` (wired in S02)
- `studio/src/renderer/index.html` — Minimal HTML entry: `<div id="root">`, loads `src/main.tsx`
- `studio/src/renderer/src/main.tsx` — React root render, imports global CSS
- `studio/src/renderer/src/App.tsx` — Root component: `<PanelGroup>` with three panels (sidebar, center, right)
- `studio/src/renderer/src/styles/index.css` — `@import "tailwindcss"` + `@theme { }` block defining the full design system
- `studio/src/renderer/src/components/layout/AppLayout.tsx` — Three-column layout using `react-resizable-panels` Group/Panel/Separator
- `studio/src/renderer/src/components/layout/Sidebar.tsx` — Left panel placeholder (file tree goes here in S06)
- `studio/src/renderer/src/components/layout/CenterPanel.tsx` — Center conversation panel placeholder
- `studio/src/renderer/src/components/layout/RightPanel.tsx` — Right editor/preview panel placeholder
- `studio/src/renderer/src/components/layout/PanelHandle.tsx` — Custom-styled drag handle for Separator (amber accent on hover)
- `studio/src/renderer/src/components/layout/TitleBar.tsx` — Custom title bar with app name, traffic light offset, session controls placeholder
- `studio/src/renderer/src/components/ui/Button.tsx` — Core button primitive (Radix Slot pattern for polymorphism, Tailwind variants)
- `studio/src/renderer/src/components/ui/Text.tsx` — Typography component with preset variants (heading, body, label, code)
- `studio/src/renderer/src/components/ui/Icon.tsx` — Thin wrapper around Phosphor icons with default context (size, weight, color)
- `studio/src/renderer/src/lib/theme/tokens.ts` — TypeScript constants mirroring CSS custom properties for programmatic access (used by Monaco theme in S06, Shiki theme in S03)
- `studio/src/renderer/src/assets/fonts/` — Inter and JetBrains Mono font files (woff2), loaded via `@font-face` in the CSS

### Design System Specification

The `@theme` block in `index.css` should define:

**Colors (CSS custom properties):**
- `--color-bg-primary`: `#0a0a0a` (near-black base)
- `--color-bg-secondary`: `#111111` (panels, cards)
- `--color-bg-tertiary`: `#1a1a1a` (elevated surfaces)
- `--color-bg-hover`: `#222222` (hover states)
- `--color-border`: `#262626` (subtle borders)
- `--color-border-active`: `#333333` (focused borders)
- `--color-text-primary`: `#e5e5e5` (primary text)
- `--color-text-secondary`: `#a3a3a3` (secondary text)
- `--color-text-tertiary`: `#737373` (muted text)
- `--color-accent`: `#d4a04e` (warm amber/gold — the signature color)
- `--color-accent-hover`: `#e0b366` (lighter amber on hover)
- `--color-accent-muted`: `rgba(212, 160, 78, 0.15)` (amber wash for backgrounds)

**Typography:**
- `--font-sans`: `'Inter', system-ui, sans-serif`
- `--font-mono`: `'JetBrains Mono', ui-monospace, monospace`
- Type scale: 11px, 12px, 13px, 14px, 16px, 20px, 24px, 32px

**Spacing:** 4px base unit grid

### Build Order

1. **Scaffold the project** — `studio/package.json`, `electron.vite.config.ts`, directory structure, add `"studio"` to root workspaces. Run `npm install` from root.
2. **Electron main + preload** — BrowserWindow creation, preload with contextBridge stubs. Verify: `npm run dev -w studio` opens a window.
3. **React renderer + Tailwind** — `index.html`, `main.tsx`, `App.tsx`, CSS with `@import "tailwindcss"` and `@theme` block. Verify: window shows styled content.
4. **Font loading** — Bundle Inter and JetBrains Mono woff2 files, `@font-face` declarations. Verify: fonts render in the window.
5. **Three-column layout** — `AppLayout.tsx` with react-resizable-panels, custom separator handles, panel placeholders. Verify: panels resize, drag handles show amber on hover.
6. **Title bar** — Custom title bar component with macOS traffic light offset. Verify: app looks native.
7. **UI primitives** — Button, Text, Icon components. Verify: rendered in placeholder panels with correct styles.
8. **Phosphor Icons** — IconContext provider with default theme values. Verify: icons render at correct size/weight.

### Verification Approach

1. `cd studio && npm run dev` launches the Electron window with no errors
2. The window shows three resizable columns with drag handles
3. Dragging handles resizes panels; handles show amber accent on hover
4. Inter font renders in UI text, JetBrains Mono renders in code-styled elements
5. Phosphor icons render at correct size and weight
6. All placeholder panels show styled placeholder content with correct colors
7. HMR works — editing a React component hot-reloads without restarting
8. `npm run build -w studio` produces a working production build in `studio/out/`

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Electron + Vite build pipeline | `electron-vite` (v5) | Handles main/preload/renderer builds, HMR, and dev server in one config. No need to wire Vite plugins manually. |
| Resizable panel layout | `react-resizable-panels` (v4.7) | Handles drag, keyboard, min/max constraints, localStorage persistence, collapse. Well-tested. |
| Accessible UI primitives | `@radix-ui/*` | Headless, zero-style primitives. Dialog, Tooltip, DropdownMenu, etc. for future slices. S01 only needs the dependency installed. |
| Icon library | `@phosphor-icons/react` (v2.1) | Tree-shakeable, typed, consistent geometric style. `IconContext` for global defaults. |
| CSS framework | `tailwindcss` v4 + `@tailwindcss/vite` | CSS-first config, no JS config file, generates CSS custom properties from `@theme` block. |

## Constraints

- **electron-vite directory convention**: Must use `src/main/`, `src/preload/`, `src/renderer/` structure for zero-config. Custom paths require explicit `rollupOptions.input` in each build section.
- **Tailwind v4 has no `tailwind.config.js`**: All theme customization goes in the CSS `@theme` block. This is a new pattern — no JS-side theme object. TypeScript token constants must be manually synced with CSS variables.
- **Fonts must be local**: Electron apps should not depend on Google Fonts CDN. Bundle woff2 files and use `@font-face` with relative paths.
- **Preload script runs in isolated context**: Cannot import renderer modules. Must use `contextBridge.exposeInMainWorld()` to expose IPC channels. TypeScript types can be shared via a `studio/src/shared/` directory.
- **electron-vite v5 requires `@swc/core`**: peer dependency — must be installed.
- **Root workspace**: `studio/` must be added to root `package.json` `"workspaces"` array to access `@gsd/pi-coding-agent` types in S02.

## Common Pitfalls

- **Tailwind classes not working in Electron renderer** — The `@tailwindcss/vite` plugin must be added to the `renderer` section of `electron.vite.config.ts`, not the top level. electron-vite has separate Vite configs per process.
- **Context isolation breaks direct IPC** — Cannot use `ipcRenderer` directly in renderer. Must go through `contextBridge` in preload. This is secure but means all IPC channels need explicit exposure.
- **react-resizable-panels API changed in v4** — The library now uses `Group`, `Panel`, `Separator` (not `PanelGroup`, `Panel`, `PanelResizeHandle`). Import names matter. Docs show the v4 API.
- **Font loading flash** — If fonts are loaded asynchronously, there's a brief flash of fallback font. Use `font-display: block` in `@font-face` declarations and preload the font files via `<link rel="preload">` in `index.html`.
- **macOS title bar** — `titleBarStyle: 'hiddenInset'` gives native traffic lights but overlaps content. Need `CSS: padding-top` or `-webkit-app-region: drag` to create a drag region that doesn't overlap the layout.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Electron | `jezweb/claude-skills@electron-base` (267 installs) | available |
| Electron | `jwynia/agent-skills@electron-best-practices` (112 installs) | available |
| Tailwind v4 | `jezweb/claude-skills@tailwind-v4-shadcn` (2.7K installs) | available (shadcn-oriented, partial relevance) |
| Radix | `yonatangross/orchestkit@radix-primitives` (42 installs) | available |
