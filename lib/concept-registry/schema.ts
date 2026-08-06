// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// lib/concept-registry/schema.ts — Concept Registry Service storage schema.
//
// Persistent, versioned store for glossary concepts (Phase 1 of the Concept
// Registry Service). Five tables:
//
//   concepts          — live concept rows (id, label, metadata, status)
//   concept_versions  — immutable snapshots of every change (version history)
//   concept_usage     — where a concept is used (board · file · count)
//   concept_provenance— correlationId/author provenance per concept
//   concept_review    — proposed/approved/rejected review workflow trail
//
// The DDL is idempotent (CREATE TABLE IF NOT EXISTS) and mirrors the
// partner-ledger pattern: a DDL const + ensureSchema(db) wired into the open
// helper so every openConceptRegistryDb gets the schema.
//
// Concept ids are glossary concept keys from domain-glossary.json /
// semantic-vocabulary.ts — opaque domain strings carried as `string` with
// `// brand-ok` (the owning glossary lane uses the same convention).

import { Database } from 'bun:sqlite';
import { ensureParentDirSync } from '../bun-fs-utils.ts';
import { joinPath } from '../path-bun.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..', '..');

export const CONCEPT_REGISTRY_SCHEMA_VERSION = 1;

export const CONCEPT_REGISTRY_STATUSES = ['proposed', 'active', 'deprecated', 'archived'] as const;
export type ConceptRegistryStatus = (typeof CONCEPT_REGISTRY_STATUSES)[number];

export const CONCEPT_REVIEW_STATUSES = ['proposed', 'approved', 'rejected'] as const;
export type ConceptReviewStatus = (typeof CONCEPT_REVIEW_STATUSES)[number];

export const CONCEPT_REGISTRY_DDL = `
CREATE TABLE IF NOT EXISTS concepts (
  id             TEXT PRIMARY KEY,             -- brand-ok — glossary concept key
  label          TEXT NOT NULL,
  description    TEXT,
  kind           TEXT,
  category       TEXT,
  group_prefix   TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  color          TEXT,
  unit           TEXT,
  format         TEXT,
  maps_to        TEXT,
  see_also       TEXT NOT NULL DEFAULT '[]',   -- JSON array of concept keys
  synonyms       TEXT NOT NULL DEFAULT '[]',   -- JSON array
  value_labels   TEXT NOT NULL DEFAULT '[]',   -- JSON array
  url            TEXT,
  deprecated_by  TEXT,
  source         TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deprecated_at  TEXT
);

CREATE TABLE IF NOT EXISTS concept_versions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  concept_id TEXT NOT NULL,                    -- brand-ok — glossary concept key
  version    INTEGER NOT NULL,
  snapshot   TEXT NOT NULL,                    -- JSON of the full concept row
  author     TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (concept_id, version)
);

CREATE TABLE IF NOT EXISTS concept_usage (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  concept_id  TEXT NOT NULL,                   -- brand-ok — glossary concept key
  board       TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  count       INTEGER NOT NULL DEFAULT 1,
  last_seen_at TEXT NOT NULL,
  UNIQUE (concept_id, board, file_path)
);

CREATE TABLE IF NOT EXISTS concept_provenance (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  concept_id     TEXT NOT NULL,                -- brand-ok — glossary concept key
  correlation_id TEXT,                         -- brand-ok — work-item provenance ref, not CorrelationId UUID
  author         TEXT,
  committed_at   TEXT NOT NULL,
  UNIQUE (concept_id, correlation_id)
);

CREATE TABLE IF NOT EXISTS concept_review (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  concept_id  TEXT NOT NULL,                   -- brand-ok — glossary concept key
  status      TEXT NOT NULL,                   -- proposed | approved | rejected
  reviewer    TEXT,
  reviewed_at TEXT NOT NULL,
  comments    TEXT
);

CREATE INDEX IF NOT EXISTS idx_concepts_status ON concepts (status);
CREATE INDEX IF NOT EXISTS idx_concepts_category ON concepts (category);
CREATE INDEX IF NOT EXISTS idx_concepts_group ON concepts (group_prefix);
CREATE INDEX IF NOT EXISTS idx_concept_versions_concept ON concept_versions (concept_id, version);
CREATE INDEX IF NOT EXISTS idx_concept_usage_concept ON concept_usage (concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_provenance_concept ON concept_provenance (concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_review_concept ON concept_review (concept_id);
`;

/** Create all Concept Registry tables/indexes (idempotent). */
export function ensureConceptRegistrySchema(db: Database): void {
  db.exec(CONCEPT_REGISTRY_DDL);
}

/**
 * Open the Concept Registry DB. Defaults to the gitignored `data/` directory
 * resolved from the repo root (not cwd) so cron/scripts from any working
 * directory open the same database; parent dirs are created on demand.
 * `:memory:` gives an isolated in-memory DB (tests). Schema is ensured on
 * open so every connection is immediately usable.
 */
export function openConceptRegistryDb(path?: string): Database {
  const resolved =
    path ?? Bun.env.CONCEPT_REGISTRY_DB ?? joinPath(REPO_ROOT, 'data', 'concept-registry.db');
  if (resolved !== ':memory:') {
    // Sync parent ensure — bun:sqlite open cannot await Bun.write.
    ensureParentDirSync(resolved);
  }
  const db = new Database(resolved, resolved === ':memory:' ? undefined : { create: true });
  if (resolved !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL');
  }
  ensureConceptRegistrySchema(db);
  return db;
}
