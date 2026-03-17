# Requirements

This file is the explicit capability and coverage contract for the project.

## Validated

### R001 — Enforced Verification Gate
- Class: core-capability
- Status: validated
- Description: A built-in post-unit hook fires after every execute-task completion, runs discovered verification commands, and blocks task completion until all pass or explicit override.
- Why it matters: Without mechanical enforcement, verification is prompt-dependent (~30% coverage). This makes it mandatory (~95%).
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S03
- Validation: Gate fires in handleAgentEnd for execute-task units (auto.ts line 1521). 28 unit tests for gate logic. Retry loop blocks completion until pass or exhaustion. Code review confirms gate before user hooks, non-fatal wrapper.
- Notes: Hardcoded in auto.ts handleAgentEnd (D001). Built-in hooks are distinct from user-configured hooks.

### R002 — Verification Command Discovery
- Class: core-capability
- Status: validated
- Description: Verification gate discovers commands from (a) `verification_commands` preference, (b) task plan `verify:` field, (c) package.json scripts (typecheck, lint, test). Preference overrides auto-detection.
- Why it matters: Auto-detection is ergonomic for projects with standard scripts. Preference override gives control for non-standard setups.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: discoverCommands() implements D003 order. 8+ discovery tests cover all paths including fallthrough, whitespace, partial scripts. First-non-empty-wins confirmed.
- Notes: Discovery order: explicit preference → task plan → package.json. First non-empty source wins.

### R003 — Structured Verification Evidence (MD + JSON)
- Class: primary-user-loop
- Status: validated
- Description: Every task summary contains a canonical verification evidence table. A machine-readable T##-VERIFY.json is written alongside the summary.
- Why it matters: Structured evidence enables downstream querying (milestone validation, regression audit) without parsing prose.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: writeVerificationJSON persists T##-VERIFY.json (schemaVersion 1). formatEvidenceTable generates 5-column markdown. Template, prompt, and auto.ts wired. 15+ tests pass.
- Notes: JSON schema versioned at schemaVersion 1. stdout/stderr excluded from JSON per D021.

### R004 — Evidence Block Validation
- Class: quality-attribute
- Status: validated
- Description: The verification gate validates that the task summary contains a well-formed evidence block before allowing completion. Missing or malformed evidence blocks fail the gate.
- Why it matters: Ensures evidence is always present and machine-parseable, not just encouraged by prompts.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: evidence_block_missing and evidence_block_placeholder rules in observability-validator.ts. 4 validator tests prove acceptance of real evidence and rejection of missing/placeholder content.
- Notes: Validator rules are warnings (same pattern as diagnostics rules).

### R005 — Verification Auto-Fix Retry Loop (2 retries)
- Class: core-capability
- Status: validated
- Description: When verification commands fail, the agent gets up to 2 auto-fix attempts. Failure context (stderr, exit code) is injected into the retry prompt. After 2 failures, the gate fails and surfaces for human review.
- Why it matters: Most verification failures are fixable (typos, missing imports, lint issues). Auto-fix eliminates unnecessary human pauses.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: 3-path gate logic (pass/retry/exhaust) in handleAgentEnd. formatFailureContext 6 tests pass. Retry evidence with retryAttempt/maxRetries fields 2 tests pass. pauseAuto on exhaustion confirmed.
- Notes: Uses module-level retry state parallel to pendingCrashRecovery pattern (not hook retry_on). Max retries configurable via `verification_max_retries` preference.

### R006 — Runtime Error Capture (bg-shell + browser console)
- Class: failure-visibility
- Status: validated
- Description: After browser verification or dev server execution, the verification gate captures and reviews server stderr/stdout from bg-shell processes and browser console errors.
- Why it matters: Prevents "tests pass but server is crashing" blindness. Surfaces runtime errors that static checks miss.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: captureRuntimeErrors() scans bg-shell (crashed, non-zero exit, fatal signal, recentErrors) and browser console (errors, warnings, unhandled rejections). 14 unit tests cover all 7 severity classes plus graceful degradation.
- Notes: Dynamic import with dependency injection for testability (D023).

