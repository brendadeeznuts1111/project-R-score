// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Experiments schema — factorial designs, sticky assignments, outcome metrics.
 * Idempotent CREATE IF NOT EXISTS; called from ops migrateSchema.
 */
import type { Database } from 'bun:sqlite';

/** Ensure experiment tables exist (idempotent). */
export function ensureExperimentsSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK(status IN ('draft', 'active', 'paused', 'completed')),
      factors_json TEXT NOT NULL,
      design_json TEXT NOT NULL,
      fraction_denom INTEGER NOT NULL DEFAULT 1,
      design_method TEXT NOT NULL DEFAULT 'full',
      metric_name TEXT NOT NULL DEFAULT 'win_rate',
      aliases_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS experiment_variants (
      id TEXT PRIMARY KEY,
      experiment_id TEXT NOT NULL REFERENCES experiments(id),
      variant_index INTEGER NOT NULL,
      config_json TEXT NOT NULL,
      config_key TEXT NOT NULL,
      UNIQUE(experiment_id, config_key),
      UNIQUE(experiment_id, variant_index)
    );
    CREATE INDEX IF NOT EXISTS idx_exp_variants_exp
      ON experiment_variants(experiment_id);

    CREATE TABLE IF NOT EXISTS experiment_assignments (
      id TEXT PRIMARY KEY,
      experiment_id TEXT NOT NULL REFERENCES experiments(id),
      partner_id TEXT NOT NULL REFERENCES tree_nodes(id),
      variant_id TEXT NOT NULL REFERENCES experiment_variants(id),
      config_json TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      UNIQUE(experiment_id, partner_id)
    );
    CREATE INDEX IF NOT EXISTS idx_exp_assign_partner
      ON experiment_assignments(partner_id);
    CREATE INDEX IF NOT EXISTS idx_exp_assign_variant
      ON experiment_assignments(variant_id);

    CREATE TABLE IF NOT EXISTS experiment_metrics (
      id TEXT PRIMARY KEY,
      experiment_id TEXT NOT NULL REFERENCES experiments(id),
      partner_id TEXT NOT NULL REFERENCES tree_nodes(id),
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      recorded_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_exp_metrics_exp
      ON experiment_metrics(experiment_id, metric_name);
    CREATE INDEX IF NOT EXISTS idx_exp_metrics_partner
      ON experiment_metrics(experiment_id, partner_id);
  `);
}
