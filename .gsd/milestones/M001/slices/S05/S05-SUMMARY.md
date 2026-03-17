---
id: S05
parent: M001
milestone: M001
provides:
  - "runDependencyAudit(cwd, options?) function — git diff detection + npm audit JSON parsing"
  - "AuditWarning interface and auditWarnings optional field on VerificationResult"
  - "AuditWarningJSON interface and auditWarnings on EvidenceJSON"
  - "Conditional npm audit step wired into auto.ts gate pipeline"
  - "Audit warnings in evidence JSON (T##-VERIFY.json) and evidence markdown table"
requires:
  - slice: S01
    provides: "verification-gate.ts gate pipeline extension point, VerificationResult type"
  - slice: S02
    provides: "verification-evidence.ts writeVerificationJSON/formatEvidenceTable"
affects: []
key_files:
  - src/resources/extensions/gsd/types.ts
  - src/resources/extensions/gsd/verification-gate.ts
  - src/resources/extensions/gsd/verification-evidence.ts
  - src/resources/extensions/gsd/auto.ts
  - src/resources/extensions/gsd/tests/verification-gate.test.ts
  - src/resources/extensions/gsd/tests/verification-evidence.test.ts
key_decisions: []
patterns_established:
  - "DependencyAuditOptions injectable deps pattern — mirrors CaptureRuntimeErrorsOptions from S04 for testability"
  - "auditWarnings follows same conditional-inclusion pattern as runtimeErrors: only in JSON/markdown when non-empty"
  - "Top-level-only file matching via basename + path equality for git diff results"
observability_surfaces:
  - "stderr: 'verification-gate: N audit warning(s)' when found, per-warning detail lines"
  - "stderr: 'verification-gate: npm audit skipped (no dependency changes)' when skipped"
  - "evidence-json: auditWarnings array in T##-VERIFY.json (absent when empty)"
  - "evidence-markdown: 'Audit Warnings' section with severity emoji table (absent when empty)"
drill_down_paths:
  - .gsd/milestones/M001/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S05/tasks/T02-SUMMARY.md
duration: 27m
verification_result: passed
completed_at: 2026-03-17
---

# S05: Dependency Security Scan

**Conditional npm audit runs when package.json or lockfile changes — results surface as non-blocking warnings in verification evidence JSON and markdown**

## What Happened

T01 added the core `runDependencyAudit(cwd, options?)` function to `verification-gate.ts` with the `AuditWarning` interface and optional `auditWarnings` field on `VerificationResult`. The function uses git diff to detect changes to any of 5 dependency files (package.json, package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lockb) at the project root only (subdirectory package.json excluded via basename + path equality). When changes are found, it runs `npm audit --audit-level=moderate --json`, parses the JSON output into structured `AuditWarning[]` objects, and returns them. All error paths (non-git dir, missing lockfile, invalid JSON, npm not found) return empty array without throwing. Non-zero npm audit exit codes are treated as expected (vulnerabilities found, not errors). The function uses dependency injection (`DependencyAuditOptions` with injectable `gitDiff`/`npmAudit`) following the same D023 pattern established by `captureRuntimeErrors` in S04.

T02 wired the audit function into the verification pipeline. In `verification-evidence.ts`, it added `AuditWarningJSON` to `EvidenceJSON` and extended `writeVerificationJSON` with conditional inclusion (same pattern as `runtimeErrors` — only present when non-empty). `formatEvidenceTable` gained an "Audit Warnings" markdown section with severity emojis (🔴 critical, 🟠 high, 🟡 moderate, ⚪ low). In `auto.ts`, `runDependencyAudit(basePath)` was added to the gate block after `captureRuntimeErrors()` at line 1540, with stderr logging of warning count and per-warning details. Audit warnings never modify `result.passed` — they are strictly non-blocking.

## Verification

