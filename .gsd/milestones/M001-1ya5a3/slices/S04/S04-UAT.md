# S04: Tool Cards — The Art — UAT

**Milestone:** M001-1ya5a3
**Written:** 2026-03-18

## UAT Type

- UAT mode: mixed (artifact-driven contract verification + human-experience visual review)
- Why this mode is sufficient: Contract verification (types, tests, build) proves structural correctness. Visual quality and design feel require human review in the live app.

## Preconditions

- `npm run dev -w studio` running and Electron window visible
- A gsd-2 session active (or replay of recorded events) that includes tool calls for: edit, bash, write, read, lsp, and at least one grep/find/ls
- The conversation should include at least one errored tool call to verify error state rendering

## Smoke Test

Open the app with an active gsd-2 session. Scroll through the conversation. Tool calls should render as cards with colored left borders (amber for running, green for done, red for error), not as the old ToolStub placeholders. Clicking a card header should expand/collapse it with a smooth animation.

## Test Cases

### 1. EditCard renders diff with intra-line highlighting

1. Trigger an edit tool call (e.g., agent edits a file)
2. Observe the collapsed card: shows shortened file path + `:lineNumber` + diff summary like "+3 -2 lines"
3. Click to expand
4. **Expected:** DiffView renders with:
   - Red background lines for removed content with line numbers in a gutter
   - Green background lines for added content with line numbers
   - Neutral background for context lines
   - Word-level highlighting within changed lines (stronger red/green tokens on the specific words that changed)
   - Separator lines between hunks

### 2. BashCard renders terminal-styled output

1. Trigger a bash tool call (e.g., agent runs `npm run build`)
2. Observe the collapsed card: shows `$ npm run build` in monospace + first 5 lines of output
3. Click to expand
4. **Expected:** Full output rendered in monospace font on a near-black (`#0c0c0c`) background. If the command produced more output than visible, all lines are shown. If output was truncated by the runtime, a yellow warning with line counts is displayed.

### 3. WriteCard renders syntax-highlighted file content

1. Trigger a write tool call (e.g., agent creates a new `.tsx` file)
2. Observe the collapsed card: shows file path + line count
3. Click to expand
4. **Expected:** File content is syntax-highlighted with Shiki (same theme as markdown code blocks). TypeScript/React syntax colors are correct. The content is rendered through Streamdown — should have the same visual quality as code blocks in the message stream.

### 4. ReadCard renders file content with line range

1. Trigger a read tool call with offset/limit (e.g., agent reads lines 50-100 of a file)
2. Observe the collapsed card: shows file path with `[50:100]` range label in amber + first ~10 lines of highlighted preview
3. Click to expand
4. **Expected:** Full file content rendered with syntax highlighting via Streamdown. If the read was truncated, an amber warning icon + message appears.

### 5. SearchCard renders grep results with counts

1. Trigger a grep/find/ls tool call
2. Observe the collapsed card: grep shows `/{pattern}/ in path` + match count; find shows `pattern in path` + result count; ls shows `ls path` + entry count
3. Click to expand
4. **Expected:** Full monospace output with all results. Truncation warning if applicable.

### 6. GenericCard handles unknown tool types gracefully

1. If an unrecognized tool type appears (e.g., `browser_navigate`, `subagent`, `mcp_call`)
2. Observe the collapsed card: shows the formatted tool name
3. Click to expand
4. **Expected:** JSON-formatted args in a styled pre block + text result below. No crash, no empty card.

### 7. ToolCard expand/collapse animation is smooth

1. Click any tool card header to expand it
2. Click again to collapse it
3. **Expected:** Smooth 300ms CSS grid-rows transition. No jumpy height changes, no layout shift. The chevron icon rotates 90° on expand. Content appears to "slide down" not "pop in".

### 8. Error state renders distinctly

1. Find a tool call that errored (or trigger one by having the agent attempt something that fails)
2. **Expected:** Card has a red left border, red error icon (XCircle), and red-tinted error text in the expanded body. Clearly distinct from successful cards at a glance.

### 9. Running state shows spinner

1. While a tool call is actively executing (in-progress)
2. **Expected:** Card shows an animated CircleNotch spinner icon, amber left border, and the args/command that's being executed. No content body yet (or partial result if available).

## Edge Cases

### Missing diff data in EditCard

1. An edit tool call completes but `details.diff` is missing (older protocol or edge case)
2. **Expected:** EditCard falls back to showing a preview of oldText→newText rather than crashing. If neither is available, shows just the args.

### Very long bash output

1. A bash command produces hundreds of lines of output
2. **Expected:** Collapsed state shows only the first 5 lines. Expanded state shows all output without truncating. Page remains scrollable. No performance degradation.

### Empty tool result

1. A tool call returns with no content (e.g., a write that returns nothing)
2. **Expected:** Card renders in collapsed state with the header summary. Expanding shows minimal content or an empty body — no crash, no undefined errors.

## Failure Signals

- ToolStub placeholder text ("tool_name running/done") still visible instead of bespoke cards → ToolCardDispatcher not wired
- Cards expand/collapse with a visual "jump" instead of smooth animation → grid-rows CSS not applied or children rendered conditionally
- Diff view shows all lines the same color → diff parser not matching the expected format
- Card expands to zero height → children not rendered (conditional rendering breaks grid measurement)
- Console error on unknown tool type → GenericCard try/catch not working
- `data-tool-name` / `data-tool-status` attributes missing from DOM → ToolCard shell not applied

## Not Proven By This UAT

- Live streaming performance under high-frequency tool_execution_update events (partial results) — needs a real long-running agent session
- Visual design quality at the "art" level described in R004 — this UAT verifies functionality; the design quality judgment is subjective and needs human gut-check
- Interaction between tool cards and future file tree / editor (S06/S07) — file path links in cards don't open anything yet

## Notes for Tester

- The visual quality bar for this slice is high — R004 calls these cards "art." Pay attention to spacing, borders, typography hierarchy, and whether collapsed cards give enough useful information at a glance. If something feels off or generic, note it.
- DiffView's intra-line highlighting is the most visually complex piece. Look for word-level diffs within changed lines, not just line-level coloring.
- Try expanding and collapsing cards rapidly to check animation smoothness.
- ToolStub.tsx still exists on disk but should not be visible anywhere in the running app. If you see its output ("read running", etc.), the dispatcher wiring is broken.
