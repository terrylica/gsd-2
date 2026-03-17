---
depends_on: []
---

# M004: Supervisor Upgrade

**Gathered:** 2026-03-16
**Status:** Ready for planning

## Project Description

Upgrade auto-mode supervision from a timer-driven watchdog (soft timeout → idle watchdog → hard timeout → pause) to bounded diagnostic reasoning. The supervisor inspects heuristic signals plus a brief activity summary, distinguishes "stuck" from "long-running," injects diagnostic context into the same session, and requests one bounded retry before escalating with a structured diagnostic report.

## Why This Milestone

The current supervisor (auto-supervisor.ts + idle watchdog in auto.ts) detects timeouts and injects generic "finish now" steering messages. It doesn't diagnose *why* the task stalled. A task stuck on a missing env var gets the same "do not keep exploring" message as a task stuck in an infinite loop. Bounded diagnostics gives the supervisor enough intelligence to craft specific recovery context — "the dev server crashed because PORT is already in use" vs "your last 5 tool calls were all reading the same file."

## User-Visible Outcome

### When this milestone is complete, the user can:

- See the supervisor distinguish between genuinely stuck tasks and legitimately long-running ones
- See diagnostic context in recovery messages (specific findings, not generic "finish now")
- See a structured diagnostic report when the supervisor escalates to pause
- See fewer false-positive pauses on complex tasks that are actively making progress

### Entry point / environment

- Entry point: `gsd auto` (supervisor is internal to auto-mode)
- Environment: local dev, terminal
- Live dependencies involved: none (operates on the GSD runtime itself)

## Completion Class

- Contract complete means: supervisor inspects activity logs, bg-shell health, and git status; classifies stuck vs active; injects diagnostic context into retry
- Integration complete means: diagnostic reasoning replaces generic steering messages in the existing timeout/idle recovery path
- Operational complete means: a real stuck task gets a diagnostic recovery message and a real active task is not interrupted

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A stuck task (no tool calls, no file changes, bg-shell crash) triggers diagnostic recovery with specific findings
- A long-running task (active tool calls, file changes accumulating) is not interrupted
- Recovery injection includes specific diagnostic context (not generic "finish now")
- When retry doesn't help, auto-mode pauses with a structured diagnostic report
- Existing timeout behavior is preserved for cases where diagnostics don't apply

## Risks and Unknowns

- Activity log format and query performance — reading and summarizing JSONL activity logs during idle watchdog intervals
- Diagnostic signal quality — heuristic signals may not cover all stall modes
- Cost of activity summary — even a brief summary adds latency to the recovery path
- False positive/negative balance — too aggressive diagnostics cause unnecessary pauses, too conservative misses real stalls

## Existing Codebase / Prior Art

- `src/resources/extensions/gsd/auto-supervisor.ts` — SIGTERM handler + detectWorkingTreeActivity (the entire current supervisor)
- `src/resources/extensions/gsd/auto.ts` lines 2970-3100 — idle watchdog, soft timeout, hard timeout, recoverTimedOutUnit
- `src/resources/extensions/gsd/auto.ts` lines 3215-3295 — recoverTimedOutUnit implementation with inspectExecuteTaskDurability
- `src/resources/extensions/gsd/activity-log.ts` — JSONL activity log writing
- `src/resources/extensions/gsd/unit-runtime.ts` — per-unit runtime records (startedAt, lastProgressAt, recoveryAttempts)
- `src/resources/extensions/gsd/preferences.ts` — AutoSupervisorConfig (model, soft/idle/hard timeout minutes)

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R016 — Active Supervisor — Bounded Diagnostics
- R017 — Supervisor Activity Heuristics

## Scope

### In Scope

- Diagnostic signal collection (activity logs, bg-shell health, git status, tool call recency)
- Activity summary synthesis (brief summary of last N activity log entries)
- Stuck vs long-running classification heuristics
- Diagnostic context injection into same-session recovery messages
- Structured diagnostic report on escalation (pause)
- Updated recoverTimedOutUnit with diagnostic reasoning path
- Existing timeout behavior preserved as fallback

### Out of Scope / Non-Goals

- Full LLM reasoning pass for diagnosis (R019 deferred)
- File editing by supervisor
- Silent skip decisions (must produce evidence)
- New preference keys beyond existing auto_supervisor config

## Technical Constraints

- Supervisor CANNOT edit files, commit, push, or take irreversible actions
- Supervisor CANNOT silently skip — must produce explicit evidence for skip decisions
- Diagnostic pass must complete within a few seconds (runs during idle watchdog interval)
- Must not break existing timeout behavior for projects without activity logs

## Integration Points

- `auto.ts` recoverTimedOutUnit — primary integration: add diagnostic reasoning before steering message
- `auto-supervisor.ts` — extend with diagnostic signal collection functions
- `activity-log.ts` — read/query interface for recent activity entries
- `unit-runtime.ts` — runtime records for diagnostic context
- bg-shell process manager — health check interface

## Implementation Decisions

- Recovery injects diagnostic context into **same session** (not fresh session)
- Diagnostic signals: **heuristic signals + brief activity summary** (not heuristic-only)
- Escalation path: **pause with structured diagnostic report** (not notify+skip+continue)
- Authority boundaries: CAN inspect, diagnose, inject context, request retry. CANNOT edit, commit, push, skip silently.

## Open Questions

- Activity log query performance — how many entries to summarize? Last 20? Last 5 minutes?
- Diagnostic report format — structured markdown? JSON? Both?
- Should the diagnostic pass run on every idle watchdog tick (15s) or only when the idle threshold is crossed?
