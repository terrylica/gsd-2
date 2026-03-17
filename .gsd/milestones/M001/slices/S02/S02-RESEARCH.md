# S02: Structured Evidence Format — Research

**Date:** 2026-03-16

## Summary

S02 takes the `VerificationResult` produced by S01's gate and writes it two ways: (1) a `## Verification Evidence` markdown table injected into every task summary, and (2) a `T##-VERIFY.json` file written alongside the summary in the tasks directory. It also extends the observability validator to reject summaries that lack a well-formed evidence block. This is straightforward file-writing and validator-extending work — all patterns already exist in the codebase.

The main integration point is the verification gate block in `auto.ts` (lines ~1490–1540). After `runVerificationGate()` returns a `VerificationResult`, S02 adds a call to write the JSON artifact and — if the task summary file exists at that point — inject the evidence table. The JSON write is unconditional (it uses `writeFileSync` to the tasks dir). The markdown injection may need to be done by the agent during summary writing rather than post-hoc, since the summary is authored by the agent in execute-task, not generated programmatically. The cleaner approach is: (a) write JSON from auto.ts right after the gate, (b) update the task summary template to include an evidence section the agent fills, and (c) add a validator rule that rejects summaries without an evidence block.

## Recommendation

Three independent work units:

1. **Evidence writer module** (`verification-evidence.ts`): A new pure module with `writeVerificationJSON(result, tasksDir, taskId)` that writes `T##-VERIFY.json` and `formatEvidenceTable(result)` that returns a markdown string. Call the JSON writer from the gate block in `auto.ts`. The JSON schema should be versioned (`"schemaVersion": 1`).

2. **Template + prompt update**: Add a `## Verification Evidence` section to the task summary template. Update the execute-task prompt to instruct the agent to populate the evidence table from gate output. The gate already logs results to stderr/notify — the agent sees these and transcribes them into the summary.

3. **Validator extension**: Add an `evidence_block_missing` rule to `validateTaskSummaryContent()` in `observability-validator.ts` that checks for the `## Verification Evidence` section and rejects summaries where it's missing or placeholder-only.

## Implementation Landscape

### Key Files

- `src/resources/extensions/gsd/verification-gate.ts` — S01's gate module. S02 imports `VerificationResult` type but does NOT modify this file.
- `src/resources/extensions/gsd/verification-evidence.ts` — **New file.** Pure functions: `writeVerificationJSON(result, dir, taskId)` and `formatEvidenceTable(result)`. No side effects beyond the JSON write.
- `src/resources/extensions/gsd/auto.ts` — Lines ~1490–1540: add `writeVerificationJSON` call right after `runVerificationGate()` returns, inside the same try/catch block. Needs: import the new module, resolve the tasks directory path using `resolveTasksDir(basePath, mid, sid)`, and call with `(result, tasksDir, tid)`.
- `src/resources/extensions/gsd/observability-validator.ts` — `validateTaskSummaryContent()` function (line ~269): add a rule checking for `## Verification Evidence` section presence. Follow the exact pattern of the existing `missing_diagnostics_section` rule — use `getSection(content, "Verification Evidence", 2)` and `sectionLooksPlaceholderOnly()`.
- `src/resources/extensions/gsd/templates/task-summary.md` — Add `## Verification Evidence` section between `## Verification` and `## Diagnostics`. Content is a markdown table with columns: Check, Command, Exit Code, Verdict, Duration.
- `src/resources/extensions/gsd/prompts/execute-task.md` — Add instruction telling the agent to populate the evidence table from gate output visible in stderr/notify messages.
- `src/resources/extensions/gsd/types.ts` — No changes needed. `VerificationResult` and `VerificationCheck` already have all required fields.
- `src/resources/extensions/gsd/tests/verification-evidence.test.ts` — **New file.** Tests for JSON writing, markdown table formatting, and validator rules.

### Build Order

1. **T01: Evidence writer module + JSON schema** — Create `verification-evidence.ts` with the two pure functions. Write tests for JSON output shape (schema version, check fields, timestamps) and markdown table formatting. This is the foundation — everything else depends on it.

2. **T02: Auto.ts integration + template/prompt updates** — Wire `writeVerificationJSON` into the gate block in auto.ts. Update the task summary template and execute-task prompt. This depends on T01's module existing.

3. **T03: Validator extension + integration tests** — Add the evidence block rule to `validateTaskSummaryContent()`. Add tests that validate summaries with/without evidence blocks. Verify the full chain: gate runs → JSON written → validator rejects summaries without evidence.

### Verification Approach

- `npm run test:unit -- --test-name-pattern "verification-evidence"` — unit tests for the new module
- `npm run test:unit -- --test-name-pattern "verification-gate"` — S01's 28 tests still pass (no regressions)
- `npm run test:unit` — full suite passes
- Check that `T##-VERIFY.json` is written to the correct directory by the test (temp dir isolation)
- Check that `validateTaskSummaryContent()` returns an error for summaries missing `## Verification Evidence`
- Check that `validateTaskSummaryContent()` returns no error when the section is present and non-placeholder

## Constraints

- The `resolveFile()` function in `paths.ts` only resolves `.md` files — JSON artifacts must be written directly via `writeFileSync` to the tasks directory, not through the resolver.
- `writeFileSync` and `mkdirSync` are already imported in `auto.ts` (line 86) — no new imports needed for the fs operations.
- The gate block in auto.ts already has the parsed `mid`, `sid`, `tid` variables from the unitId split (line ~1498) — reuse them for path resolution.
- JSON schema must be forward-compatible per milestone constraints — use `"schemaVersion": 1` so S04/S05 can add `runtimeErrors` and `auditResults` fields without breaking consumers.
- The evidence markdown table is authored by the agent, not injected programmatically — the gate logs results and the agent transcribes them. This avoids complex post-hoc file patching.

## Common Pitfalls

- **Writing JSON before tasks dir exists** — The tasks directory may not exist if this is the first task. Use `mkdirSync(tasksDir, { recursive: true })` before `writeFileSync`. The auto.ts code already does this pattern (line 3200).
- **Validator false positives on legacy summaries** — Existing summaries (like S01's task summaries) don't have the evidence section. The validator rule should only fire for summaries created after S02 ships, or be a warning not an error. Since existing rules are all `severity: "warning"`, follow that pattern.
- **Gate block path resolution when unitId has unexpected format** — The existing gate block already guards `parts.length >= 3` before extracting mid/sid/tid. The JSON write should be inside that same guard.

## JSON Schema

```json
{
  "schemaVersion": 1,
  "taskId": "T03",
  "unitId": "M001/S01/T03",
  "timestamp": 1710000000000,
  "passed": true,
  "discoverySource": "package-json",
  "checks": [
    {
      "command": "npm run typecheck",
      "exitCode": 0,
      "durationMs": 2340,
      "verdict": "pass"
    }
  ]
}
```

Note: `stdout`/`stderr` are intentionally excluded from JSON to avoid unbounded file sizes. The full output is in `VerificationResult` in memory and logged to stderr during the gate run.
