import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { checkoutBranchWithStashGuard } from "../auto-worktree.ts";

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf-8",
  });
}

function createRepo(t: { after: (fn: () => void) => void }): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "checkout-stash-guard-")));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(["init"], dir);
  git(["config", "user.email", "test@example.com"], dir);
  git(["config", "user.name", "Test User"], dir);
  writeFileSync(join(dir, "note.txt"), "base\n");
  git(["add", "note.txt"], dir);
  git(["commit", "-m", "init"], dir);
  git(["branch", "-M", "main"], dir);
  return dir;
}

describe("checkoutBranchWithStashGuard", () => {
  test("restores dirty working tree after successful checkout", (t) => {
    const repo = createRepo(t);
    git(["checkout", "-b", "milestone/M001"], repo);
    git(["checkout", "main"], repo);

    writeFileSync(join(repo, "note.txt"), "dirty\n");

    checkoutBranchWithStashGuard(repo, "milestone/M001", "test-success");

    const branch = git(["branch", "--show-current"], repo).trim();
    assert.equal(branch, "milestone/M001");
    const content = git(["show", "HEAD:note.txt"], repo).trim();
    assert.equal(content, "base");
    const wtContent = git(["status", "--porcelain"], repo);
    assert.match(wtContent, /note\.txt/);
  });

  test("restores dirty working tree when checkout throws", (t) => {
    const repo = createRepo(t);
    writeFileSync(join(repo, "note.txt"), "dirty\n");

    assert.throws(
      () => checkoutBranchWithStashGuard(repo, "milestone/DOES-NOT-EXIST", "test-failure"),
    );

    const status = git(["status", "--porcelain"], repo);
    assert.match(status, /note\.txt/);
    const stashList = git(["stash", "list"], repo).trim();
    assert.equal(stashList, "");
  });
});