### R007 — Crash-Severity Gate (crashes block, warnings log)
- Class: quality-attribute
- Status: validated
- Description: Unhandled rejections and process crashes fail the verification gate. Console.error and deprecation warnings are logged in evidence but do not block.
- Why it matters: Distinguishes fatal from informational — prevents false failures from third-party library noise while catching real crashes.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: D004 severity classification. 14 tests verify blocking (crash/unhandled rejection) and non-blocking (console.error/deprecation). Gate override in auto.ts flips result.passed on blocking errors.
- Notes: Severity classification: crash/unhandled rejection = blocking. console.error/deprecation = logged, non-blocking.

### R008 — Dependency Security Scan
- Class: quality-attribute
- Status: validated
- Description: If package.json or lockfile changed during task execution, `npm audit --audit-level=moderate` runs. High/critical vulnerabilities appear in evidence as warnings. Non-blocking — warn, don't fail.
- Why it matters: Catches supply-chain risks early without interrupting flow for low-severity issues.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: none
- Validation: runDependencyAudit() uses git diff to detect 5 lockfile types, runs npm audit --json, parses vulnerabilities. 12 unit tests cover all paths. Non-blocking confirmed — never modifies result.passed.
- Notes: Only npm audit supported (not pnpm/yarn/bun audit). Conditional on git diff detecting lockfile changes.

## Active

### R009 — Executable UAT Type System Expansion
- Class: core-capability
- Status: active
- Description: Expand UAT types to 5: artifact-driven, browser-executable, runtime-executable, human-judgment, mixed. Only human-judgment and mixed pause for human review.
- Why it matters: Currently ~70% of UAT pauses for humans. After expansion, ~20% (only genuinely subjective checks).
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: M002/S04
- Validation: unmapped
- Notes: Extends existing UatType union in files.ts. Updates pauseAfterDispatch logic in auto-dispatch.ts.

### R010 — browser_verify_flow Composite Tool
- Class: core-capability
- Status: active
- Description: A higher-level browser tool that composes existing primitives (navigate, assert, fill_form, screenshot, batch, diff) into deterministic, evidence-producing flows with retry and failure capture.
- Why it matters: Currently the agent composes many primitive calls each time. This reduces token cost and increases determinism for common verification patterns.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Lives in browser-tools/ as a general extension, not GSD-specific. Input: flow steps with assertions. Output: structured PASS/FAIL + debug bundle.

### R011 — Runtime Stack Contracts (RUNTIME.md)
- Class: continuity
- Status: active
- Description: A declarative project-level contract (.gsd/RUNTIME.md) specifying how to boot, seed, and observe the application. Consumed by execute-task and run-uat prompts.
- Why it matters: Eliminates repeated ad-hoc inference of startup commands. Makes boot/seed/observe deterministic.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: M002/S04
- Validation: unmapped
- Notes: Fields: startup command, readiness probe, services, seed command, preview URLs, observability endpoints.

### R012 — RUNTIME.md Auto-Generation During Planning
- Class: continuity
- Status: active
- Description: Agent auto-generates RUNTIME.md during milestone planning by analyzing package.json scripts, docker-compose, and project config.
- Why it matters: User doesn't need to manually author the stack contract. Agent infers it from project evidence.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Generated during plan-milestone or plan-slice. Updated when stack changes. User can override.

### R013 — Full UAT Lifecycle (boot → run → teardown)
- Class: core-capability
- Status: active
- Description: For browser-executable and runtime-executable UAT, the agent boots the app using RUNTIME.md, runs the verification flow, then tears down. Fully autonomous.
- Why it matters: Currently UAT requires human to have the app running. Full lifecycle enables true autonomous verification.
- Source: user
- Primary owning slice: M002/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Requires RUNTIME.md to exist. Falls back to current behavior if missing.

### R014 — Git Push + Draft PR on Milestone Completion
- Class: operability
- Status: active
- Description: Opt-in automation: after complete-milestone, push milestone branch to remote and create draft PR with milestone summary as body. Preference-gated via git.auto_push and git.auto_pr.
- Why it matters: Eliminates manual git ceremony per milestone. Draft PRs only — never auto-merge.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Milestone-level only. Uses gh CLI for PR creation. Runs gh pr checks and reports status.

