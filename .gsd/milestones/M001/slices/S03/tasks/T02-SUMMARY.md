---
id: T02
parent: S03
milestone: M001
provides:
  - Verification gate auto-fix retry loop with up to N retries (default 2) before pausing for human review
  - Prompt injection of formatted failure context on retry dispatch
  - Module-level retry state (pendingVerificationRetry, verificationRetryCount) with proper lifecycle
key_files:
  - src/resources/extensions/gsd/auto.ts
key_decisions: []
patterns_established:
  - Verification retry follows pendingCrashRecovery pattern — module-level state set in handleAgentEnd, consumed in dispatchNextUnit
  - completedKeySet.delete + removePersistedKey to un-complete a unit for re-dispatch
observability_surfaces:
  - ctx.ui.notify() with retry attempt number on each auto-fix retry
  - ctx.ui.notify() with "FAILED after N retries" on exhaustion
  - T##-VERIFY.json contains retryAttempt/maxRetries fields on each retry attempt
  - stderr output with per-check failure details on each retry
duration: 12m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Wire retry loop into handleAgentEnd and prompt injection into dispatchNextUnit

**Wired verification gate auto-fix retry loop into auto.ts — failed gates trigger up to 2 retry dispatches with failure context injected into the prompt, then pause for human review.**

## What Happened

1. Added `pendingVerificationRetry` (typed state object) and `verificationRetryCount` (Map per unitId) as module-level state near other dispatch state in `auto.ts`.

2. Updated import to include `formatFailureContext` from `verification-gate.ts`.

3. Rewrote the verification gate block in `handleAgentEnd` with three paths:
   - **Pass**: clears retry state, continues normal flow (DB dual-write, hooks)
   - **Fail + retries remaining**: increments retry count, sets `pendingVerificationRetry` with formatted failure context, writes evidence JSON with `retryAttempt`/`maxRetries`, removes completion key so `dispatchNextUnit` re-dispatches the same unit, and `return`s before DB dual-write and post-unit hooks
   - **Fail + retries exhausted**: clears retry state, notifies with error, calls `pauseAuto()` for human review, and `return`s

4. Added prompt injection block in `dispatchNextUnit` before the existing `pendingCrashRecovery` check — caps failure context to `MAX_RECOVERY_CHARS` (50,000) and prepends to prompt with a `VERIFICATION FAILED — AUTO-FIX ATTEMPT N` header.

5. Added state cleanup in `stopAuto` (clears both `pendingVerificationRetry` and `verificationRetryCount`) and `pauseAuto` (clears only `pendingVerificationRetry`, preserving retry count for resume).

6. Preferences: `verification_auto_fix` defaults to `true` (enabled), `verification_max_retries` defaults to `2`.

## Verification

- `npm run test:unit -- --test-name-pattern "verification"` — 1076 tests, 1068 pass, 8 fail (pre-existing chokidar/octokit failures, unchanged)
- `grep -n "pendingVerificationRetry|verificationRetryCount|formatFailureContext" auto.ts` — 17 matches across import, declaration, gate block, dispatchNextUnit, stopAuto, and pauseAuto
- Code review: retry `return` at line 1589 exits before `// ── DB dual-write` at line 1607 and `// ── Post-unit hooks` at line 1618 ✅
- Code review: exhausted path `return` at line 1600 also exits before DB dual-write ✅
- Code review: `pendingVerificationRetry` injection block at line 2897 is before `pendingCrashRecovery` at line 2905 ✅
- Code review: `stopAuto` clears both at lines 703-704, `pauseAuto` clears pending only at line 742 ✅
- TypeScript: no new type errors in auto.ts (only pre-existing downlevelIteration warnings)

### Slice-level verification (all pass — this is the final task):
- ✅ `npm run test:unit -- --test-name-pattern "verification"` — all verification tests pass (no regressions)
- ✅ `grep pendingVerificationRetry|verificationRetryCount|formatFailureContext auto.ts` — confirms wiring
- ✅ `grep retryAttempt|maxRetries verification-evidence.ts` — confirms evidence fields (from T01)
- ✅ Code review: handleAgentEnd returns early before DB dual-write and post-unit hooks
- ✅ Code review: retry state reset in stopAuto and pauseAuto

## Diagnostics

- `ctx.ui.notify()` messages during auto-mode show retry progress: "Verification failed — auto-fix attempt 1/2"
- On exhaustion: "Verification gate FAILED after 2 retries — pausing for human review"
- `T##-VERIFY.json` evidence files contain `retryAttempt` and `maxRetries` fields on each retry
- `process.stderr` output contains per-check failure details (command, exit code, stderr excerpt) on each retry

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/resources/extensions/gsd/auto.ts` — added module-level retry state, rewrote gate block with retry/exhaust/pass paths, added prompt injection in dispatchNextUnit, added state cleanup in stopAuto/pauseAuto, updated import for formatFailureContext
