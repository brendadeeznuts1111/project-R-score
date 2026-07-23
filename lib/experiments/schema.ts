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
      hypothesis TEXT,
      factors_json TEXT NOT NULL,
      design_json TEXT NOT NULL,
      fraction_denom INTEGER NOT NULL DEFAULT 1,
      design_method TEXT NOT NULL DEFAULT 'full',
      metric_name TEXT NOT NULL DEFAULT 'win_rate',
      aliases_json TEXT,
      policy_json TEXT,
      activated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS experiment_variants (
      id TEXT PRIMARY KEY,
      experiment_id TEXT NOT NULL REFERENCES experiments(id),
      variant_index INTEGER NOT NULL,
      config_json TEXT NOT NULL,
      config_key TEXT NOT NULL,
      name TEXT,
      weight REAL DEFAULT 1,
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

    CREATE TABLE IF NOT EXISTS experiment_cluster_assignments (
      experiment_id TEXT NOT NULL REFERENCES experiments(id),
      cluster_key TEXT NOT NULL,
      variant_id TEXT NOT NULL REFERENCES experiment_variants(id),
      created_at TEXT NOT NULL,
      PRIMARY KEY (experiment_id, cluster_key)
    );
    CREATE INDEX IF NOT EXISTS idx_exp_cluster_variant
      ON experiment_cluster_assignments(experiment_id, variant_id);

    CREATE TABLE IF NOT EXISTS experiment_switchback_periods (
      id TEXT PRIMARY KEY,
      experiment_id TEXT NOT NULL REFERENCES experiments(id),
      partner_id TEXT NOT NULL REFERENCES tree_nodes(id),
      variant_id TEXT NOT NULL REFERENCES experiment_variants(id),
      config_json TEXT NOT NULL,
      period_index INTEGER NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      washout_days INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(experiment_id, partner_id, period_index)
    );
    CREATE INDEX IF NOT EXISTS idx_exp_switchback_current
      ON experiment_switchback_periods(experiment_id, partner_id, starts_at, ends_at);
  `);

  const columns = new Set(
    (db.query('PRAGMA table_info(experiments)').all() as Array<{ name: string }>).map(c => c.name)
  );
  if (!columns.has('policy_json')) db.run('ALTER TABLE experiments ADD COLUMN policy_json TEXT');
  if (!columns.has('activated_at')) db.run('ALTER TABLE experiments ADD COLUMN activated_at TEXT');
  if (!columns.has('hypothesis')) db.run('ALTER TABLE experiments ADD COLUMN hypothesis TEXT');

  const variantCols = new Set(
    (db.query('PRAGMA table_info(experiment_variants)').all() as Array<{ name: string }>).map(
      c => c.name
    )
  );
  if (!variantCols.has('name')) db.run('ALTER TABLE experiment_variants ADD COLUMN name TEXT');
  if (!variantCols.has('weight')) {
    db.run('ALTER TABLE experiment_variants ADD COLUMN weight REAL DEFAULT 1');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS experiment_variant_stats (
      experiment_id TEXT NOT NULL REFERENCES experiments(id),
      variant_id TEXT NOT NULL REFERENCES experiment_variants(id),
      total_samples INTEGER NOT NULL DEFAULT 0,
      sum_metric REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (experiment_id, variant_id)
    );
  `);
}
