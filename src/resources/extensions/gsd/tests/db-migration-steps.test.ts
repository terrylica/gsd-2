// Project/App: GSD-2
// File Purpose: Tests for extracted GSD database migration DDL steps.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { DbAdapter, DbStatement } from "../db-adapter.ts";
import {
  applyMigrationV2Artifacts,
  applyMigrationV3Memories,
  applyMigrationV4DecisionMadeBy,
  applyMigrationV5HierarchyTables,
  applyMigrationV8PlanningFields,
} from "../db-migration-steps.ts";

class FakeStatement implements DbStatement {
  run(): unknown {
    return undefined;
  }

  get(): Record<string, unknown> | undefined {
    return undefined;
  }

  all(): Record<string, unknown>[] {
    return [];
  }
}

class FakeAdapter implements DbAdapter {
  readonly execCalls: string[] = [];

  exec(sql: string): void {
    this.execCalls.push(sql);
  }

  prepare(): DbStatement {
    return new FakeStatement();
  }

  close(): void {}
}

describe("db-migration-steps", () => {
  test("early migrations create artifact, memory, hierarchy, and active decision structures", () => {
    const db = new FakeAdapter();

    applyMigrationV2Artifacts(db);
    applyMigrationV3Memories(db);
    applyMigrationV4DecisionMadeBy(db);
    applyMigrationV5HierarchyTables(db);

    assert.ok(db.execCalls.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS artifacts")));
    assert.ok(db.execCalls.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS memories")));
    assert.ok(db.execCalls.some((sql) => sql.includes("CREATE VIEW active_memories")));
    assert.ok(db.execCalls.some((sql) => sql.includes("ALTER TABLE decisions ADD COLUMN made_by")));
    assert.ok(db.execCalls.some((sql) => sql.includes("CREATE VIEW active_decisions")));
    assert.ok(db.execCalls.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS milestones")));
    assert.ok(db.execCalls.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS tasks")));
    assert.ok(db.execCalls.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS verification_evidence")));
  });

  test("planning migration adds planning columns and support tables", () => {
    const db = new FakeAdapter();

    applyMigrationV8PlanningFields(db);

    assert.ok(db.execCalls.some((sql) => sql.includes("ALTER TABLE milestones ADD COLUMN vision")));
    assert.ok(db.execCalls.some((sql) => sql.includes("ALTER TABLE slices ADD COLUMN goal")));
    assert.ok(db.execCalls.some((sql) => sql.includes("ALTER TABLE tasks ADD COLUMN description")));
    assert.ok(db.execCalls.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS replan_history")));
    assert.ok(db.execCalls.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS assessments")));
    assert.ok(db.execCalls.some((sql) => sql.includes("CREATE INDEX IF NOT EXISTS idx_replan_history_milestone")));
  });
});
