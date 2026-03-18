# S05: Interactive Prompt UI — Wizards — Research

**Date:** 2026-03-18
**Requirement:** R009 (differentiator)

## Summary

S05 replaces the auto-respond behavior in gsd-service with real interactive prompt components rendered inline in the message stream. The RPC protocol sends individual `extension_ui_request` events with methods `select`, `confirm`, `input`, and `editor` — each blocking the agent until a response is sent. In RPC mode, `ask_user_questions` falls back to sequential `ctx.ui.select()` calls (one per question), not the full TUI interview round — so the studio prompt components work at the individual-request level, not as a multi-question wizard.

The work divides into three concerns: (1) IPC plumbing — stop auto-responding, add a fire-and-forget response channel, (2) message model — add a new `extension-ui` block type, (3) prompt components — `SelectPrompt`, `ConfirmPrompt`, `InputPrompt`, `EditorPrompt` rendered inline in MessageStream. The design must feel premium (option cards with recommended highlighting, amber accent for active states) while the data surface is simpler than the full TUI interview: `select` gets `title`, `options: string[]`, and `allowMultiple?`; `confirm` gets `title` and `message`; `input` gets `title` and `placeholder?`; `editor` gets `title` and `prefill?`.

The `(Recommended)` suffix in option labels and the `None of the above` option are already present in the `options` array — the extension adds them before calling `ctx.ui.select()`. The prompt components detect and style these.

## Recommendation

Build bottom-up: IPC plumbing first (unblock the end-to-end response path), then message model extension, then prompt components. The IPC change is the riskiest piece — `sendCommand` currently uses `gsd-service.send()` which tracks pending requests with timeouts, but `extension_ui_response` is fire-and-forget (no correlated response from the agent). A new `sendResponse` IPC channel that writes directly to the subprocess stdin without pending-request tracking is needed.

For the prompt components, render them inline in the MessageStream just like tool cards. Each prompt method gets a dedicated component. The `select` prompt is the most common and complex (option cards, multi-select toggles, recommended highlighting, "None of the above" with notes). Keep the interaction model mouse-first since this is a GUI, not a TUI — click to select, click to submit.

## Implementation Landscape

### Key Files

- `studio/src/main/gsd-service.ts` — Contains `handleExtensionUIRequest()` auto-responder that must be removed for interactive methods. Needs a new `sendExtensionResponse(response)` method that writes directly to `this.process.stdin` without the pending-request tracking of `send()`.
- `studio/src/main/index.ts` — Register a new IPC handler (e.g., `gsd:respond-extension-ui`) that calls `gsdService.sendExtensionResponse()`. Fire-and-forget — no return value.
- `studio/src/preload/index.ts` + `studio/src/preload/index.d.ts` — Expose `respondExtensionUI(response)` on the `StudioBridge` contextBridge API.
- `studio/src/main/rpc-types.ts` — Types already define `RpcExtensionUIRequest`, `RpcExtensionUIResponse`, and `FIRE_AND_FORGET_METHODS`. No changes needed.
- `studio/src/renderer/src/lib/message-model.ts` — Add a new `ExtensionUIBlock` type to the `MessageBlock` union. Handle `extension_ui_request` events in `buildMessageBlocks()` — create blocks only for interactive methods (not fire-and-forget). Track block state: `pending` (waiting for user), `answered` (response sent), `cancelled`.
- `studio/src/renderer/src/stores/session-store.ts` — No structural changes needed. Extension UI events flow through `addEvent()` like all events. However, a convenience action for marking a prompt as answered (or a small dedicated store/ref) could simplify component state.
- `studio/src/renderer/src/components/message-stream/MessageStream.tsx` — Add `extension-ui` case to the `BlockRenderer` switch, rendering a `PromptDispatcher` component.
- `studio/src/renderer/src/components/prompts/PromptDispatcher.tsx` — Routes `extension_ui_request` methods to the correct prompt component (select → SelectPrompt, confirm → ConfirmPrompt, input → InputPrompt, editor → EditorPrompt).
- `studio/src/renderer/src/components/prompts/SelectPrompt.tsx` — The primary prompt component. Renders title, option cards with radio/checkbox selection, recommended badge detection (label ends with `(Recommended)`), "None of the above" detection (last option), optional notes textarea. Mouse-driven interaction.
- `studio/src/renderer/src/components/prompts/ConfirmPrompt.tsx` — Yes/No buttons with title and message.
- `studio/src/renderer/src/components/prompts/InputPrompt.tsx` — Text input with placeholder and submit button.
- `studio/src/renderer/src/components/prompts/EditorPrompt.tsx` — Textarea with prefill content and submit button.
- `studio/src/renderer/src/lib/rpc/use-gsd.ts` — May need to expose a `respondExtensionUI()` function from the hook, or prompt components can call `window.studio.respondExtensionUI()` directly.

