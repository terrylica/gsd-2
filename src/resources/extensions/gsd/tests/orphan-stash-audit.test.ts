// GSD-2 + src/resources/extensions/gsd/tests/orphan-stash-audit.test.ts
// Regression: orphaned gsd-preflight-stash entries from completed milestones
// must be auto-applied at startup so the user's pre-merge work returns.

import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { auditOrphanedPreflightStashes } from "../orphan-stash-audit.js";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf-8",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_AUTHOR_NAME: "test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  });
}

function pushPreflightStash(repo: string, milestoneId: string, fileName: string, content: string): string {
  writeFileSync(join(repo, fileName), content);
  const marker = `gsd-preflight-stash:${milestoneId}:42:1700000000000:abcd`;
  git(repo, "stash", "push", "--include-untracked", "-m", `gsd-preflight-stash [${marker}]`);
  return marker;
}

describe("auditOrphanedPreflightStashes", () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "orphan-stash-audit-"));
    git(repo, "init", "-q");
    git(repo, "config", "user.email", "test@example.com");
    git(repo, "config", "user.name", "test");
    writeFileSync(join(repo, "seed.txt"), "seed\n");
    git(repo, "add", "seed.txt");
    git(repo, "commit", "-q", "-m", "initial");
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  test("returns empty result when there are no stashes", () => {
    const result = auditOrphanedPreflightStashes(repo, () => true);
    assert.deepEqual(result, { applied: [], warnings: [] });
  });

  test("applies an orphan preflight stash when its milestone is complete", () => {
    pushPreflightStash(repo, "M002", "leftover.txt", "lost work\n");

    // Verify the file is gone (stashed away) before the audit runs.
    assert.equal(existsSync(join(repo, "leftover.txt")), false, "stash push must remove the file");

    const result = auditOrphanedPreflightStashes(repo, (id) => id === "M002");

    assert.equal(result.applied.length, 1, "expected exactly one stash applied");
    assert.equal(result.applied[0].milestoneId, "M002");
    assert.match(result.applied[0].stashRef, /^stash@\{\d+\}$/);
    assert.equal(result.warnings.length, 0);

    // The user's pre-merge content must be back in the working tree.
    assert.equal(existsSync(join(repo, "leftover.txt")), true);
    assert.equal(readFileSync(join(repo, "leftover.txt"), "utf-8"), "lost work\n");

    // The stash entry must remain (apply, not pop) so the user has a backup.
    const list = git(repo, "stash", "list");
    assert.match(list, /gsd-preflight-stash:M002:/);
  });

  test("ignores stashes whose milestone is not complete", () => {
    pushPreflightStash(repo, "M003", "wip.txt", "still-working\n");

    const result = auditOrphanedPreflightStashes(repo, () => false);

    assert.deepEqual(result, { applied: [], warnings: [] });
    // File stays stashed.
    assert.equal(existsSync(join(repo, "wip.txt")), false);
  });

  test("ignores non-gsd stash entries", () => {
    writeFileSync(join(repo, "manual.txt"), "manual\n");
    git(repo, "stash", "push", "--include-untracked", "-m", "user manual stash");

    const result = auditOrphanedPreflightStashes(repo, () => true);

    assert.deepEqual(result, { applied: [], warnings: [] });
  });

  test("collects a warning when the completion callback throws", () => {
    pushPreflightStash(repo, "M004", "danger.txt", "boom\n");

    const result = auditOrphanedPreflightStashes(repo, () => {
      throw new Error("db unavailable");
    });

    assert.equal(result.applied.length, 0);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /Could not determine completion status for M004/);
    assert.match(result.warnings[0], /db unavailable/);
  });

  test("collects a warning when stash apply fails (conflicting working tree)", () => {
    // Push a stash containing a change to seed.txt; then dirty seed.txt with
    // a conflicting modification before the audit runs so apply fails.
    writeFileSync(join(repo, "seed.txt"), "stashed\n");
    const marker = `gsd-preflight-stash:M005:42:1700:zz`;
    git(repo, "stash", "push", "-m", `gsd-preflight-stash [${marker}]`);

    // Dirty the working tree so apply will conflict.
    writeFileSync(join(repo, "seed.txt"), "conflicting modification\n");

    const result = auditOrphanedPreflightStashes(repo, () => true);

    assert.equal(result.applied.length, 0);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /Could not apply orphaned preflight stash/);
    assert.match(result.warnings[0], /M005/);
    assert.match(result.warnings[0], /git stash apply/);
  });

  test("returns empty result when basePath is not a git repo", () => {
    const nonRepo = mkdtempSync(join(tmpdir(), "orphan-stash-not-repo-"));
    try {
      const result = auditOrphanedPreflightStashes(nonRepo, () => true);
      assert.deepEqual(result, { applied: [], warnings: [] });
    } finally {
      rmSync(nonRepo, { recursive: true, force: true });
    }
  });
});
