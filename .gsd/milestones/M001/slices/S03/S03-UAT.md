# S03: Auto-Fix Retry Loop — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: The retry loop is integration wiring (module-level state, early returns, prompt injection) verified by unit tests on pure functions and code review on control flow. No runtime server or browser interaction is involved — all verification is through test execution, grep confirmation, and structural code review.

## Preconditions

- Repository is cloned and dependencies installed (`npm install` completed)
- Node.js ≥ 20.6 available
- No running dev server or browser required

## Smoke Test

Run `npm run test:unit -- --test-name-pattern "formatFailureContext"` — at least 6 tests pass, confirming the core formatting function works.

## Test Cases

### 1. formatFailureContext produces prompt-injectable output for failed checks

1. Run `npm run test:unit -- --test-name-pattern "formatFailureContext"`
2. **Expected:** All 6 tests pass — single failure format, multiple failures, stderr truncation at 2000 chars, all-pass returns empty string, empty checks returns empty string, total output capped at 10,000 chars.

### 2. Evidence JSON carries retry metadata when provided

1. Run `npm run test:unit -- --test-name-pattern "retry"`
2. **Expected:** At least 2 tests pass confirming `retryAttempt` and `maxRetries` are present in JSON output when provided, and absent when omitted.

### 3. All existing verification tests still pass (no regression)

1. Run `npm run test:unit -- --test-name-pattern "verification"`
2. **Expected:** 1068+ tests pass. Only pre-existing failures (chokidar/octokit missing-package errors) are present — no new failures.

### 4. Retry state variables are wired into auto.ts

1. Run `grep -n "pendingVerificationRetry\|verificationRetryCount\|formatFailureContext" src/resources/extensions/gsd/auto.ts`
2. **Expected:** At least 15 matches spanning: import line, declaration lines (~339-341), stopAuto cleanup (~703-704), pauseAuto cleanup (~742), gate block retry logic (~1552-1594), dispatchNextUnit injection (~2897-2899).

### 5. Evidence retry fields are wired into verification-evidence.ts

1. Run `grep -n "retryAttempt\|maxRetries" src/resources/extensions/gsd/verification-evidence.ts`
2. **Expected:** 6 matches: interface fields (lines 33-34), function params (lines 49-50), conditional spread (lines 67-68).

### 6. handleAgentEnd returns early before DB dual-write on retry

1. Open `src/resources/extensions/gsd/auto.ts` and locate the verification gate block (search for `Auto-fix retry logic`).
2. Find the `return` statement in the "retries remaining" branch.
3. Scroll down to find the `// ── DB dual-write` comment.
4. **Expected:** The retry `return` is above the DB dual-write section. No code path between the retry return and the DB dual-write can execute when retries are available.

### 7. handleAgentEnd pauses auto-mode on retry exhaustion

1. In the same gate block, find the "retries exhausted" branch.
2. **Expected:** It calls `pauseAuto(ctx, pi)` and then `return`s, exiting before DB dual-write and post-unit hooks.

### 8. dispatchNextUnit injects failure context before pendingCrashRecovery

1. Open `src/resources/extensions/gsd/auto.ts` and search for `pendingVerificationRetry` in `dispatchNextUnit`.
2. **Expected:** The verification retry injection block appears before the `pendingCrashRecovery` check. Failure context is capped to `MAX_RECOVERY_CHARS` (50,000) and prepended with a `VERIFICATION FAILED — AUTO-FIX ATTEMPT` header.

### 9. State cleanup in stopAuto and pauseAuto

1. Search for `pendingVerificationRetry` in `stopAuto` function.
2. **Expected:** Both `pendingVerificationRetry = null` and `verificationRetryCount.clear()` are present.
3. Search for `pendingVerificationRetry` in `pauseAuto` function.
4. **Expected:** Only `pendingVerificationRetry = null` is present (retry count preserved for resume).

## Edge Cases

### formatFailureContext with all-passing checks

1. Call `formatFailureContext` with a `VerificationResult` where all checks have `passed: true`.
2. **Expected:** Returns empty string (no failure context to inject). Covered by unit test.

### formatFailureContext with very long stderr

1. Call `formatFailureContext` with a check whose stderr exceeds 2000 characters.
2. **Expected:** stderr is truncated to 2000 chars with `[...truncated]` suffix. Total output capped at 10,000 chars. Covered by unit test.

### Evidence JSON without retry params

1. Call `writeVerificationJSON` without `retryAttempt`/`maxRetries` params.
2. **Expected:** Output JSON contains no `retryAttempt` or `maxRetries` keys (backward compatible with S02 format). Covered by unit test.

### Retry budget resets on stopAuto

1. (Code review) Verify that `verificationRetryCount.clear()` is called in `stopAuto`.
2. **Expected:** A fresh auto-mode session starts with zero retry counts for all units.

### Retry budget preserved across pauseAuto/resume

1. (Code review) Verify that `verificationRetryCount` is NOT cleared in `pauseAuto`.
2. **Expected:** Resuming after a pause retains the retry count, preventing infinite retry loops.

## Failure Signals

- New test failures in `npm run test:unit -- --test-name-pattern "verification"` that weren't present before S03
- `grep pendingVerificationRetry auto.ts` returning fewer than 15 matches (missing wiring)
- `grep retryAttempt verification-evidence.ts` returning fewer than 6 matches (missing evidence fields)
- The retry `return` in handleAgentEnd appearing after (below) the DB dual-write section
- `pendingVerificationRetry` injection appearing after `pendingCrashRecovery` in `dispatchNextUnit`

## Requirements Proved By This UAT

- R005 — Auto-fix retry loop with 2 retries, failure context injection, and human review on exhaustion. Proved by: unit tests on pure functions, grep confirmation of wiring, code review of control flow paths.

## Not Proven By This UAT

- End-to-end auto-mode run with a deliberately failing verification gate triggering retry dispatch — requires a live auto-mode session (milestone-level UAT)
- Prompt injection effectiveness across different LLM providers — the formatted context follows existing `pendingCrashRecovery` patterns but hasn't been tested against diverse models
- Interaction between verification retry and crash recovery when both are active simultaneously

## Notes for Tester

- The 8 pre-existing test failures (chokidar/octokit missing packages) are unrelated to this work and were present before S01. They should not be counted against S03.
- The retry loop's integration wiring is verified by code review rather than end-to-end test because it depends on the full auto-mode dispatch cycle which is not unit-testable in isolation. The pure function layer (formatFailureContext, evidence JSON fields) has full unit test coverage.
- Line numbers in test cases are approximate — they may shift by a few lines due to other concurrent changes.
