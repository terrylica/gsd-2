// Project/App: GSD-2
// File Purpose: Schema migration DDL steps for the GSD database facade.

import type { DbAdapter } from "./db-adapter.js";
import { ensureColumn } from "./db-schema-metadata.js";

export function applyMigrationV2Artifacts(db: DbAdapter): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS artifacts (
      path TEXT PRIMARY KEY,
      artifact_type TEXT NOT NULL DEFAULT '',
      milestone_id TEXT DEFAULT NULL,
      slice_id TEXT DEFAULT NULL,
      task_id TEXT DEFAULT NULL,
      full_content TEXT NOT NULL DEFAULT '',
      imported_at TEXT NOT NULL DEFAULT ''
    )
  `);
}

export function applyMigrationV3Memories(db: DbAdapter): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.8,
      source_unit_type TEXT,
      source_unit_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      superseded_by TEXT DEFAULT NULL,
      hit_count INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_processed_units (
      unit_key TEXT PRIMARY KEY,
      activity_file TEXT,
      processed_at TEXT NOT NULL
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_memories_active ON memories(superseded_by)");
  db.exec("DROP VIEW IF EXISTS active_memories");
  db.exec("CREATE VIEW active_memories AS SELECT * FROM memories WHERE superseded_by IS NULL");
}

export function applyMigrationV4DecisionMadeBy(db: DbAdapter): void {
  ensureColumn(db, "decisions", "made_by", "ALTER TABLE decisions ADD COLUMN made_by TEXT NOT NULL DEFAULT 'agent'");
  db.exec("DROP VIEW IF EXISTS active_decisions");
  db.exec("CREATE VIEW active_decisions AS SELECT * FROM decisions WHERE superseded_by IS NULL");
}

export function applyMigrationV5HierarchyTables(db: DbAdapter): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      completed_at TEXT DEFAULT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS slices (
      milestone_id TEXT NOT NULL,
      id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      risk TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL DEFAULT '',
      completed_at TEXT DEFAULT NULL,
      PRIMARY KEY (milestone_id, id),
      FOREIGN KEY (milestone_id) REFERENCES milestones(id)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      milestone_id TEXT NOT NULL,
      slice_id TEXT NOT NULL,
      id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      one_liner TEXT NOT NULL DEFAULT '',
      narrative TEXT NOT NULL DEFAULT '',
      verification_result TEXT NOT NULL DEFAULT '',
      duration TEXT NOT NULL DEFAULT '',
      completed_at TEXT DEFAULT NULL,
      blocker_discovered INTEGER DEFAULT 0,
      deviations TEXT NOT NULL DEFAULT '',
      known_issues TEXT NOT NULL DEFAULT '',
      key_files TEXT NOT NULL DEFAULT '[]',
      key_decisions TEXT NOT NULL DEFAULT '[]',
      full_summary_md TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (milestone_id, slice_id, id),
      FOREIGN KEY (milestone_id, slice_id) REFERENCES slices(milestone_id, id)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL DEFAULT '',
      slice_id TEXT NOT NULL DEFAULT '',
      milestone_id TEXT NOT NULL DEFAULT '',
      command TEXT NOT NULL DEFAULT '',
      exit_code INTEGER DEFAULT 0,
      verdict TEXT NOT NULL DEFAULT '',
      duration_ms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (milestone_id, slice_id, task_id) REFERENCES tasks(milestone_id, slice_id, id)
    )
  `);
}

export function applyMigrationV6SliceSummaries(db: DbAdapter): void {
  ensureColumn(db, "slices", "full_summary_md", "ALTER TABLE slices ADD COLUMN full_summary_md TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "slices", "full_uat_md", "ALTER TABLE slices ADD COLUMN full_uat_md TEXT NOT NULL DEFAULT ''");
}

export function applyMigrationV7Dependencies(db: DbAdapter): void {
  ensureColumn(db, "slices", "depends", "ALTER TABLE slices ADD COLUMN depends TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "slices", "demo", "ALTER TABLE slices ADD COLUMN demo TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "milestones", "depends_on", "ALTER TABLE milestones ADD COLUMN depends_on TEXT NOT NULL DEFAULT '[]'");
}

export function applyMigrationV8PlanningFields(db: DbAdapter): void {
  ensureColumn(db, "milestones", "vision", "ALTER TABLE milestones ADD COLUMN vision TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "milestones", "success_criteria", "ALTER TABLE milestones ADD COLUMN success_criteria TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "milestones", "key_risks", "ALTER TABLE milestones ADD COLUMN key_risks TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "milestones", "proof_strategy", "ALTER TABLE milestones ADD COLUMN proof_strategy TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "milestones", "verification_contract", "ALTER TABLE milestones ADD COLUMN verification_contract TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "milestones", "verification_integration", "ALTER TABLE milestones ADD COLUMN verification_integration TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "milestones", "verification_operational", "ALTER TABLE milestones ADD COLUMN verification_operational TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "milestones", "verification_uat", "ALTER TABLE milestones ADD COLUMN verification_uat TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "milestones", "definition_of_done", "ALTER TABLE milestones ADD COLUMN definition_of_done TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "milestones", "requirement_coverage", "ALTER TABLE milestones ADD COLUMN requirement_coverage TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "milestones", "boundary_map_markdown", "ALTER TABLE milestones ADD COLUMN boundary_map_markdown TEXT NOT NULL DEFAULT ''");

  ensureColumn(db, "slices", "goal", "ALTER TABLE slices ADD COLUMN goal TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "slices", "success_criteria", "ALTER TABLE slices ADD COLUMN success_criteria TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "slices", "proof_level", "ALTER TABLE slices ADD COLUMN proof_level TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "slices", "integration_closure", "ALTER TABLE slices ADD COLUMN integration_closure TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "slices", "observability_impact", "ALTER TABLE slices ADD COLUMN observability_impact TEXT NOT NULL DEFAULT ''");

  ensureColumn(db, "tasks", "description", "ALTER TABLE tasks ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tasks", "estimate", "ALTER TABLE tasks ADD COLUMN estimate TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tasks", "files", "ALTER TABLE tasks ADD COLUMN files TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "tasks", "verify", "ALTER TABLE tasks ADD COLUMN verify TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "tasks", "inputs", "ALTER TABLE tasks ADD COLUMN inputs TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "tasks", "expected_output", "ALTER TABLE tasks ADD COLUMN expected_output TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "tasks", "observability_impact", "ALTER TABLE tasks ADD COLUMN observability_impact TEXT NOT NULL DEFAULT ''");

  db.exec(`
    CREATE TABLE IF NOT EXISTS replan_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      milestone_id TEXT NOT NULL DEFAULT '',
      slice_id TEXT DEFAULT NULL,
      task_id TEXT DEFAULT NULL,
      summary TEXT NOT NULL DEFAULT '',
      previous_artifact_path TEXT DEFAULT NULL,
      replacement_artifact_path TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (milestone_id) REFERENCES milestones(id)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS assessments (
      path TEXT PRIMARY KEY,
      milestone_id TEXT NOT NULL DEFAULT '',
      slice_id TEXT DEFAULT NULL,
      task_id TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT '',
      scope TEXT NOT NULL DEFAULT '',
      full_content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (milestone_id) REFERENCES milestones(id)
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_replan_history_milestone ON replan_history(milestone_id, created_at)");
}
