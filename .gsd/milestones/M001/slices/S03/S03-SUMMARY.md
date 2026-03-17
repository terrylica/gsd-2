---
id: S03
parent: M001
milestone: M001
provides:
  - formatFailureContext(result) — pure function formatting failed verification checks into prompt-injectable failure context
  - EvidenceJSON with optional retryAttempt/maxRetries metadata fields
  - writeVerificationJSON with optional retry params for evidence artifact tagging
  - Verification gate auto-fix retry loop (up to N retries, default 2) wired into handleAgentEnd
  - Prompt injection of formatted failure context via dispatchNextUnit on retry dispatch
  - Module-level retry state (pendingVerificationRetry, verificationRetryCount) with full lifecycle management
requires:
  - slice: S01
    provides: runVerificationGate() returning VerificationResult with structured failure info, verification_auto_fix and verification_max_retries preferences
affects:
  - S04
  - S05
key_files:
  - src/resources/extensions/gsd/verification-gate.ts
  - src/resources/extensions/gsd/verification-evidence.ts
  - src/resources/extensions/gsd/auto.ts
  - src/resources/extensions/gsd/tests/verification-gate.test.ts
  - src/resources/extensions/gsd/tests/verification-evidence.test.ts
key_decisions: []
patterns_established:
  - Verification retry follows the pendingCrashRecovery pattern — module-level state set in handleAgentEnd, consumed in dispatchNextUnit, cleared in stopAuto/pauseAuto
  - completedKeySet.delete + removePersistedKey to un-complete a unit for re-dispatch on retry
  - Conditional spread for optional JSON fields to avoid undefined keys in serialized output
observability_surfaces:
  - ctx.ui.notify() with retry attempt number on each auto-fix retry
  - ctx.ui.notify() with "FAILED after N retries" on exhaustion, triggers pauseAuto for human review
  - T##-VERIFY.json contains retryAttempt and maxRetries fields on each retry attempt
  - process.stderr output with per-check failure details (command, exit code, stderr excerpt) on each retry
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md
duration: 24m
verification_result: passed
completed_at: 2026-03-17
---

# S03: Auto-Fix Retry Loop

**When verification commands fail, the agent automatically retries up to 2 times with formatted failure context (command, exit code, stderr) injected into the retry prompt. After exhausting retries, auto-mode pauses for human review. Retry metadata appears in T##-VERIFY.json evidence.**

## What Happened

T01 built the pure-function foundation: `formatFailureContext(result)` in `verification-gate.ts` filters failed checks from a `VerificationResult` and formats each as a markdown block with command name, exit code, and truncated stderr (capped at 2000 chars per check, 10,000 chars total). It also extended the `EvidenceJSON` interface with optional `retryAttempt` and `maxRetries` fields, and updated `writeVerificationJSON` to accept and write those fields using conditional spread (backward compatible — no extra keys when omitted). Six tests cover `formatFailureContext` (single/multiple failures, stderr truncation, all-pass/empty cases, total output cap) and two tests cover the retry evidence fields.

T02 wired the retry loop into `auto.ts`. It added module-level state (`pendingVerificationRetry` typed object, `verificationRetryCount` Map keyed by unitId) alongside existing dispatch state. The verification gate block in `handleAgentEnd` was rewritten with three paths: (1) **pass** — clears retry state, continues normal flow through DB dual-write and post-unit hooks; (2) **fail + retries remaining** — increments retry count, sets `pendingVerificationRetry` with `formatFailureContext` output, writes evidence JSON tagged with attempt number, removes the completion key so `dispatchNextUnit` re-dispatches the same unit, and returns before DB dual-write and hooks; (3) **fail + retries exhausted** — clears retry state, notifies with error, calls `pauseAuto()` for human review, and returns. In `dispatchNextUnit`, a new injection block (placed before the existing `pendingCrashRecovery` check) caps failure context to `MAX_RECOVERY_CHARS` (50,000) and prepends it to the prompt with a `VERIFICATION FAILED — AUTO-FIX ATTEMPT N` header. State cleanup was added to `stopAuto` (clears both pending and count) and `pauseAuto` (clears pending only, preserving count for resume).

## Verification

All slice-level verification checks pass:

- ✅ `npm run test:unit -- --test-name-pattern "verification"` — 1068/1068 verification-related tests pass (8 pre-existing failures from missing chokidar/octokit packages — unrelated to this work, unchanged from S01/S02 baseline)
- ✅ `grep pendingVerificationRetry|verificationRetryCount|formatFailureContext auto.ts` — 17 matches confirming wiring across import, declarations, gate block, dispatchNextUnit, stopAuto, and pauseAuto
- ✅ `grep retryAttempt|maxRetries verification-evidence.ts` — 6 matches confirming interface fields, function params, and conditional spread
- ✅ Code review: retry `return` exits `handleAgentEnd` before DB dual-write and post-unit hooks
- ✅ Code review: exhausted path `return` also exits before DB dual-write
- ✅ Code review: prompt injection block in `dispatchNextUnit` is positioned before `pendingCrashRecovery`
- ✅ Code review: `stopAuto` clears both `pendingVerificationRetry` and `verificationRetryCount`; `pauseAuto` clears only `pendingVerificationRetry`

