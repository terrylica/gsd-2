---
id: S04
parent: M001-1ya5a3
milestone: M001-1ya5a3
provides:
  - Enhanced ToolUseBlock type with structured content/details/isError/partialResult fields
  - tool_execution_update event handler for streaming partial results
  - ToolCard shell with CSS grid-rows 0fr↔1fr expand/collapse animation
  - EditCard with custom diff parser and Diff.diffWords() intra-line word-level highlighting
  - BashCard with terminal-styled monospace output and 5-line collapsed preview
  - WriteCard with syntax-highlighted content via Streamdown code-fence wrapping
  - ReadCard with syntax-highlighted content, line range display, truncation warnings
  - SearchCard handling grep/find/ls/glob with per-tool headers and result counts
  - LspCard with action name + file + monospace results
  - GenericCard as crash-proof fallback for all unrecognized tool types
  - ToolCardDispatcher barrel routing tool names to correct card components
  - getLanguageFromPath utility mapping 30+ file extensions to Shiki language IDs
  - MessageStream wired to ToolCardDispatcher, ToolStub import removed
requires:
  - slice: S03
    provides: MessageStream container, Streamdown/Shiki rendering pipeline, buildMessageBlocks, session-store events
affects:
  - S05 (prompts rendered inline in same message stream alongside tool cards)
  - S07 (tool card file links will trigger editor open in final integration)
key_files:
  - studio/src/renderer/src/lib/message-model.ts
  - studio/test/message-model.test.mjs
  - studio/src/renderer/src/components/tool-cards/ToolCard.tsx
  - studio/src/renderer/src/components/tool-cards/DiffView.tsx
  - studio/src/renderer/src/components/tool-cards/EditCard.tsx
  - studio/src/renderer/src/components/tool-cards/BashCard.tsx
  - studio/src/renderer/src/components/tool-cards/WriteCard.tsx
  - studio/src/renderer/src/components/tool-cards/ReadCard.tsx
  - studio/src/renderer/src/components/tool-cards/SearchCard.tsx
  - studio/src/renderer/src/components/tool-cards/LspCard.tsx
  - studio/src/renderer/src/components/tool-cards/GenericCard.tsx
  - studio/src/renderer/src/components/tool-cards/index.tsx
  - studio/src/renderer/src/lib/lang-map.ts
  - studio/src/renderer/src/styles/index.css
  - studio/src/renderer/src/components/message-stream/MessageStream.tsx
  - studio/package.json
key_decisions:
  - CSS grid-rows 0fr↔1fr for expand/collapse animation — children always rendered (not conditional) so the grid transition can measure content height
  - ToolCardDispatcher uses switch with case-insensitive aliases rather than a map — clearer for ~12 cases with natural alias grouping
  - WriteCard/ReadCard reuse Streamdown+codePlugin by wrapping content in markdown code fences — zero new Shiki wiring
  - DiffView parses diff lines in a single pass, batching consecutive removed/added lines to detect 1:1 pairs for intra-line Diff.diffWords() highlighting
  - GenericCard wraps all rendering in try/catch — crash-proof fallback that never breaks the message stream
  - async_bash routed to BashCard alongside bash — same visual treatment for background shell commands
patterns_established:
  - Tool card component pattern — receive full ToolUseBlock, extract args/content/details, pass headerContent+children to ToolCard shell
  - Error state pattern — check block.isError, extract error text from block.content (first text entry) with block.result string fallback
  - CSS grid-rows 0fr↔1fr transition for smooth expand/collapse without JS height measurement
  - Per-tool header builders in SearchCard for tool-specific collapsed summaries
observability_surfaces:
  - data-tool-name and data-tool-status DOM attributes on every ToolCard for DevTools filtering
  - document.querySelectorAll('[data-tool-status="error"]') surfaces all error-state cards
  - buildMessageBlocks(useSessionStore.getState().events) in console shows blocks with content/details/isError/partialResult
  - GenericCard renders fallback text on failure rather than crashing
  - ToolStub.tsx remains on disk but is dead code — zero imports from active components
