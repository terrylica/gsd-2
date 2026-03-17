# M001: Verification Enforcement

**Gathered:** 2026-03-16
**Status:** Ready for planning

## Project Description

Upgrade GSD auto-mode so that no task completes without machine-readable verification evidence. The verification gate is a built-in post-unit hook that runs after every execute-task, discovers and executes verification commands, captures runtime errors, and produces structured evidence (markdown + JSON). Failed verification triggers an auto-fix retry loop (2 attempts). The gate blocks task completion until verification passes or retries are exhausted.

## Why This Milestone

The current verification loop is socially enforced — prompts encourage the agent to run typecheck/lint/test but nothing prevents completion without proof. This creates defect leakage (broken-test commits), unreliable summaries (overstated proof), and avoidable human pauses. M001 makes verification mandatory at the infrastructure level.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Observe that every completed task has a structured verification evidence table in its summary
- See T##-VERIFY.json files alongside every task summary with machine-queryable results
- Trust that typecheck, lint, and test failures are caught before task completion
- See auto-fix attempts in evidence when verification initially fails
- See runtime errors (server crashes, unhandled rejections) surfaced in evidence
- See npm audit warnings when dependencies change (non-blocking)

### Entry point / environment

- Entry point: `gsd auto` (auto-mode execution)
- Environment: local dev, terminal
- Live dependencies involved: none (operates on the GSD runtime itself)

## Completion Class

- Contract complete means: verification gate fires after execute-task, runs commands, produces evidence, retries on failure, captures runtime errors, runs npm audit conditionally
- Integration complete means: gate integrates with existing hook engine, dispatch rules, and auto-recovery without breaking existing auto-mode flows
- Operational complete means: existing GSD test suite passes, no regressions in auto-mode lifecycle

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A real execute-task completion triggers the verification gate and produces both markdown evidence and JSON artifact
- A task with failing typecheck gets 2 auto-fix attempts before the gate fails
- Server crashes from bg-shell are captured in evidence and block the gate
- Console.error from browser is logged but does not block
- npm audit runs when lockfile changes, warnings appear in evidence
- All existing GSD tests still pass

## Risks and Unknowns

- Built-in hook vs user-configured hook architecture — the current hook engine is entirely user-configured via preferences. Making a "built-in" hook that always runs requires a new code path that doesn't conflict with user hooks.
- Hook-on-hook prevention — the verification gate is itself a hook; it must not trigger other hooks or be triggered by them.
- Verification command discovery from package.json — must handle missing scripts, monorepo workspaces, and non-npm projects gracefully.
- Runtime error capture timing — bg-shell output must be checked after the task's work is done but before marking complete. Race conditions with async server output.

## Existing Codebase / Prior Art

- `src/resources/extensions/gsd/post-unit-hooks.ts` — hook engine with queue, cycles, retry_on, artifact idempotency, pre-dispatch hooks, state persistence. This is the primary integration surface.
- `src/resources/extensions/gsd/auto-dispatch.ts` — dispatch rules evaluated in order. The verification gate may need a new dispatch integration point.
- `src/resources/extensions/gsd/auto-recovery.ts` — artifact verification, skip logic, retry. The auto-fix loop extends this.
- `src/resources/extensions/gsd/auto.ts` — 3800-line auto-mode orchestrator. `handleAgentEnd` at line 1276 is where hook checking happens after unit completion.
- `src/resources/extensions/gsd/preferences.ts` — typed preference loading. New preference keys: `verification_commands`, `verification_auto_fix`, `verification_max_retries`.
- `src/resources/extensions/gsd/observability-validator.ts` — validates summary structure. Extends to validate evidence block presence.
- `src/resources/extensions/gsd/files.ts` — UatType union, parsers, frontmatter. Evidence block parsing goes here.
- `src/resources/extensions/gsd/types.ts` — PostUnitHookConfig, HookDispatchResult, etc. New types for verification evidence.
- `src/resources/extensions/gsd/templates/task-summary.md` — template updated to include evidence section.
- `src/resources/extensions/gsd/prompts/execute-task.md` — prompt updated to reference verification evidence requirements.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001 — Enforced verification gate (primary)
- R002 — Verification command discovery
- R003 — Structured verification evidence (MD + JSON)
- R004 — Evidence block validation
- R005 — Verification auto-fix retry loop
- R006 — Runtime error capture
- R007 — Crash-severity gate
- R008 — Dependency security scan

## Scope

### In Scope

- Built-in verification gate hook that fires after execute-task
- Verification command discovery (preferences → task plan → package.json)
- Structured evidence format (markdown table + JSON artifact)
- Evidence block validation in observability-validator
- Auto-fix retry loop (2 retries, configurable)
- Runtime error capture from bg-shell and browser console
- Crash-severity classification (crashes block, warnings log)
- Conditional npm audit on lockfile changes (non-blocking)
- Preference keys for verification configuration
- Template and prompt updates

### Out of Scope / Non-Goals

- UAT type expansion (M002)
- browser_verify_flow tool (M002)
- RUNTIME.md stack contracts (M002)
- Git push/PR automation (M003)
- Deploy-and-verify hook (M003)
- Supervisor upgrade (M004)

## Technical Constraints

- Must not break existing user-configured post-unit hooks
- Must not create hook-on-hook chains (verification hook must not trigger other hooks)
- Must work in all git isolation modes (worktree, branch, none)
- Must handle projects without package.json gracefully
- Evidence JSON schema must be forward-compatible

## Integration Points

- `post-unit-hooks.ts` — primary integration surface for the built-in gate
- `auto.ts` handleAgentEnd — where verification triggers after unit completion
- `preferences.ts` — new preference keys
- `observability-validator.ts` — evidence block validation
- `templates/task-summary.md` — evidence section
- `prompts/execute-task.md` — evidence requirements in task prompt

## Open Questions

- Should the built-in verification gate be implemented as a hardcoded hook in `auto.ts` handleAgentEnd (before user hooks fire) or as a special "built-in" entry in the hook engine? Leaning toward hardcoded in handleAgentEnd — simpler, no risk of user disabling it, clear separation from user hooks.
- Should verification commands run in the worktree cwd or the project root? Worktree cwd — that's where the code lives during execution.
