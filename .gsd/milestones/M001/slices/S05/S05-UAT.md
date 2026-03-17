# S05: Dependency Security Scan — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: All behavior is exercised through unit tests with injectable dependencies. No live npm audit or git operations needed — the function's I/O boundaries are fully mocked via D023 dependency injection pattern.

## Preconditions

- Repository cloned with dependencies installed (`npm install` completed)
- Node.js ≥20.6 available
- Tests runnable via `npm run test:unit`

## Smoke Test

Run `npm run test:unit -- --test-name-pattern "dependency-audit"` — all 12 tests pass, confirming core audit logic works end-to-end with mocked dependencies.

## Test Cases

### 1. Lockfile change detection triggers audit

1. Run `npm run test:unit -- --test-name-pattern "dependency-audit: package.json in git diff"`
2. Run `npm run test:unit -- --test-name-pattern "dependency-audit: package-lock.json"`
3. Run `npm run test:unit -- --test-name-pattern "dependency-audit: pnpm-lock.yaml"`
4. Run `npm run test:unit -- --test-name-pattern "dependency-audit: yarn.lock"`
5. Run `npm run test:unit -- --test-name-pattern "dependency-audit: bun.lockb"`
6. **Expected:** All 5 pass — each lockfile type triggers `npmAudit` call and returns parsed warnings.

### 2. No dependency changes skips audit

1. Run `npm run test:unit -- --test-name-pattern "dependency-audit: no dependency file changes"`
2. **Expected:** Passes — `npmAudit` is never called, returns empty array.

### 3. Graceful failure on non-git directory

1. Run `npm run test:unit -- --test-name-pattern "dependency-audit: git diff returns non-zero"`
2. **Expected:** Passes — returns empty array without throwing.

### 4. Graceful failure on invalid npm audit JSON

1. Run `npm run test:unit -- --test-name-pattern "dependency-audit: npm audit returns invalid JSON"`
2. **Expected:** Passes — returns empty array without throwing.

### 5. npm audit non-zero exit with valid vulnerabilities

1. Run `npm run test:unit -- --test-name-pattern "dependency-audit: npm audit non-zero exit"`
2. **Expected:** Passes — non-zero exit is treated as expected (vulnerabilities found), JSON is parsed into AuditWarning array with correct name/severity/title/url/fixAvailable fields.

### 6. Evidence JSON includes audit warnings

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence: writeVerificationJSON includes auditWarnings"`
2. **Expected:** Passes — T##-VERIFY.json contains `auditWarnings` array when result has warnings.

### 7. Evidence JSON omits audit warnings when absent or empty

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence: writeVerificationJSON omits auditWarnings when absent"`
2. Run `npm run test:unit -- --test-name-pattern "verification-evidence: writeVerificationJSON omits auditWarnings when empty"`
3. **Expected:** Both pass — `auditWarnings` key is not present in JSON output when undefined or empty array.

### 8. Evidence markdown renders audit warnings section

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence: formatEvidenceTable appends audit warnings"`
2. **Expected:** Passes — markdown output contains "Audit Warnings" heading and table with severity emojis (🔴/🟠/🟡/⚪), package name, title, and fix availability columns.

### 9. Evidence markdown omits section when no warnings

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence: formatEvidenceTable omits audit warnings section when none"`
2. **Expected:** Passes — no "Audit Warnings" section in markdown output.

### 10. Integration round-trip: VerificationResult → JSON → markdown

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence: integration.*auditWarnings"`
2. **Expected:** Passes — a VerificationResult with auditWarnings produces correct JSON file and markdown table.

## Edge Cases

### Subdirectory package.json does not trigger audit

1. Run `npm run test:unit -- --test-name-pattern "dependency-audit: subdirectory package.json"`
2. **Expected:** Passes — `packages/foo/package.json` in git diff does not trigger audit (only root-level files).

### npm audit returns zero vulnerabilities

1. Run `npm run test:unit -- --test-name-pattern "dependency-audit: npm audit returns zero vulnerabilities"`
2. **Expected:** Passes — returns empty array (not an error condition).

### Via entries with string-only values are skipped

1. Run `npm run test:unit -- --test-name-pattern "dependency-audit: via entries with string-only values"`
2. **Expected:** Passes — vulnerability entries where `via` contains only strings (transitive, not direct advisories) are handled without error.

## Failure Signals

- Any `dependency-audit:` test failure indicates broken audit logic or JSON parsing
- Any `verification-evidence:` test failure with "audit" in the name indicates broken evidence persistence
- `grep runDependencyAudit src/resources/extensions/gsd/auto.ts` returning fewer than 2 matches indicates broken wiring
- `npx --yes tsx src/resources/extensions/gsd/verification-gate.ts` producing output indicates compilation error

## Requirements Proved By This UAT

- R008 — Full coverage: conditional git diff detection (5 lockfile types), npm audit execution with JSON parsing, non-blocking warnings in evidence (JSON + markdown), graceful failure on all error paths, subdirectory exclusion, wiring into auto.ts gate pipeline

## Not Proven By This UAT

- Live npm audit execution against a real project with actual vulnerabilities (all tests use injected mocks)
- Actual stderr output formatting during a real auto-mode run
- Performance impact of synchronous `spawnSync` audit on large projects
- Interaction with pnpm/yarn/bun audit commands (only npm audit is implemented)

## Notes for Tester

- All tests use dependency injection — no real git or npm commands are executed
- The 8 pre-existing test failures (chokidar, @octokit/rest missing packages) are unrelated to S05
- To verify wiring manually: `grep -n "runDependencyAudit" src/resources/extensions/gsd/auto.ts` should show import at line 23 and call at line ~1540