drill_down_paths:
  - .gsd/milestones/M001-1ya5a3/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001-1ya5a3/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001-1ya5a3/slices/S04/tasks/T03-SUMMARY.md
duration: 52min
verification_result: passed
completed_at: 2026-03-18T07:47:00-06:00
---

# S04: Tool Cards — The Art

**Bespoke collapsed/expandable tool cards for all major tool types — Edit with intra-line diff highlighting, Bash with terminal styling, Write/Read with Shiki syntax highlighting, Search with per-tool headers, LSP with action display, and crash-proof GenericCard fallback — wired into the message stream replacing ToolStub placeholders**

## What Happened

Three tasks built the complete tool card system from foundation to integration.

**T01 (foundation)** installed the `diff` library, enhanced `ToolUseBlock` with structured result fields (`content`, `details`, `isError`, `partialResult`), added `tool_execution_update` handling for streaming partial results, built the shared `ToolCard` shell with CSS `grid-template-rows: 0fr → 1fr` expand/collapse animation and Phosphor status icons, created `getLanguageFromPath()` mapping 30+ extensions to Shiki language IDs, and added diff line background CSS classes. Four new tests cover partial result accumulation, structured result extraction, isError detection, and backward-compat plain string results.

**T02 (core cards)** built the three highest-frequency card components. `DiffView` parses the custom diff format in a single pass, batching consecutive removed→added lines to detect 1:1 pairs for `Diff.diffWords()` intra-line highlighting. `EditCard` shows a shortened file path + `:firstChangedLine` + diff summary in collapsed state, with DiffView in expanded body. `BashCard` renders `$ command` in monospace with a 5-line preview collapsed, full terminal-styled output expanded, and truncation warnings. `WriteCard` wraps file content in a markdown code fence and renders through Streamdown/codePlugin — reusing all existing Shiki infrastructure with zero new wiring.

**T03 (remaining cards + integration)** completed the card set with `ReadCard` (syntax-highlighted content with line range labels), `SearchCard` (handles grep/find/ls/glob with per-tool header builders), `LspCard` (action + file + monospace results), and `GenericCard` (crash-proof JSON args display). The `ToolCardDispatcher` barrel routes tool names to the correct component via a switch statement with case-insensitive aliases. MessageStream was updated to import and render `ToolCardDispatcher` instead of `ToolStub`.

All cards follow the same component pattern: receive full `ToolUseBlock`, extract args/content/details, render running/done/error states, and pass header content + children to the shared ToolCard shell. Every card inherits `data-tool-name` and `data-tool-status` DOM attributes for DevTools inspection.

## Verification

All three slice-level verification gates pass:

| Check | Result |
|---|---|
| `npm run test -w studio` | ✅ 34 tests pass, 0 fail (includes 4 new S04 message-model tests) |
| `npx tsc --noEmit -p studio/tsconfig.web.json` | ✅ zero type errors |
| `npm run build -w studio` | ✅ zero build errors, all card components bundled |

Root `npm run test` has 1 pre-existing failure (e2e-smoke version mismatch: installed binary v2.28.0 vs synced resources v2.29.0-next.1) — unrelated to S04 work, documented in T02/T03 summaries.

## New Requirements Surfaced

- none

## Deviations

- T01 required merging the S03 branch into the worktree before starting — S03 code was on a separate branch not yet integrated at the S04 planning commit.
- T01 used `node --test studio/test/*.test.mjs` directly instead of `npm run test -w studio` because the workspace command resolved to the main project's studio directory rather than the worktree's. Later tasks used `npm run test -w studio` from the worktree root successfully.

## Known Limitations

- `shortenPath` in EditCard/ReadCard uses a regex heuristic (`/Users|/home` prefix) since `os.homedir()` isn't available in the Electron renderer. Non-standard home directory configurations won't be shortened.
- Visual quality of tool cards is contract-verified (type-check + build) but not live-runtime verified — live rendering with a connected gsd-2 session and human visual review is deferred to UAT.
- ToolStub.tsx remains on disk as dead code. Not imported by any active component.