### R015 — Deploy-and-Verify Hook (Vercel first)
- Class: operability
- Status: active
- Description: Post-milestone hook that deploys via Vercel CLI/MCP, polls for deployment readiness, runs browser smoke tests against the preview URL, and writes deployment verification evidence.
- Why it matters: Closes the local→production gap. Local verification doesn't catch deploy-time issues.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Vercel first. Uses vercel CLI (installed at /opt/homebrew/bin/vercel) or Vercel MCP. Smoke checks via browser_verify_flow.

### R016 — Active Supervisor — Bounded Diagnostics
- Class: failure-visibility
- Status: active
- Description: Upgrade supervisor from timer-driven watchdog to bounded diagnostic reasoning: inspect activity logs, check bg-shell processes for crashes, distinguish stuck from long-running, inject recovery context, request one bounded retry before escalating.
- Why it matters: Current supervisor only detects timeouts. Bounded diagnostics enables smarter recovery without human intervention (~40% → ~60% autonomous recovery).
- Source: user
- Primary owning slice: M004/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Authority boundaries: CAN inspect, diagnose, inject context, request retry. CANNOT edit files, commit, push, or silently skip.

### R017 — Supervisor Activity Heuristics
- Class: quality-attribute
- Status: active
- Description: Supervisor uses activity heuristics to distinguish "stuck" (no tool calls, no file changes) from "long-running" (active tool usage, git changes accumulating). Only intervenes on genuine stalls.
- Why it matters: Prevents false-positive timeouts on legitimately complex tasks.
- Source: user
- Primary owning slice: M004/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Heuristics: working-tree activity (already exists), tool call recency from activity logs, bg-shell process health.

## Deferred

### R018 — Deploy Provider Abstraction (multi-provider)
- Class: operability
- Status: deferred
- Description: Abstract deploy-and-verify across multiple providers (Vercel, Railway, custom). Currently Vercel-only.
- Why it matters: Future-proofs deploy hook for diverse deployment targets.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred until a second provider is actually needed. Vercel covers the immediate use case.

### R019 — Full Active Supervisor (LLM reasoning pass)
- Class: quality-attribute
- Status: deferred
- Description: Supervisor gets its own LLM reasoning pass (Haiku for triage, stronger model for escalation) to analyze failures, generate hypotheses, and craft recovery prompts.
- Why it matters: More powerful but higher cost per timeout event. Bounded diagnostics covers the immediate need.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — bounded diagnostics first. Upgrade path: add LLM pass when heuristic-based diagnostics prove insufficient.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | core-capability | validated | M001/S01 | M001/S03 | 28 gate tests, retry loop blocks, code review |
| R002 | core-capability | validated | M001/S01 | none | 8+ discovery tests, D003 order confirmed |
| R003 | primary-user-loop | validated | M001/S02 | none | 15+ evidence tests, template/prompt/auto.ts wired |
| R004 | quality-attribute | validated | M001/S02 | none | 4 validator tests, evidence_block rules |
| R005 | core-capability | validated | M001/S03 | none | 8 retry tests, 3-path gate logic, pauseAuto |
| R006 | failure-visibility | validated | M001/S04 | none | 14 tests, 7 severity classes, graceful degradation |
| R007 | quality-attribute | validated | M001/S04 | none | 14 tests, D004 classification, gate override |
| R008 | quality-attribute | validated | M001/S05 | none | 12 tests, 5 lockfile types, non-blocking |
| R009 | core-capability | active | M002/S01 | M002/S04 | unmapped |
| R010 | core-capability | active | M002/S02 | none | unmapped |
| R011 | continuity | active | M002/S03 | M002/S04 | unmapped |
| R012 | continuity | active | M002/S03 | none | unmapped |
| R013 | core-capability | active | M002/S04 | none | unmapped |
| R014 | operability | active | M003/S01 | none | unmapped |
| R015 | operability | active | M003/S02 | none | unmapped |
| R016 | failure-visibility | active | M004/S01 | none | unmapped |
| R017 | quality-attribute | active | M004/S01 | none | unmapped |
| R018 | operability | deferred | none | none | unmapped |
| R019 | quality-attribute | deferred | none | none | unmapped |

## Coverage Summary

- Active requirements: 9
- Mapped to slices: 9
- Validated: 8
- Deferred: 2
- Unmapped active requirements: 0
