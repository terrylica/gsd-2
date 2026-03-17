---
id: M001
provides:
  - Built-in verification gate in auto.ts handleAgentEnd — fires after every execute-task completion
  - VerificationCheck, VerificationResult, RuntimeError, AuditWarning interfaces (types.ts)
  - discoverCommands() — preference → task plan verify → package.json discovery (D003)
  - runVerificationGate() — runs discovered commands via spawnSync with structured results
  - captureRuntimeErrors() — scans bg-shell processes and browser console with severity classification (D004)
  - runDependencyAudit() — conditional npm audit when lockfile changes, non-blocking warnings
  - formatFailureContext() — formats failed checks for retry prompt injection
  - writeVerificationJSON() — persists T##-VERIFY.json with schemaVersion 1
  - formatEvidenceTable() — renders 5-column markdown evidence table with emoji verdicts
  - evidence_block_missing and evidence_block_placeholder validator rules
  - verification_commands, verification_auto_fix, verification_max_retries preference keys
  - Auto-fix retry loop (up to N retries, default 2) with failure context injection and pauseAuto on exhaustion
key_decisions:
  - D001 — Gate hardcoded in auto.ts handleAgentEnd, before user hooks, not using hook engine
  - D002 — Dual evidence format (markdown table in summary + T##-VERIFY.json alongside)
  - D003 — Discovery order: preference → task plan verify → package.json scripts (first-non-empty-wins)
  - D004 — Crashes/unhandled rejections block gate; console.error/deprecation logged but non-blocking
  - D005 — 2 retries default (configurable via verification_max_retries preference)
  - D021 — stdout/stderr excluded from JSON evidence (size + secret leakage prevention)
  - D022 — Evidence write failure is non-fatal (try/catch with stderr log)
  - D023 — Dependency injection via options for testability of async capture functions
patterns_established:
  - spawnSync with shell:true, stdio:pipe, encoding:utf-8 for subprocess capture
  - 10KB stdout/stderr truncation in VerificationCheck results
  - Dependency injection options pattern for async capture functions (CaptureRuntimeErrorsOptions, DependencyAuditOptions)
  - Module-level retry state (pendingVerificationRetry/verificationRetryCount) following pendingCrashRecovery pattern
  - Conditional spread for optional JSON fields (retryAttempt, maxRetries, runtimeErrors, auditWarnings)
  - Validator rules follow getSection + sectionLooksPlaceholderOnly pattern
  - Dynamic import with try/catch for optional extension dependencies
  - Evidence JSON schema with schemaVersion for forward-compatible extension
observability_surfaces:
  - ctx.ui.notify() messages with "Verification gate:" prefix (pass/fail counts, retry attempts, exhaustion)
  - stderr structured output with per-command exit codes and truncated stderr on failure
  - stderr "verification-gate: N blocking runtime error(s) detected" during auto-mode
  - stderr "verification-gate: N audit warning(s)" or "npm audit skipped" lines
  - T##-VERIFY.json files in tasks directories — machine-queryable evidence artifacts
  - evidence_block_missing / evidence_block_placeholder warnings from observability validator
  - process.stderr "verification-evidence: write error" on evidence persistence failure
requirement_outcomes:
  - id: R001
    from_status: active
    to_status: validated
    proof: Gate fires in handleAgentEnd for execute-task units (auto.ts line 1521). 28 unit tests for gate logic. Retry loop blocks completion until pass or exhaustion. Code review confirms gate before user hooks, non-fatal wrapper.
  - id: R002
    from_status: active
    to_status: validated
    proof: discoverCommands() implements preference → task plan → package.json discovery. 8+ discovery tests cover all paths including fallthrough, whitespace, partial scripts. D003 codified.
  - id: R003
    from_status: active
    to_status: validated
    proof: writeVerificationJSON writes T##-VERIFY.json with schemaVersion 1. formatEvidenceTable produces 5-column markdown. Template and prompt updated. 15+ evidence tests pass. auto.ts calls writeVerificationJSON after every gate run.
  - id: R004
    from_status: active
    to_status: validated
    proof: evidence_block_missing and evidence_block_placeholder rules in observability-validator.ts. 4 validator tests prove acceptance of real evidence and rejection of missing/placeholder content.
  - id: R005
    from_status: active
    to_status: validated
    proof: Retry loop in handleAgentEnd with 3 paths (pass/retry/exhaust). formatFailureContext produces prompt-injectable blocks. 6 unit tests for formatFailureContext. Evidence JSON carries retryAttempt/maxRetries. pauseAuto on exhaustion. State cleanup in stopAuto/pauseAuto.
  - id: R006
    from_status: active
    to_status: validated
    proof: captureRuntimeErrors() scans bg-shell processes (crashed, non-zero exit, fatal signal, recentErrors) and browser console (errors, warnings, unhandled rejections). 14 unit tests cover all 7 severity classes plus graceful degradation. Wired in auto.ts after runVerificationGate().
  - id: R007
    from_status: active
    to_status: validated
    proof: D004 severity classification implemented. Crashes/unhandled rejections set blocking=true and override result.passed=false. Console.error/deprecation set blocking=false. 14 tests verify classification. Gate override in auto.ts confirmed.
  - id: R008
    from_status: active
    to_status: validated
    proof: runDependencyAudit() uses git diff to detect 5 lockfile types, runs npm audit --json, parses vulnerabilities. 12 unit tests cover all paths. Non-blocking — never modifies result.passed. Wired in auto.ts after captureRuntimeErrors().
duration: 2h 28m
verification_result: passed
completed_at: 2026-03-17
---

# M001: Verification Enforcement

**Mandatory verification gate with structured evidence, auto-fix retry, runtime error capture, and dependency audit — no task completes without machine-readable proof**

## What Happened

Five slices built the verification enforcement infrastructure end-to-end, each consuming the previous slice's interfaces and extending the gate pipeline:

**S01 (Built-in Verification Gate)** established the foundation: `VerificationCheck` and `VerificationResult` interfaces in `types.ts`, `discoverCommands()` and `runVerificationGate()` pure functions in `verification-gate.ts`, and three preference keys (`verification_commands`, `verification_auto_fix`, `verification_max_retries`) fully wired into the preferences system. The gate was hardcoded in `auto.ts` handleAgentEnd (D001), positioned after artifact verification but before DB dual-write and user hooks. Discovery follows D003 order: explicit preference → task plan verify field → package.json scripts (typecheck, lint, test), first-non-empty-wins. 28 unit tests cover the full discovery and execution contract.

**S02 (Structured Evidence Format)** added the evidence persistence layer. `writeVerificationJSON()` writes versioned JSON artifacts (schemaVersion 1) with check metadata — deliberately excluding stdout/stderr to prevent unbounded sizes and secret leakage (D021). `formatEvidenceTable()` renders 5-column markdown tables with emoji verdicts. The task summary template gained a `## Verification Evidence` section, the execute-task prompt gained step 8 instructing agents to populate it, and the observability validator gained `evidence_block_missing` and `evidence_block_placeholder` rules. 15 tests cover JSON shape, table formatting, and validator enforcement.

**S03 (Auto-Fix Retry Loop)** implemented the retry mechanism. `formatFailureContext()` formats failed checks with command, exit code, and truncated stderr into prompt-injectable blocks. The gate block in handleAgentEnd was rewritten with three paths: pass (continue), retry (un-complete unit, inject failure context, re-dispatch), and exhaust (pause for human review). The pattern mirrors `pendingCrashRecovery` — module-level state consumed in `dispatchNextUnit` and cleaned up in `stopAuto`/`pauseAuto`. Evidence JSON gained optional `retryAttempt`/`maxRetries` fields. 8 additional tests cover formatFailureContext and retry evidence.

**S04 (Runtime Error Capture)** added `captureRuntimeErrors()`, which dynamically imports bg-shell and browser-tools to scan for runtime problems. Severity classification per D004: bg-shell crashes (crashed status, non-zero exit, fatal signal) and browser unhandled rejections are blocking; console.error is non-blocking; deprecation warnings are non-blocking. Any blocking error overrides `result.passed = false`, ensuring a crashed dev server fails the gate even when all static checks passed. The function uses dependency injection (`CaptureRuntimeErrorsOptions`) for testability. Evidence JSON and markdown both gained runtime error sections. 20 tests cover all severity classes and graceful degradation.

**S05 (Dependency Security Scan)** added `runDependencyAudit()`, which uses git diff to detect changes to package.json and 4 lockfile types (npm, pnpm, yarn, bun) at the project root, then runs `npm audit --json` and parses vulnerabilities into `AuditWarning` objects. Results are strictly non-blocking — they appear in evidence as warnings but never fail the gate. Evidence JSON and markdown gained audit warning sections with severity emojis. 18 tests cover lockfile detection, graceful failures, JSON parsing, and subdirectory exclusion.

The complete pipeline in `auto.ts` handleAgentEnd is now 4 sequential stages: (1) `runVerificationGate()` runs static commands, (2) `captureRuntimeErrors()` scans bg-shell/browser, (3) `runDependencyAudit()` checks dependencies, (4) `writeVerificationJSON()` persists evidence. The retry loop wraps stages 1–4, re-dispatching up to 2 times on failure before pausing for human review.

## Cross-Slice Verification

Every success criterion from the roadmap was verified:

| Criterion | Evidence |
|-----------|----------|
| Gate fires after every execute-task completion | `grep -n runVerificationGate auto.ts` → import (line 23) + call site (line 1521), guarded by `currentUnit.type === "execute-task"` |
| Commands discovered from preferences + package.json | 8+ discovery tests pass: preference override, task plan verify, package.json scripts, fallthrough, whitespace, partial |
| Evidence table in every task summary | Template has `## Verification Evidence` section. Prompt step 8 instructs agents. Validator enforces with warnings. |
| T##-VERIFY.json written alongside summaries | `writeVerificationJSON` called in auto.ts (lines 1589, 1592). 10+ JSON shape tests pass. |
| Auto-fix retry loop (2 cycles) | 3-path gate logic (pass/retry/exhaust) in handleAgentEnd. `formatFailureContext` 6 tests pass. Retry evidence fields 2 tests pass. |
| Server crashes block gate | `captureRuntimeErrors` 14 tests: crashed status, non-zero exit, SIGABRT/SIGSEGV/SIGBUS all produce blocking=true. Gate override at line ~1534. |
| Console.error/deprecation logged but don't block | 14 runtime error tests: console.error → blocking=false, deprecation → blocking=false. |
| npm audit conditional on lockfile changes | `runDependencyAudit` 12 tests: git diff detects 5 file types, graceful on non-git/invalid JSON. Never modifies result.passed. |
| All existing tests pass | Full suite: 1206+ pass, 8 fail (all pre-existing: 7 chokidar + 1 github-client). Zero regressions. |

Verification-specific test counts across the milestone: 69 tests covering verification-gate (42), verification-evidence (29), and dependency-audit (12) — all passing.

## Requirement Changes

- R001: active → validated — Gate fires in handleAgentEnd for every execute-task unit. 28 gate logic tests. Retry loop blocks completion. Gate before user hooks, non-fatal wrapper.
- R002: active → validated — discoverCommands() implements D003 order. 8+ discovery tests cover all paths. First-non-empty-wins precedence confirmed.
- R003: active → validated — writeVerificationJSON persists T##-VERIFY.json (schemaVersion 1). formatEvidenceTable generates 5-column markdown. Template, prompt, and auto.ts wired. 15+ tests.
- R004: active → validated — evidence_block_missing and evidence_block_placeholder validator rules. 4 validator tests. Same pattern as existing diagnostics rules.
- R005: active → validated — Retry loop with 3 paths in handleAgentEnd. formatFailureContext for prompt injection. pauseAuto on exhaustion. 8 tests. Module-level state with lifecycle management.
- R006: active → validated — captureRuntimeErrors scans bg-shell and browser. 14 tests for 7 severity classes + graceful degradation. Dynamic import with DI for testability.
- R007: active → validated — D004 severity classification. Crashes block, warnings log. Gate override in auto.ts flips result.passed. 14 classification tests.
- R008: active → validated — runDependencyAudit with git diff detection for 5 lockfile types. npm audit JSON parsing. Non-blocking. 12 tests.

## Forward Intelligence

### What the next milestone should know
- The verification gate pipeline in `auto.ts` handleAgentEnd (lines ~1520-1560) has 4 sequential stages and a retry wrapper. Any new verification logic should extend `VerificationResult` in `types.ts` and add a capture step between stages 1-3 and evidence writing (stage 4).
- `VerificationResult` is the canonical data structure flowing through gate → evidence → retry. It has grown across 5 slices to include: `checks`, `passed`, `discoverySource`, `timestamp`, `runtimeErrors?`, `auditWarnings?`. All optional fields use conditional presence (absent when empty).
- The `EvidenceJSON` schema is at `schemaVersion: 1`. Additive optional fields don't bump the version per D002. Only breaking changes warrant a version bump.
- Preferences `verification_commands`, `verification_auto_fix`, and `verification_max_retries` are fully wired (definition, validation, merge, consumption). Follow this 4-location pattern for new preference keys.
- The execute-task prompt now has 19 numbered steps (was 7 before M001). Step 8 covers evidence table population. New steps should be appended at the end.
- Plan assumed `readSlicePlan` exists — the correct function is `parsePlan` (from files.ts). Plan assumed 2-part unitId format (S01/T02) — actual format is 3-part (M001/S01/T03).

### What's fragile
- The gate block in `auto.ts` (~lines 1520-1630) is dense — 4 sequential stages, retry logic with 3 paths, 2 early returns that skip DB dual-write and post-unit hooks. Any new side effects added after the gate block must audit all return paths.
- `completedKeySet.delete` + `removePersistedKey` is load-bearing for retry re-dispatch. If the completion key format changes, retry will silently break.
- Dynamic imports in `captureRuntimeErrors()` use hardcoded paths (`../bg-shell/index.js`, `../browser-tools/...`). If extension module structure changes, capture silently returns `[]` (graceful but invisible).
- npm audit JSON parser expects specific field structure (`vulnerabilities` object with `severity`, `name`, `title`, `url`, `fixAvailable`). Format changes cause silent empty returns.
- The two separate `if (parts.length >= 3)` blocks in the gate section of auto.ts are not DRY — refactors to unit ID parsing must update both.

### Authoritative diagnostics
- `npm run test:unit -- --test-name-pattern "verification-gate|verification-evidence|dependency-audit"` — 69 tests covering the full verification contract. If these pass, the gate infrastructure is sound.
- `grep -n "runVerificationGate\|captureRuntimeErrors\|runDependencyAudit\|writeVerificationJSON" auto.ts` — should show exactly 4 imports and 4 call sites. More means accidental duplication; fewer means broken wiring.
- `T##-VERIFY.json` in any tasks directory — inspect `schemaVersion`, `passed`, `checks[].verdict`, optional `runtimeErrors`, optional `auditWarnings` for evidence correctness.
- stderr output during auto-mode with "verification-gate:" prefix is the primary operational signal for gate behavior.

### What assumptions changed
- Hook engine `retry_on` was assumed for retry mechanism — actual implementation uses module-level state parallel to `pendingCrashRecovery`, which is architecturally cleaner and avoids coupling to user hooks.
- `readSlicePlan` was assumed to exist — `parsePlan` from `files.ts` is the correct function.
- 2-part unitId format was assumed — actual format is 3-part (M001/S01/T03).
- Evidence write was assumed to nest inside existing conditional — required separate `if (parts.length >= 3)` block because `result` is in the enclosing scope.
- Table-embedded mustache rows were assumed to trigger placeholder detection — `normalizeMeaningfulLines` preserves table structure, so bare mustache lines are the correct placeholder format.

## Files Created/Modified

- `src/resources/extensions/gsd/types.ts` — Added VerificationCheck, VerificationResult, RuntimeError, AuditWarning interfaces
- `src/resources/extensions/gsd/preferences.ts` — Added verification_commands, verification_auto_fix, verification_max_retries to KNOWN_PREFERENCE_KEYS, GSDPreferences, mergePreferences, validatePreferences
- `src/resources/extensions/gsd/verification-gate.ts` — New module: discoverCommands, runVerificationGate, formatFailureContext, captureRuntimeErrors, runDependencyAudit
- `src/resources/extensions/gsd/verification-evidence.ts` — New module: writeVerificationJSON, formatEvidenceTable, EvidenceJSON/EvidenceCheckJSON/RuntimeErrorJSON/AuditWarningJSON types
- `src/resources/extensions/gsd/auto.ts` — Gate block in handleAgentEnd (~lines 1520-1630), retry state management, prompt injection in dispatchNextUnit, cleanup in stopAuto/pauseAuto
- `src/resources/extensions/gsd/templates/task-summary.md` — Added ## Verification Evidence section
- `src/resources/extensions/gsd/prompts/execute-task.md` — Added step 8 (evidence table instruction), renumbered subsequent steps
- `src/resources/extensions/gsd/observability-validator.ts` — Added evidence_block_missing and evidence_block_placeholder rules
- `src/resources/extensions/gsd/tests/verification-gate.test.ts` — New file: 42 tests (gate logic, discovery, runtime errors, dependency audit, formatFailureContext)
- `src/resources/extensions/gsd/tests/verification-evidence.test.ts` — New file: 29 tests (JSON shape, table formatting, validator, runtime errors, audit warnings, retry fields)