| Check | Status |
|-------|--------|
| `npm run test:unit -- --test-name-pattern "dependency-audit"` | ✅ 12 pass |
| `npm run test:unit -- --test-name-pattern "verification-evidence"` | ✅ 29 pass (23 existing + 6 new) |
| `npm run test:unit` | ✅ 1106 pass, 8 pre-existing fail (chokidar/octokit) |
| `npx --yes tsx src/resources/extensions/gsd/verification-gate.ts` | ✅ compiles cleanly |
| `npx --yes tsx src/resources/extensions/gsd/verification-evidence.ts` | ✅ compiles cleanly |
| `npm run test:unit -- --test-name-pattern "dependency-audit.*empty array"` | ✅ graceful failure paths pass |
| `grep runDependencyAudit auto.ts` — import + call site | ✅ line 23 + line 1540 |

## Requirements Advanced

- R008 — Fully implemented: conditional npm audit with git diff detection, JSON parsing, non-blocking evidence integration

## Requirements Validated

- R008 — 12 unit tests cover all paths: lockfile detection (5 file types), graceful failures (non-git, invalid JSON, npm error), JSON parsing, subdirectory exclusion. 6 evidence tests prove JSON/markdown persistence. Wiring confirmed in auto.ts. Gate never fails on audit warnings.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None

## Known Limitations

- Only `npm audit` is supported — pnpm/yarn/bun audit commands are not invoked even when their lockfiles trigger the scan. The audit always uses npm regardless of which lockfile changed.
- Audit runs synchronously via `spawnSync` — in large projects this could add latency to the gate pipeline.

## Follow-ups

- none

## Files Created/Modified

- `src/resources/extensions/gsd/types.ts` — Added `AuditWarning` interface (name, severity, title, url, fixAvailable) and `auditWarnings?: AuditWarning[]` on `VerificationResult`
- `src/resources/extensions/gsd/verification-gate.ts` — Added `DependencyAuditOptions`, `defaultGitDiff`, `defaultNpmAudit`, and exported `runDependencyAudit()` function
- `src/resources/extensions/gsd/verification-evidence.ts` — Added `AuditWarningJSON` interface, `auditWarnings` on `EvidenceJSON`, conditional JSON persistence and markdown formatting with severity emojis
- `src/resources/extensions/gsd/auto.ts` — Added `runDependencyAudit` import (line 23) and audit call in gate block (line 1540) with stderr logging
- `src/resources/extensions/gsd/tests/verification-gate.test.ts` — Added 12 `dependency-audit:` test cases
- `src/resources/extensions/gsd/tests/verification-evidence.test.ts` — Added 6 audit warning evidence tests

## Forward Intelligence

### What the next slice should know
- S05 completes M001. All 5 slices are done. The verification gate pipeline in `auto.ts` now has 4 sequential steps: (1) `runVerificationGate()`, (2) `captureRuntimeErrors()`, (3) `runDependencyAudit()`, (4) evidence writing. The gate block starts around line 1520 in auto.ts.
- The `VerificationResult` type has grown across S01-S05 to include: `checks`, `passed`, `duration`, `retryAttempt`/`maxRetries` (S03), `runtimeErrors` (S04), and `auditWarnings` (S05). All optional fields follow the same pattern — absent when empty, present when populated.

### What's fragile
- `auto.ts` gate block (lines ~1520-1560) — this is a dense section with 4 sequential steps and conditional logic. Insertions or reorderings here require care.
- npm audit JSON format — the parser expects `vulnerabilities` as an object with entries having `severity`, `name`, `title`, `url`, `fixAvailable` fields. If npm changes this format, parsing silently returns empty array (graceful but silent).

### Authoritative diagnostics
- `npm run test:unit -- --test-name-pattern "dependency-audit"` — 12 tests covering all audit paths
- `npm run test:unit -- --test-name-pattern "verification-evidence"` — 29 tests covering all evidence paths including audit
- `grep -n "runDependencyAudit" src/resources/extensions/gsd/auto.ts` — confirms wiring at import and call site

### What assumptions changed
- None — S05 was low-risk and executed as planned