## Follow-ups

- S07 should wire file path links in EditCard/WriteCard/ReadCard headers to open files in the Monaco editor.
- S07 should detect dev server URLs from BashCard output for automatic preview pane loading.
- ToolStub.tsx can be deleted in a cleanup pass — it's dead code with no active imports.

## Files Created/Modified

- `studio/src/renderer/src/lib/message-model.ts` — Enhanced ToolUseBlock type, tool_execution_update handler, structured result extraction
- `studio/test/message-model.test.mjs` — Updated replicated buildMessageBlocks, added 4 new S04 tests
- `studio/src/renderer/src/components/tool-cards/ToolCard.tsx` — Shared shell with expand/collapse animation, status icons, data attributes
- `studio/src/renderer/src/components/tool-cards/DiffView.tsx` — Diff parser with line coloring and word-level intra-line highlighting
- `studio/src/renderer/src/components/tool-cards/EditCard.tsx` — Edit card with path/diff summary header, DiffView body
- `studio/src/renderer/src/components/tool-cards/BashCard.tsx` — Terminal-styled card with 5-line preview, truncation warning
- `studio/src/renderer/src/components/tool-cards/WriteCard.tsx` — Write card with Streamdown/Shiki syntax highlighting
- `studio/src/renderer/src/components/tool-cards/ReadCard.tsx` — Read card with line range display, truncation warning
- `studio/src/renderer/src/components/tool-cards/SearchCard.tsx` — Search card for grep/find/ls/glob with per-tool headers
- `studio/src/renderer/src/components/tool-cards/LspCard.tsx` — LSP card with action name + file + monospace results
- `studio/src/renderer/src/components/tool-cards/GenericCard.tsx` — Crash-proof fallback card with JSON args display
- `studio/src/renderer/src/components/tool-cards/index.tsx` — ToolCardDispatcher barrel routing tool names to components
- `studio/src/renderer/src/lib/lang-map.ts` — File extension → Shiki language ID mapping (30+ extensions)
- `studio/src/renderer/src/styles/index.css` — Added .diff-removed, .diff-added, .diff-context CSS classes
- `studio/src/renderer/src/components/message-stream/MessageStream.tsx` — Replaced ToolStub with ToolCardDispatcher
- `studio/package.json` — Added diff and @types/diff dependencies

## Forward Intelligence

### What the next slice should know
- Tool cards render inline in the MessageStream via `ToolCardDispatcher`. S05 prompts will render in the same stream — the `BlockRenderer` switch in MessageStream is the integration point.
- The `ToolUseBlock` type in `message-model.ts` now carries `content` (array of text/image), `details` (tool-specific metadata), `isError`, and `partialResult`. S05 may need similar structured extraction for extension_ui_request events.
- Streamdown + codePlugin is the canonical way to render syntax-highlighted content inside cards — wrap in a markdown code fence and render through `<Streamdown>`. No direct Shiki calls needed.

### What's fragile
- `shortenPath` regex heuristic — won't handle non-standard home dirs. If S07 needs path shortening for the file tree, consider a proper utility shared between renderer components.
- DiffView expects the specific `+NNN content` / `-NNN content` / ` NNN content` format. If the gsd-2 diff format changes, DiffView will render all lines as separators (safe but unhelpful).

### Authoritative diagnostics
- `document.querySelectorAll('[data-tool-name]')` — returns all rendered tool cards in the DOM, filterable by tool type and status
- `buildMessageBlocks(useSessionStore.getState().events)` in DevTools console — shows the structured block array with all enhanced fields

### What assumptions changed
- WriteCard/ReadCard were planned to potentially use `codeToHtml` directly — the Streamdown code-fence wrapping pattern turned out to be simpler and required zero new wiring. This is now the established pattern for rendering highlighted code inside any card.
