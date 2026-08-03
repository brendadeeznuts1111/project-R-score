// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Concept Registry DDL — idempotent CREATE + light migrations.
 */
import type { Database } from 'bun:sqlite';

export const CONCEPT_REGISTRY_DDL = `
CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY, -- brand-ok — glossary concept key
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'composite',
  category TEXT NOT NULL DEFAULT 'ui',
  group_name TEXT NOT NULL DEFAULT '',
  domain TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('draft', 'proposed', 'active', 'deprecated', 'archived', 'rejected')),
  color TEXT,
  unit TEXT,
  format TEXT,
  summary TEXT,
  maps_to TEXT,
  see_also_json TEXT NOT NULL DEFAULT '[]',
  source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deprecated_at TEXT,
  deprecated_by TEXT,
  deprecation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_concepts_status ON concepts(status);
CREATE INDEX IF NOT EXISTS idx_concepts_category ON concepts(category);
CREATE INDEX IF NOT EXISTS idx_concepts_group ON concepts(group_name);
CREATE INDEX IF NOT EXISTS idx_concepts_domain ON concepts(domain);

CREATE TABLE IF NOT EXISTS concept_versions (
  concept_id TEXT NOT NULL REFERENCES concepts(id),
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'system',
  PRIMARY KEY (concept_id, version)
);

CREATE TABLE IF NOT EXISTS concept_usage (
  concept_id TEXT NOT NULL REFERENCES concepts(id),
  board TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT NOT NULL,
  PRIMARY KEY (concept_id, board, file_path)
);

CREATE INDEX IF NOT EXISTS idx_concept_usage_concept ON concept_usage(concept_id);

CREATE TABLE IF NOT EXISTS concept_provenance (
  concept_id TEXT NOT NULL REFERENCES concepts(id),
  correlation_id TEXT NOT NULL, -- brand-ok — work-item provenance ref
  author TEXT NOT NULL DEFAULT 'system',
  committed_at TEXT NOT NULL,
  PRIMARY KEY (concept_id, correlation_id)
);

CREATE TABLE IF NOT EXISTS concept_review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  concept_id TEXT NOT NULL REFERENCES concepts(id),
  status TEXT NOT NULL
    CHECK(status IN ('proposed', 'approved', 'rejected')),
  reviewer TEXT,
  reviewed_at TEXT,
  comments TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_concept_review_concept ON concept_review(concept_id);

CREATE TABLE IF NOT EXISTS concept_proposals (
  id TEXT PRIMARY KEY, -- brand-ok — proposal id (UUIDv7)
  concept_id TEXT NOT NULL REFERENCES concepts(id),
  status TEXT NOT NULL
    CHECK(status IN ('draft', 'proposed', 'active', 'deprecated', 'archived', 'rejected')),
  reviewer TEXT,
  reviewed_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_concept_proposals_status ON concept_proposals(status);
CREATE INDEX IF NOT EXISTS idx_concept_proposals_concept ON concept_proposals(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_proposals_reviewer ON concept_proposals(reviewer);

CREATE TABLE IF NOT EXISTS concept_health (
  concept_id TEXT NOT NULL DEFAULT '', -- brand-ok — empty = global metric; else concept key
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  measured_at TEXT NOT NULL,
  PRIMARY KEY (concept_id, metric_name, measured_at)
);

CREATE INDEX IF NOT EXISTS idx_concept_health_measured ON concept_health(measured_at);
`;

function tableColumns(db: Database, table: string): Set<string> {
  const rows = db.query(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return new Set(rows.map(r => r.name));
}

/** Add columns introduced after initial deploy (SQLite-safe). */
function migrateConceptColumns(db: Database): void {
  const tables = db
    .query(`SELECT name FROM sqlite_master WHERE type='table' AND name='concepts'`)
    .all() as Array<{ name: string }>;
  if (tables.length === 0) return;
  const cols = tableColumns(db, 'concepts');
  if (!cols.has('domain')) {
    db.run(`ALTER TABLE concepts ADD COLUMN domain TEXT`);
  }
  if (!cols.has('deprecation_reason')) {
    db.run(`ALTER TABLE concepts ADD COLUMN deprecation_reason TEXT`);
  }
}

/**
 * Rebuild concepts table when legacy CHECK lacks `draft`.
 * Detect by attempting a savepoint insert of a draft row.
 */
function migrateStatusCheckForDraft(db: Database): void {
  const has = db
    .query(`SELECT name FROM sqlite_master WHERE type='table' AND name='concepts'`)
    .all() as Array<{ name: string }>;
  if (has.length === 0) return;

  try {
    db.run('SAVEPOINT draft_check');
    db.run(
      `INSERT INTO concepts (id, label, kind, category, group_name, status, see_also_json, created_at, updated_at)
       VALUES ('__draft_probe__', 'probe', 'ui', 'ui', 'probe', 'draft', '[]', '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z')`
    );
    db.run('ROLLBACK TO draft_check');
    db.run('RELEASE draft_check');
    return; // draft allowed
  } catch {
    db.run('ROLLBACK TO draft_check');
    try {
      db.run('RELEASE draft_check');
    } catch {
      /* ignore */
    }
  }

  // Rebuild without FK violations: drop dependents temporarily is heavy;
  // copy concepts → new table, keep child tables (they only store concept_id text).
  db.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE concepts_lifecycle_v2 (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'composite',
      category TEXT NOT NULL DEFAULT 'ui',
      group_name TEXT NOT NULL DEFAULT '',
      domain TEXT,
      status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('draft', 'proposed', 'active', 'deprecated', 'archived', 'rejected')),
      color TEXT,
      unit TEXT,
      format TEXT,
      summary TEXT,
      maps_to TEXT,
      see_also_json TEXT NOT NULL DEFAULT '[]',
      source TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deprecated_at TEXT,
      deprecated_by TEXT,
      deprecation_reason TEXT
    );
    INSERT INTO concepts_lifecycle_v2 (
      id, label, kind, category, group_name, domain, status, color, unit, format, summary,
      maps_to, see_also_json, source, created_at, updated_at, deprecated_at, deprecated_by, deprecation_reason
    )
    SELECT
      id, label, kind, category, group_name,
      NULL, status, color, unit, format, summary,
      maps_to, see_also_json, source, created_at, updated_at, deprecated_at, deprecated_by, NULL
    FROM concepts;
    DROP TABLE concepts;
    ALTER TABLE concepts_lifecycle_v2 RENAME TO concepts;
    CREATE INDEX IF NOT EXISTS idx_concepts_status ON concepts(status);
    CREATE INDEX IF NOT EXISTS idx_concepts_category ON concepts(category);
    CREATE INDEX IF NOT EXISTS idx_concepts_group ON concepts(group_name);
    CREATE INDEX IF NOT EXISTS idx_concepts_domain ON concepts(domain);
    PRAGMA foreign_keys = ON;
  `);
}

export function ensureConceptRegistrySchema(db: Database): void {
  db.exec(CONCEPT_REGISTRY_DDL);
  migrateConceptColumns(db);
  migrateStatusCheckForDraft(db);
  // Re-run DDL for indexes/tables that depend on concepts existing.
  db.exec(CONCEPT_REGISTRY_DDL);
}