### Build Order

1. **IPC plumbing (T01)** — The critical path. Remove auto-response from gsd-service for interactive methods. Add `sendExtensionResponse()` to gsd-service. Register `gsd:respond-extension-ui` IPC handler in main/index.ts. Expose `respondExtensionUI` on the preload bridge. Add `ExtensionUIBlock` type and handler in message-model.ts. Add `extension-ui` case in MessageStream's BlockRenderer (initially rendering a placeholder). This unblocks everything else — without the IPC path, prompt components can't send responses.

2. **SelectPrompt + ConfirmPrompt (T02)** — The two most common prompt types. SelectPrompt is the complex one: option cards, single/multi-select, recommended detection, "None of the above" detection, notes field. ConfirmPrompt is straightforward: title, message, yes/no buttons. Wire both into PromptDispatcher.

3. **InputPrompt + EditorPrompt + polish (T03)** — The simpler prompt types plus visual polish, answered/cancelled states, and the notification handler for fire-and-forget `notify` events (toast or inline message). Final verification.

### Verification Approach

- `npm run test -w studio` — message-model tests must cover `extension_ui_request` block creation for all four interactive methods, fire-and-forget method filtering, and answered-state transitions
- `npx tsc --noEmit -p studio/tsconfig.web.json` — zero type errors
- `npm run build -w studio` — zero build errors, prompt components bundled
- Contract verification: extension_ui_request events with each method produce the correct block type, prompt components render appropriate controls, submitting a response sends the correct `extension_ui_response` shape

## Constraints

- **`extension_ui_response` is fire-and-forget** — the agent does NOT send a response back when it receives one. The current `gsd-service.send()` method adds an `id` field and creates a pending request with a timeout. It CANNOT be used for extension_ui_response. A separate write path is required.
- **RPC protocol limits data surface** — `select` receives `title: string` and `options: string[]` (not the full `QuestionOption` objects with descriptions). The `(Recommended)` suffix and `None of the above` text are baked into the option strings by the extension before calling `ctx.ui.select()`. Prompt components must detect these by string matching.
- **`ask_user_questions` sends sequential select calls in RPC mode** — each question generates one `extension_ui_request`, not a batched wizard. The agent blocks on each until responded to, then sends the next. Multi-question tab navigation from the TUI is not reproducible through the current RPC protocol.
- **Events are already forwarded to the renderer** — `handleLine()` in gsd-service forwards ALL events (including `extension_ui_request`) via `this.onEvent(data)` before auto-responding. The renderer already receives these events. S05 just needs to stop the auto-response and let the renderer handle it.
- **Interactive extension_ui_requests block the agent** — the agent cannot proceed until a response is sent. If the user navigates away or the response is lost, the agent hangs indefinitely. Components must always provide a submit/cancel path.

## Common Pitfalls

- **Sending response through `send()` instead of a direct stdin write** — `send()` adds an `id` field and expects a correlated response. `extension_ui_response` already has its own `id` (matching the request) and gets no response. Using `send()` would corrupt the id, create orphan pending requests, and time out.
- **Not matching the `extension_ui_request` id in the response** — the response `id` MUST match the request `id` exactly, or the server-side pending request resolver won't find it. The prompt component must capture the request `id` and include it in the response.
- **Treating "None of the above" as requiring special detection** — it's already in the `options` array as the last element for single-select questions. The prompt component should detect it (exact string match `"None of the above"`) and render it distinctly, but it's sent back as a normal selection value.
- **allowMultiple response shape** — single-select responds with `{ value: string }`, multi-select responds with `{ values: string[] }`. The agent-side handler expects the correct shape based on `allowMultiple`.
- **Double-mount in StrictMode creating duplicate blocks** — `buildMessageBlocks` is pure and idempotent (re-derives from events), so this isn't a problem for block creation. But prompt component state (selection, notes) must live in component state, not derived from events — events don't carry the user's in-progress selections.

## Open Risks

- **Prompt timeout** — some `extension_ui_request` events include a `timeout` field. If the user doesn't respond within the timeout, the agent may time out and proceed with a default. The studio prompt components should display a timeout indicator when present, though the server-side timeout handling may resolve the pending request with a default before the user submits.
- **`custom()` method returning undefined in RPC mode** — the `ask_user_questions` and `secure_env_collect` extensions use `ctx.ui.custom()` for their rich TUI. In RPC mode, `custom()` returns `undefined`, triggering fallback paths. For `ask_user_questions`, this works (falls back to sequential `select()` calls). For `secure_env_collect`, the fallback may produce `input` method requests for masked secret entry — the InputPrompt should work for this but won't provide masking. This is acceptable for MVP.
