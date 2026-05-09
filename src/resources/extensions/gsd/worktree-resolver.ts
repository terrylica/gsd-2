// GSD-2 — WorktreeResolver: encapsulates worktree path state and merge/exit lifecycle.
/**
 * WorktreeResolver — encapsulates worktree path state and merge/exit lifecycle.
 *
 * Replaces scattered `s.basePath`/`s.originalBasePath` mutation and 3 duplicated
 * merge-or-teardown blocks in auto-loop.ts with single method calls. All
 * `s.basePath` mutations (except session.reset() and initial setup) happen
 * through this class.
 *
 * Design: Option A — mutates AutoSession fields directly so existing `s.basePath`
 * reads continue to work everywhere without wiring changes.
 *
 * Key invariant: `createAutoWorktree()` and `enterAutoWorktree()` call
 * `process.chdir()` internally — this class MUST NOT double-chdir.
 */

import type { AutoSession } from "./auto/session.js";
import { debugLog } from "./debug-logger.js";
import { resolveWorktreeProjectRoot } from "./worktree-root.js";
import {
  WorktreeLifecycle,
  type WorktreeLifecycleDeps,
} from "./worktree-lifecycle.js";
import { WorktreeStateProjection } from "./worktree-state-projection.js";

// ─── Dependency Interface ──────────────────────────────────────────────────

export interface WorktreeResolverDeps {
  isInAutoWorktree: (basePath: string) => boolean;
  shouldUseWorktreeIsolation: () => boolean;
  getIsolationMode: (basePath?: string) => "worktree" | "branch" | "none";
  mergeMilestoneToMain: (
    basePath: string,
    milestoneId: string,
    roadmapContent: string,
  ) => { pushed: boolean; codeFilesChanged: boolean };
  syncWorktreeStateBack: (
    mainBasePath: string,
    worktreePath: string,
    milestoneId: string,
  ) => { synced: string[] };
  teardownAutoWorktree: (
    basePath: string,
    milestoneId: string,
    opts?: { preserveBranch?: boolean },
  ) => void;
  createAutoWorktree: (basePath: string, milestoneId: string) => string;
  enterAutoWorktree: (basePath: string, milestoneId: string) => string;
  enterBranchModeForMilestone: (basePath: string, milestoneId: string) => void;
  getAutoWorktreePath: (basePath: string, milestoneId: string) => string | null;
  autoCommitCurrentBranch: (
    basePath: string,
    reason: string,
    milestoneId: string,
  ) => void;
  getCurrentBranch: (basePath: string) => string;
  /**
   * Force-checkout the named branch in `basePath`. Required by `_mergeBranchMode`
   * when it discovers the working tree is not on the milestone branch — preflight
   * stash + later operations may have switched HEAD to main, and silently skipping
   * the merge would strand the milestone's commits.
   */
  checkoutBranch: (basePath: string, branch: string) => void;
  autoWorktreeBranch: (milestoneId: string) => string;
  resolveMilestoneFile: (
    basePath: string,
    milestoneId: string,
    fileType: string,
  ) => string | null;
  readFileSync: (path: string, encoding: string) => string;
  GitServiceImpl: new (basePath: string, gitConfig: unknown) => unknown;
  loadEffectiveGSDPreferences: () =>
    | { preferences?: { git?: Record<string, unknown> } }
    | undefined;
  invalidateAllCaches: () => void;
  captureIntegrationBranch: (
    basePath: string,
    mid: string,
  ) => void;
}

// ─── Notify Context ────────────────────────────────────────────────────────

export interface NotifyCtx {
  notify: (
    msg: string,
    level?: "info" | "warning" | "error" | "success",
  ) => void;
}

// ─── Path Helpers ──────────────────────────────────────────────────────────

/**
 * Resolve the project root from session path state.
 *
 * Prefers `originalBasePath` (always the project root when set), but falls
 * back to `basePath` when `originalBasePath` is falsy (e.g. fresh AutoSession
 * with default empty string). If `basePath` itself is inside a worktree
 * directory (including symlink-resolved ~/.gsd/projects/<hash>/worktrees
 * paths), recover the actual project root to prevent double nesting (#3729).
 */
export function resolveProjectRoot(
  originalBasePath: string,
  basePath: string,
): string {
  return resolveWorktreeProjectRoot(basePath, originalBasePath);
}

