---
depends_on: []
---

# M003: Operational Automation

**Gathered:** 2026-03-16
**Status:** Ready for planning

## Project Description

Close the loop from code to production without manual ceremony. After milestone completion, automatically push to remote, create a draft PR with the milestone summary as body, and optionally deploy to Vercel preview environment with browser smoke verification against the preview URL.

## Why This Milestone

Every milestone completion currently requires manual git ceremony: push, create PR, check CI, deploy, verify. This is repeatable busywork the agent can handle. The deploy-and-verify step also closes the gap between "works locally" and "works in production" — local verification doesn't catch deploy-time issues (missing env vars, build config, edge runtime incompatibilities).

## User-Visible Outcome

### When this milestone is complete, the user can:

- See milestone branch auto-pushed to remote after completion (opt-in)
- See a draft PR created automatically with milestone summary as body
- See CI check status reported after PR creation
- See Vercel preview deployment triggered via CLI after push
- See browser smoke tests run against the Vercel preview URL with evidence
- See deployment verification evidence in milestone validation

### Entry point / environment

- Entry point: `gsd auto` (post-milestone hooks)
- Environment: local dev → remote git → Vercel preview
- Live dependencies involved: GitHub (PR creation), Vercel (deployment), preview URL (smoke tests)

## Completion Class

- Contract complete means: push, PR, deploy, and smoke test functions work individually
- Integration complete means: full chain fires after complete-milestone in auto-mode
- Operational complete means: a real milestone pushes, creates PR, deploys to Vercel preview, and smoke tests pass

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A completed milestone auto-pushes to remote and creates a draft PR with milestone summary as body
- gh pr checks reports CI status after PR creation
- vercel deploy triggers a preview deployment (not production by default)
- Browser smoke tests run against the preview URL and produce verification evidence
- All steps are preference-gated and can be individually enabled/disabled

## Risks and Unknowns

- Vercel project linking — does the project need `vercel link` before deploy works?
- Preview URL discovery — parse vercel CLI output for the deployment URL
- Smoke test definition — which flows to run against the preview? Reuse browser_verify_flow from M002?
- GitHub authentication — gh CLI must be authenticated for PR creation

## Existing Codebase / Prior Art

- `src/resources/extensions/gsd/git-service.ts` — GitPreferences with auto_push, push_branches. Core git operations.
- `src/resources/extensions/gsd/auto.ts` — complete-milestone handling at line 3661
- `src/resources/extensions/gsd/auto-dispatch.ts` — completing-milestone dispatch rule
- `src/resources/extensions/gsd/prompts/complete-milestone.md` — milestone completion prompt
- `src/resources/extensions/gsd/post-unit-hooks.ts` — hook engine for post-milestone hooks
- `src/resources/extensions/gsd/preferences.ts` — GitPreferences interface, preference loading
- Vercel CLI v50.10.1 installed at /opt/homebrew/bin/vercel

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R014 — Git Push + Draft PR on Milestone Completion
- R015 — Deploy-and-Verify Hook (Vercel first)

## Scope

### In Scope

- Git push to remote after milestone completion (preference-gated)
- Draft PR creation via gh CLI with milestone summary as body
- CI status check via gh pr checks
- Vercel preview deployment via explicit `vercel deploy` CLI command
- Preview URL discovery from vercel CLI output
- Browser smoke tests against preview URL
- Deployment verification evidence in milestone validation
- Preference keys: git.auto_push, git.auto_pr, deploy.provider, deploy.smoke_checks

### Out of Scope / Non-Goals

- Production deployments by default (preview only — production requires explicit preference override)
- Multi-provider deploy abstraction (Vercel only for now, R018 deferred)
- Per-slice push/PR (milestone-level only)
- Auto-merge (draft PRs only, never auto-merge)

## Technical Constraints

- Must use existing gh CLI for PR creation (not GitHub API directly)
- Must use vercel CLI for deployment (not Vercel API directly)
- Preview environment by default — production deploy requires explicit `deploy.environment: production` preference
- All outward-facing actions (push, PR, deploy) are preference-gated and require configuration
- Draft PRs only — never auto-merge or auto-approve

## Integration Points

- `git-service.ts` — push functions
- `post-unit-hooks.ts` or `auto.ts` — post-milestone trigger
- `preferences.ts` — new git.auto_pr preference, new deploy preferences
- `prompts/complete-milestone.md` — push/PR instructions when enabled
- browser_verify_flow (from M002) — smoke tests against preview URL

## Implementation Decisions

- PR body uses **milestone summary directly** — includes all slice summaries, decisions, and evidence
- Deploy via **explicit vercel CLI** (`vercel deploy`), not push-triggered git integration
- **Preview environment by default** — production requires explicit preference override
- Smoke tests reuse **browser_verify_flow** from M002 when available

## Open Questions

- Vercel project linking workflow — should GSD run `vercel link` automatically if not linked?
- Preview URL parsing — vercel CLI output format for extracting the preview URL
- Smoke test configuration — how does the user specify which flows to run against preview?
