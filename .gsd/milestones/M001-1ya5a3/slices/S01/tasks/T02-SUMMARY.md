---
id: T02
parent: S01
milestone: M001-1ya5a3
provides:
  - Three-column persisted studio shell with custom title bar, resizable panels, shared UI primitives, and polished placeholder content for files, conversation, and editor workflows.
key_files:
  - studio/src/renderer/src/App.tsx
  - studio/src/renderer/src/components/layout/AppLayout.tsx
  - studio/src/renderer/src/components/layout/TitleBar.tsx
  - studio/src/renderer/src/components/layout/PanelHandle.tsx
  - studio/src/renderer/src/components/layout/Sidebar.tsx
  - studio/src/renderer/src/components/layout/CenterPanel.tsx
  - studio/src/renderer/src/components/layout/RightPanel.tsx
  - studio/src/renderer/src/components/ui/Button.tsx
  - studio/src/renderer/src/components/ui/Text.tsx
  - studio/src/renderer/src/components/ui/Icon.tsx
  - studio/src/renderer/src/styles/index.css
  - studio/package.json
key_decisions:
  - Implemented the real `react-resizable-panels` v4.7.3 API (`Group`/`Panel`/`Separator` plus `useDefaultLayout`) instead of the older `PanelGroup`/`PanelResizeHandle` names referenced in research notes.
  - Moved the column top hairline to each panel shell and separated header/content with an inner rule so the three-column top edge reads as one aligned system.
  - Flattened placeholder card radii after live UI review to avoid over-rounded component-kit aesthetics in the desktop shell.
patterns_established:
  - Shared renderer primitives now live under `studio/src/renderer/src/components/ui` and are safe for downstream slices to compose without re-defining button, text, or icon defaults.
  - Resizable layout persistence is handled through `useDefaultLayout({ id, panelIds, storage: window.localStorage })` and the saved state is inspectable in browser localStorage.
  - Panel shells own structural chrome; nested cards stay flatter and lower-contrast so future data UIs inherit a consistent desktop hierarchy.
observability_surfaces:
  - `npm run build -w studio` TypeScript/Vite diagnostics
  - `npm run dev -w studio` boot logs including renderer URL, `[studio] window created`, and `GSD Studio ready`
  - Browser localStorage key `react-resizable-panels:gsd-studio-layout:files:conversation:editor`
  - Browser-visible placeholder surfaces for typography, icon, and code-font regression checks
duration: 56m
verification_result: passed
completed_at: 2026-03-18T01:05:00-05:00
blocker_discovered: false
---

# T02: Three-column resizable layout, custom title bar, and UI primitives with placeholder content

**Shipped the persisted three-column Studio shell with a macOS title bar, flatter placeholder cards, and shared Button/Text/Icon primitives for downstream slices.**

## What Happened

I verified the T01 shell boot path first, then checked the installed `react-resizable-panels` types and found the actual API is `Group`, `Panel`, `Separator`, and `useDefaultLayout` in v4.7.3. I implemented the layout against that real surface instead of forcing the older export names from the research notes.

The renderer now mounts a custom title bar with the macOS traffic-light offset, a draggable region, and restrained accent usage. Under it, the app renders three horizontal panels: collapsible file sidebar, always-visible conversation center, and collapsible editor rail. The panel layout persists through localStorage and exposes a concrete autosave key for future inspection.

I added the shared `Button`, `Text`, and `IconProvider` primitives that later slices can import directly. The placeholder surfaces were designed as real desktop UI, not stubs: a file tree with icon hierarchy and hover states, a conversation surface with typography hierarchy and composer, and a code editor placeholder with line numbers and mono text. After live UI review, I flattened the placeholder card radii and reworked the top column borders so the shell reads cleaner and less like a generic component kit.

## Verification

I ran a production build after implementation and after the visual refinement pass. I also ran the app in dev mode, inspected the rendered shell in the browser, verified the title bar text and panel content, confirmed text input behavior in the composer, dragged a resize separator, and checked the persisted layout state in localStorage.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run dev -w studio` | 124 | ✅ pass | 20s timeout after healthy startup logs |
| 2 | `npm install -w studio @radix-ui/react-slot` | 0 | ✅ pass | ~2s |
| 3 | `npm run build -w studio` | 0 | ✅ pass | ~1.6s |
| 4 | `browser_navigate http://localhost:5173/` + UI assertions | 0 | ✅ pass | ~1m |
| 5 | `browser_drag` on panel separator + `browser_evaluate` localStorage check | 0 | ✅ pass | ~30s |
| 6 | `lsp diagnostics` on new renderer files | 0 | ✅ pass | continuous during implementation |

## Diagnostics

- Run `npm run dev -w studio` from the repo root. Healthy startup still prints the renderer URL plus `[studio] window created` and `GSD Studio ready`.
- Run `npm run build -w studio` to surface renderer import/type/style regressions.
- Inspect layout persistence in browser devtools localStorage under `react-resizable-panels:gsd-studio-layout:files:conversation:editor`.
- The sidebar, conversation panel, and editor panel intentionally expose visible typography, icon, and code surfaces so visual regressions are obvious without backend data.

## Deviations

- The plan referenced `PanelGroup`/`PanelResizeHandle` and `autoSaveId`; the installed library version exposes `Group`/`Separator` and persistence through `useDefaultLayout`. I implemented the same required behavior through the actual v4.7.3 API.
- I applied a live polish correction that was not spelled out in the original plan: flatter card radii and aligned panel-top borders after visual review showed the first pass felt too rounded and structurally inconsistent.

## Known Issues

- The dev renderer still emits a benign 404 for the default missing favicon during browser inspection. It does not affect the shell or build output.
- I verified panel resize persistence directly, but automated browser hover-state inspection for the amber separator treatment is less reliable than the visual screenshot because the separator DOM is minimal and hover CSS is stateful.

## Files Created/Modified

- `studio/src/renderer/src/App.tsx` — replaced the T01 promo shell with the full app layout.
- `studio/src/renderer/src/components/layout/AppLayout.tsx` — added the persisted three-column resizable layout.
- `studio/src/renderer/src/components/layout/TitleBar.tsx` — added the macOS-aware draggable title bar.
- `studio/src/renderer/src/components/layout/PanelHandle.tsx` — added the custom separator handle styling.
- `studio/src/renderer/src/components/layout/Sidebar.tsx` — added the file tree placeholder panel.
- `studio/src/renderer/src/components/layout/CenterPanel.tsx` — added the conversation placeholder panel and composer.
- `studio/src/renderer/src/components/layout/RightPanel.tsx` — added the editor placeholder panel.
- `studio/src/renderer/src/components/ui/Button.tsx` — added shared button primitive with variants, sizing, and `asChild` support.
- `studio/src/renderer/src/components/ui/Text.tsx` — added shared typography primitive.
- `studio/src/renderer/src/components/ui/Icon.tsx` — added shared Phosphor icon defaults provider.
- `studio/src/renderer/src/styles/index.css` — ensured the root fills the viewport cleanly for the full-screen shell.
- `studio/package.json` — added `@radix-ui/react-slot` dependency.
- `.gsd/milestones/M001-1ya5a3/slices/S01/S01-PLAN.md` — added task descriptions and observability/verification detail, then marked T02 complete.
- `.gsd/milestones/M001-1ya5a3/slices/S01/tasks/T02-PLAN.md` — added the missing observability impact section.
- `.gsd/STATE.md` — advanced execution state to the next task.