// ─── WorktreeResolver ──────────────────────────────────────────────────────

export class WorktreeResolver {
  private readonly s: AutoSession;
  private readonly deps: WorktreeResolverDeps;

  constructor(session: AutoSession, deps: WorktreeResolverDeps) {
    this.s = session;
    this.deps = deps;
  }

  // ── Getters ────────────────────────────────────────────────────────────

  /** Current working path — may be worktree or project root. */
  get workPath(): string {
    return this.s.basePath;
  }

  /** Original project root — always the non-worktree path. */
  get projectRoot(): string {
    return resolveProjectRoot(this.s.originalBasePath, this.s.basePath);
  }

  /** Path for auto.lock file — same as the old lockBase(). */
  get lockPath(): string {
    return resolveProjectRoot(this.s.originalBasePath, this.s.basePath);
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  private rebuildGitService(): void {
    const gitConfig =
      this.deps.loadEffectiveGSDPreferences()?.preferences?.git ?? {};
    this.s.gitService = new this.deps.GitServiceImpl(
      this.s.basePath,
      gitConfig,
    ) as AutoSession["gitService"];
  }

  /** Restore basePath to originalBasePath and rebuild GitService. */
  private restoreToProjectRoot(): void {
    if (!this.s.originalBasePath) return;
    this.s.basePath = this.s.originalBasePath;
    this.rebuildGitService();
    this.deps.invalidateAllCaches();
  }

  // ── Validation ──────────────────────────────────────────────────────────

  /** Validate milestoneId to prevent path traversal. */
  private validateMilestoneId(milestoneId: string): void {
    if (/[\/\\]|\.\./.test(milestoneId)) {
      throw new Error(
        `Invalid milestoneId: ${milestoneId} — contains path separators or traversal`,
      );
    }
  }

  // ── Enter Milestone ────────────────────────────────────────────────────
  // The enterMilestone verb moved to the Worktree Lifecycle Module
  // (ADR-016 / issue #5585). External callers use WorktreeLifecycle.enterMilestone.
  // The internal mergeAndEnterNext recursion calls _enterMilestoneCore directly.

  // ── Exit Milestone ─────────────────────────────────────────────────────
  //
  // The exitMilestone (no-merge) and mergeAndExit (merge) bodies moved into
  // WorktreeLifecycle in slice 7 / step D of ADR-016. The methods below are
  // thin delegators that preserve the legacy `void` / throw shape for the
  // remaining callers (auto.ts:stopAuto, auto-start.ts orphan reaping). They
  // retire together with the rest of WorktreeResolver in step E.

  private buildLifecycle(): WorktreeLifecycle {
    const lifecycleDeps: WorktreeLifecycleDeps = {
      ...(this.deps as unknown as WorktreeLifecycleDeps),
      worktreeProjection: new WorktreeStateProjection(),
    };
    return new WorktreeLifecycle(this.s, lifecycleDeps);
  }

  exitMilestone(
    milestoneId: string,
    ctx: NotifyCtx,
    opts?: { preserveBranch?: boolean },
  ): void {
    this.validateMilestoneId(milestoneId);
    const result = this.buildLifecycle().exitMilestone(
      milestoneId,
      { merge: false, preserveBranch: opts?.preserveBranch },
      ctx,
    );
    if (!result.ok && result.cause instanceof Error) {
      throw result.cause;
    }
  }

  // ── Merge and Exit ─────────────────────────────────────────────────────
  //
  // Body moved to WorktreeLifecycle (ADR-016 / slice 7 / step D). Delegates
  // here keep the legacy `void` / throw shape for the remaining callers
  // (auto.ts:stopAuto, auto-start.ts orphan reaping). They retire together
  // with the rest of WorktreeResolver in step E.

  mergeAndExit(milestoneId: string, ctx: NotifyCtx): void {
    this.validateMilestoneId(milestoneId);
    const result = this.buildLifecycle().exitMilestone(
      milestoneId,
      { merge: true },
      ctx,
    );
    if (!result.ok && result.cause instanceof Error) {
      throw result.cause;
    }
    return mergeResult;
  }

  mergeAndEnterNext(
    currentMilestoneId: string,
    nextMilestoneId: string,
    ctx: NotifyCtx,
  ): void {
    this.buildLifecycle().mergeAndEnterNext(
      currentMilestoneId,
      nextMilestoneId,
      ctx,
    );
  }
}
