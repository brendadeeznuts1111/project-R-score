// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Concept Registry DDL — idempotent CREATE IF NOT EXISTS.
 */
import type { Database } from 'bun:sqlite';

export const CONCEPT_REGISTRY_DDL = `
CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY, -- brand-ok — glossary concept key
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'composite',
  category TEXT NOT NULL DEFAULT 'ui',
  group_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('proposed', 'active', 'deprecated', 'archived', 'rejected')),
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
  deprecated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_concepts_status ON concepts(status);
CREATE INDEX IF NOT EXISTS idx_concepts_category ON concepts(category);
CREATE INDEX IF NOT EXISTS idx_concepts_group ON concepts(group_name);

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
`;

export function ensureConceptRegistrySchema(db: Database): void {
  db.exec(CONCEPT_REGISTRY_DDL);
}
