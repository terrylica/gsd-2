// GSD-2 + src/resources/extensions/gsd/orphan-stash-audit.ts
// Startup sweep for orphaned gsd-preflight-stash entries left behind by
// interrupted milestone merges (#5538-followup).

import { execFileSync } from "node:child_process";
import { GIT_NO_PROMPT_ENV } from "./git-constants.js";

export interface OrphanPreflightStashAuditResult {
  applied: Array<{ milestoneId: string; stashRef: string }>;
  warnings: string[];
}

/**
 * Audit `git stash list` for orphaned `gsd-preflight-stash:M00x:*` entries.
 *
 * The matching merge code in `phases.ts` previously skipped the postflight
 * pop whenever `mergeAndExit` threw, leaking the user's pre-merge working
 * tree into the stash list. For every preflight-stash entry whose milestone
 * is now complete (per the supplied callback), `git stash apply` is invoked —
 * NOT `pop`. The stash entry stays in the list so the user retains a backup
 * if the apply produces unexpected merge results. Idempotent across repeated
 * startup runs.
 *
 * Failures are best-effort: a list error (no repo, git unavailable) returns
 * an empty result. An apply error becomes a warning the user sees alongside
 * the existing orphan-branch audit messages — startup continues.
 */
export function auditOrphanedPreflightStashes(
  basePath: string,
  isMilestoneComplete: (milestoneId: string) => boolean,
): OrphanPreflightStashAuditResult {
  const result: OrphanPreflightStashAuditResult = { applied: [], warnings: [] };

  let listOutput: string;
  try {
    listOutput = execFileSync(
      "git",
      ["stash", "list", "--format=%gd%x00%s"],
      {
        cwd: basePath,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
        env: GIT_NO_PROMPT_ENV,
      },
    );
  } catch {
    return result;
  }

  const MARKER_RE = /\bgsd-preflight-stash:([A-Za-z0-9_-]+):/;
  for (const line of listOutput.split("\n")) {
    const sep = line.indexOf("\x00");
    if (sep < 0) continue;
    const ref = line.slice(0, sep);
    const subject = line.slice(sep + 1);
    if (!ref || !subject) continue;

    const match = MARKER_RE.exec(subject);
    if (!match) continue;
    const milestoneId = match[1];

    let complete = false;
    try {
      complete = isMilestoneComplete(milestoneId);
    } catch (err) {
      result.warnings.push(
        `Could not determine completion status for ${milestoneId} during preflight-stash audit: ${err instanceof Error ? err.message : String(err)}.`,
      );
      continue;
    }
    if (!complete) continue;

    try {
      execFileSync("git", ["stash", "apply", "--quiet", ref], {
        cwd: basePath,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
        env: GIT_NO_PROMPT_ENV,
      });
      result.applied.push({ milestoneId, stashRef: ref });
    } catch (err) {
      result.warnings.push(
        `Could not apply orphaned preflight stash ${ref} (milestone ${milestoneId}): ${err instanceof Error ? err.message : String(err)}. ` +
          `Run \`git stash apply ${ref}\` manually to restore your pre-merge changes.`,
      );
    }
  }

  return result;
}
