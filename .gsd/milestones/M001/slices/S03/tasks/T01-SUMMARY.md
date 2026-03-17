---
id: T01
parent: S03
milestone: M001
provides:
  - formatFailureContext(result) pure function for prompt-injectable failure context
  - EvidenceJSON with optional retryAttempt/maxRetries fields
  - writeVerificationJSON with optional retry params
key_files:
  - src/resources/extensions/gsd/verification-gate.ts
  - src/resources/extensions/gsd/verification-evidence.ts
  - src/resources/extensions/gsd/tests/verification-gate.test.ts
  - src/resources/extensions/gsd/tests/verification-evidence.test.ts
key_decisions: []
patterns_established:
  - Conditional spread for optional JSON fields to avoid undefined keys in serialized output
observability_surfaces:
  - T##-VERIFY.json retryAttempt/maxRetries fields for retry metadata inspection
  - formatFailureContext output as prompt-injectable failure diagnostics
duration: 12m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: Add formatFailureContext helper and extend evidence JSON with retry fields

**Added `formatFailureContext` pure function and retry metadata fields to verification evidence JSON for auto-fix retry loop support.**

## What Happened

1. Added `formatFailureContext(result: VerificationResult): string` to `verification-gate.ts` — filters failed checks, formats each as a markdown block with command name, exit code, and truncated stderr (capped at 2000 chars per check, 10,000 chars total). Returns empty string for passing/empty results.

2. Extended `EvidenceJSON` interface in `verification-evidence.ts` with optional `retryAttempt?: number` and `maxRetries?: number` fields.

3. Updated `writeVerificationJSON` to accept optional `retryAttempt` and `maxRetries` params. Uses conditional spread to include them only when provided — JSON output is backward compatible (no extra keys when not supplied).

4. Added 6 tests for `formatFailureContext` covering: single failure, multiple failures, stderr truncation at 2000 chars, all-pass returns empty, empty checks returns empty, total output capped at 10,000 chars.

5. Added 2 tests for retry evidence fields covering: fields present when provided, fields absent when omitted.

## Verification

- `npm run test:unit -- --test-name-pattern "verification"` — all tests pass (1068/1068 pass, 8 pre-existing failures from missing chokidar/octokit packages unrelated to this work)
- `grep -n "formatFailureContext" src/resources/extensions/gsd/verification-gate.ts` — confirms export at line 111
- `grep -n "retryAttempt\|maxRetries" src/resources/extensions/gsd/verification-evidence.ts` — confirms fields at lines 33-34, params at 49-50, conditional spread at 67-68

### Slice-level verification (partial — T01 is intermediate):
- ✅ `npm run test:unit -- --test-name-pattern "verification"` — all verification tests pass
- ⬜ `grep pendingVerificationRetry|verificationRetryCount|formatFailureContext auto.ts` — T02 will wire these
- ✅ `grep retryAttempt|maxRetries verification-evidence.ts` — confirmed
- ⬜ Code review: handleAgentEnd early return — T02
- ⬜ Code review: retry state reset in stopAuto/pauseAuto — T02

## Diagnostics

- Inspect `formatFailureContext` output by calling it on any `VerificationResult` with failed checks — deterministic given same input
- Inspect `T##-VERIFY.json` files for `retryAttempt`/`maxRetries` keys to see retry metadata; absence means no retries involved

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/resources/extensions/gsd/verification-gate.ts` — added `formatFailureContext` export with constants `MAX_STDERR_PER_CHECK` (2000) and `MAX_FAILURE_CONTEXT_CHARS` (10000)
- `src/resources/extensions/gsd/verification-evidence.ts` — added optional `retryAttempt`/`maxRetries` to `EvidenceJSON` interface and `writeVerificationJSON` params
- `src/resources/extensions/gsd/tests/verification-gate.test.ts` — added 6 tests for `formatFailureContext`, imported it alongside existing exports
- `src/resources/extensions/gsd/tests/verification-evidence.test.ts` — added 2 tests for retry evidence fields
- `.gsd/milestones/M001/slices/S03/tasks/T01-PLAN.md` — added Observability Impact section (preflight fix)