## Requirements Advanced

- R005 — Fully implemented: verification gate failures trigger up to 2 auto-fix retries with formatted failure context (stderr, exit code) injected into the retry prompt. After exhaustion, gate fails and pauses for human review. Max retries configurable via `verification_max_retries` preference.
- R001 — Supporting: the retry loop is part of the enforcement mechanism — failed gates now get automatic recovery attempts before requiring human intervention.

## Requirements Validated

- R005 — Contract tests prove `formatFailureContext` produces correct prompt-injectable blocks. Code review confirms the three-path gate logic (pass/retry/exhaust) is correctly wired with early returns. Evidence JSON carries retry metadata. The full R005 contract is implemented, though final validation requires a live auto-mode run (covered by milestone-level UAT).

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- R005 notes mentioned "Uses existing hook retry_on mechanism" — the actual implementation uses a parallel module-level state pattern (matching `pendingCrashRecovery`) rather than the hook engine's `retry_on`. This is architecturally cleaner (D001 established the gate is separate from user hooks) but the R005 notes should be updated to reflect the actual implementation pattern.

## Deviations

None. Both tasks completed exactly as planned with no deviations.

## Known Limitations

- The retry loop is tested at the unit level (pure functions) and verified by code review (integration wiring). A full end-to-end auto-mode run with a deliberately failing verification gate has not been executed — this is deferred to milestone-level UAT.
- The `formatFailureContext` output is formatted for LLM consumption (markdown blocks) but has not been tested against diverse model providers for prompt injection effectiveness. The format follows existing patterns used by `pendingCrashRecovery`.
- Retry count is per-unit (keyed by unitId in a Map). If a unit is re-dispatched across auto-mode stop/start cycles, the count resets because `stopAuto` clears `verificationRetryCount`. This is intentional — a fresh auto-mode session should have fresh retry budget.

## Follow-ups

- none

## Files Created/Modified

- `src/resources/extensions/gsd/verification-gate.ts` — added `formatFailureContext` export with `MAX_STDERR_PER_CHECK` (2000) and `MAX_FAILURE_CONTEXT_CHARS` (10000) constants
- `src/resources/extensions/gsd/verification-evidence.ts` — added optional `retryAttempt`/`maxRetries` to `EvidenceJSON` interface and `writeVerificationJSON` params with conditional spread
- `src/resources/extensions/gsd/auto.ts` — added module-level retry state, rewrote gate block with retry/exhaust/pass paths, added prompt injection in `dispatchNextUnit`, added state cleanup in `stopAuto`/`pauseAuto`, updated import for `formatFailureContext`
- `src/resources/extensions/gsd/tests/verification-gate.test.ts` — added 6 tests for `formatFailureContext`
- `src/resources/extensions/gsd/tests/verification-evidence.test.ts` — added 2 tests for retry evidence fields

## Forward Intelligence

### What the next slice should know
- The verification gate block in `handleAgentEnd` (around line 1550 in auto.ts) now has three paths and two early returns. Any new gate logic (S04 runtime errors, S05 npm audit) should be added *before* the retry logic — the gate result must be complete before the retry decision is made.
- `VerificationResult` is the single data structure that flows through the entire gate → evidence → retry pipeline. Extending it (e.g., adding `runtimeErrors` for S04) is the correct extension point.

### What's fragile
- The early return in the retry path skips DB dual-write and post-unit hooks. If any new critical side effects are added between the gate block and the return, they'll be silently skipped during retries. Any future changes to `handleAgentEnd` flow must audit all return paths.
- `completedKeySet.delete` + `removePersistedKey` to un-complete a unit for re-dispatch is load-bearing for the retry mechanism. If the completion key format changes, retry re-dispatch will silently break.

### Authoritative diagnostics
- `T##-VERIFY.json` with `retryAttempt`/`maxRetries` fields — the definitive record of whether retries occurred and how many
- `ctx.ui.notify()` messages during auto-mode — "Verification failed — auto-fix attempt N/M" or "FAILED after N retries — pausing for human review"
- `process.stderr` output contains per-check failure details on each retry attempt

### What assumptions changed
- R005 notes assumed the hook engine's `retry_on` mechanism would be used — the actual implementation uses module-level state parallel to `pendingCrashRecovery`, which is cleaner and avoids coupling verification retry to the user-hook system
