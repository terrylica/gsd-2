// GSD-2 + Workspace handle tests: createWorkspace and scopeMilestone

import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  realpathSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createWorkspace, scopeMilestone } from "../workspace.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeProjectDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "gsd-ws-test-")));
  mkdirSync(join(dir, ".gsd", "milestones"), { recursive: true });
  return dir;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("createWorkspace", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = makeProjectDir();
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  test("from a project root produces mode=project and worktreeRoot=null", () => {
    const ws = createWorkspace(projectDir);
    assert.equal(ws.mode, "project");
    assert.equal(ws.worktreeRoot, null);
    assert.equal(ws.projectRoot, realpathSync(projectDir));
  });

  test("from a worktree path produces mode=worktree, worktreeRoot=realpath, projectRoot=realpath of project", () => {
    // Construct a worktree path: <projectDir>/.gsd/worktrees/M001
    const worktreePath = join(projectDir, ".gsd", "worktrees", "M001");
    mkdirSync(worktreePath, { recursive: true });

    const ws = createWorkspace(worktreePath);
    assert.equal(ws.mode, "worktree");
    assert.equal(ws.worktreeRoot, realpathSync(worktreePath));
    assert.equal(ws.projectRoot, realpathSync(projectDir));
  });

  test("normalizes /foo and /foo/ to identical identityKey", () => {
    const wsTrailing = createWorkspace(projectDir + "/");
    const wsNoTrailing = createWorkspace(projectDir);
    assert.equal(wsTrailing.identityKey, wsNoTrailing.identityKey);
  });

  test("follows symlinks — identityKey matches realpath of target", (t) => {
    const linkPath = join(tmpdir(), `gsd-ws-link-${Date.now()}`);
    symlinkSync(projectDir, linkPath);
    t.after(() => {
      try { rmSync(linkPath); } catch { /* ignore */ }
    });

    const ws = createWorkspace(linkPath);
    assert.equal(ws.identityKey, realpathSync(projectDir));
  });
});

describe("GsdWorkspace and MilestoneScope are frozen", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = makeProjectDir();
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  test("workspace is frozen", () => {
    const ws = createWorkspace(projectDir);
    assert.ok(Object.isFrozen(ws), "workspace should be frozen");
    assert.throws(() => {
      (ws as { mode: string }).mode = "worktree";
    }, /Cannot assign/);
  });

  test("scope is frozen", () => {
    const ws = createWorkspace(projectDir);
    const scope = scopeMilestone(ws, "M001");
    assert.ok(Object.isFrozen(scope), "scope should be frozen");
    assert.throws(() => {
      (scope as { milestoneId: string }).milestoneId = "M999";
    }, /Cannot assign/);
  });

  test("contract inside workspace is frozen", () => {
    const ws = createWorkspace(projectDir);
    assert.ok(Object.isFrozen(ws.contract), "contract should be frozen");
  });
});

describe("scopeMilestone path methods", () => {
  let projectDir: string;
  const MID = "M001";

  beforeEach(() => {
    projectDir = makeProjectDir();
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  test("produces correct paths for a known milestone ID", () => {
    const ws = createWorkspace(projectDir);
    const scope = scopeMilestone(ws, MID);
    const gsd = ws.contract.projectGsd;

    assert.equal(scope.milestoneId, MID);
    assert.equal(scope.contextFile(), join(gsd, "milestones", MID, `${MID}-CONTEXT.md`));
    assert.equal(scope.roadmapFile(), join(gsd, "milestones", MID, `${MID}-ROADMAP.md`));
    assert.equal(scope.stateFile(), join(gsd, "STATE.md"));
    assert.equal(scope.dbPath(), ws.contract.projectDb);
    assert.equal(scope.milestoneDir(), join(gsd, "milestones", MID));
    assert.equal(scope.metaJson(), join(gsd, `${MID}-META.json`));
  });

  test("two scopes from same workspace + same MID produce identical paths", () => {
    const ws = createWorkspace(projectDir);
    const scope1 = scopeMilestone(ws, MID);
    const scope2 = scopeMilestone(ws, MID);

    assert.equal(scope1.contextFile(), scope2.contextFile());
    assert.equal(scope1.roadmapFile(), scope2.roadmapFile());
    assert.equal(scope1.stateFile(), scope2.stateFile());
    assert.equal(scope1.dbPath(), scope2.dbPath());
    assert.equal(scope1.milestoneDir(), scope2.milestoneDir());
    assert.equal(scope1.metaJson(), scope2.metaJson());
  });
});
