---
depends_on: [M001]
---

# M002: Executable UAT

**Gathered:** 2026-03-16
**Status:** Ready for planning

## Project Description

Eliminate UAT pauses for everything the agent can verify itself. Expand UAT types so only genuinely subjective checks pause for humans. Introduce browser_verify_flow as a higher-level composite tool for deterministic browser verification. Add RUNTIME.md as a declarative stack contract for boot/seed/observe. Enable full UAT lifecycle: boot → run → teardown.

## Why This Milestone

Currently ~70% of UAT pauses for human review. Most of these are mechanically verifiable — browser flows, CLI outputs, file artifacts. The agent has Playwright, bg-shell, and all the primitives needed. The gap is structure: UAT types don't distinguish automatable from subjective, there's no composite flow tool, and boot/seed is inferred ad-hoc every time.

## User-Visible Outcome

### When this milestone is complete, the user can:

- See browser-executable UAT run autonomously (boot app, exercise flow, assert, teardown) without human intervention
- See runtime-executable UAT run CLI commands and API checks without pausing
- See only human-judgment and mixed UAT types pause for review
- See RUNTIME.md auto-generated during planning with project stack details
- Use browser_verify_flow in any project (not just GSD) for deterministic browser verification

### Entry point / environment

- Entry point: `gsd auto` (auto-mode execution), `browser_verify_flow` (general tool)
- Environment: local dev, terminal + browser
- Live dependencies involved: dev server (via RUNTIME.md), possibly database/services

## Completion Class

- Contract complete means: UAT type expansion works, browser_verify_flow produces structured results, RUNTIME.md is generated and consumed
- Integration complete means: run-uat prompt uses RUNTIME.md for boot, browser_verify_flow for flows, auto-dispatch respects new UAT types
- Operational complete means: full lifecycle (boot → run → teardown) works for a real web app

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A browser-executable UAT boots the app via RUNTIME.md, runs a real browser flow via browser_verify_flow, produces evidence, and tears down
- A runtime-executable UAT runs CLI commands and produces evidence without pausing
- human-judgment and mixed UAT types still pause correctly
- RUNTIME.md is auto-generated during planning and consumed by UAT runner
- browser_verify_flow works as a standalone tool outside GSD context

## Risks and Unknowns

- RUNTIME.md readiness detection across diverse stacks — not just HTTP (daemons, CLI tools, non-HTTP services)
- browser_verify_flow state interaction with existing browser-tools page registry, trace, HAR
- Service teardown reliability — ensuring all bg-shell processes are killed after UAT
- General-purpose RUNTIME.md schema that handles web apps, CLI tools, daemons, and non-HTTP services

## Existing Codebase / Prior Art

- `src/resources/extensions/gsd/files.ts` — UatType union: `'artifact-driven' | 'live-runtime' | 'human-experience' | 'mixed'`
- `src/resources/extensions/gsd/auto-dispatch.ts` — pauseAfterDispatch logic for run-uat
- `src/resources/extensions/gsd/prompts/run-uat.md` — UAT execution prompt
- `src/resources/extensions/gsd/templates/uat.md` — UAT file template
- `src/resources/extensions/browser-tools/index.ts` — extension registration pattern (registerXTools)
- `src/resources/extensions/browser-tools/tools/assertions.ts` — browser_assert, browser_batch patterns
- `src/resources/extensions/browser-tools/BROWSER-TOOLS-V2-PROPOSAL.md` — design alignment reference

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R009 — Executable UAT Type System Expansion
- R010 — browser_verify_flow Composite Tool
- R011 — Runtime Stack Contracts
- R012 — RUNTIME.md Auto-Generation
- R013 — Full UAT Lifecycle

## Scope

### In Scope

- UAT type expansion: add browser-executable and runtime-executable types
- browser_verify_flow tool in browser-tools/ extension
- RUNTIME.md template and auto-generation during planning
- Full UAT lifecycle (boot → run → teardown) using RUNTIME.md
- Updated run-uat prompt to consume RUNTIME.md and execute browser/runtime UAT
- Executable UAT steps inline in UAT markdown file
- Process teardown after UAT completion

### Out of Scope / Non-Goals

- Verification gate changes (M001)
- Git push/PR automation (M003)
- Deploy-and-verify (M003)
- Supervisor upgrade (M004)

## Technical Constraints

- browser_verify_flow must follow existing browser-tools extension patterns (registerXTools, ToolDeps)
- RUNTIME.md schema must be general-purpose (web apps, CLI, daemons, non-HTTP)
- New UAT types must not break existing artifact-driven and human-experience types
- Teardown must kill all bg-shell processes started for UAT

## Integration Points

- `files.ts` UatType union — expanded
- `auto-dispatch.ts` pauseAfterDispatch — updated for new types
- `prompts/run-uat.md` — RUNTIME.md injection, executable UAT instructions
- `templates/uat.md` — executable checks section
- `browser-tools/index.ts` — registerFlowTools registration
- `browser-tools/tools/flow.ts` — new tool
- `prompts/plan-milestone.md` / `prompts/plan-slice.md` — RUNTIME.md generation instructions

## Implementation Decisions

- browser_verify_flow uses **structured step arrays** (like browser_batch but with inline assertions, retry policy, and failure capture)
- Executable UAT steps are **inline in S##-UAT.md** with a structured `## Executable Checks` section
- After UAT completes, **all processes started for UAT are killed** (clean teardown)
- RUNTIME.md is **general-purpose**: covers web apps, CLI tools, daemons, and non-HTTP services
- On flow failure, browser_verify_flow captures **full debug bundle** (screenshot, console, network, HAR)

## Open Questions

- RUNTIME.md readiness probes for non-HTTP services — file existence? Port open? Custom command?
- browser_verify_flow retry policy — per-step retry or whole-flow retry?
- How to handle RUNTIME.md updates when stack changes mid-milestone
