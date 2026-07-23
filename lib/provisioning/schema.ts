// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Provisioning queue DDL — dual-mode tasks (manual | automated_test).
 */
import type { Database } from 'bun:sqlite';

export function ensureProvisioningSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS provisioning_tasks (
      id TEXT PRIMARY KEY,
      platform_id TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('manual', 'automated_test')),
      step TEXT NOT NULL DEFAULT 'pending'
        CHECK(step IN ('pending', 'in_progress', 'completed', 'failed')),
      assigned_to TEXT,
      kyc_dod_id TEXT,
      credentials_encrypted TEXT,
      opened_at TEXT,
      completed_at TEXT,
      notes TEXT,
      experiment_id TEXT,
      variant_id TEXT,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_provision_step ON provisioning_tasks(step);
    CREATE INDEX IF NOT EXISTS idx_provision_partner ON provisioning_tasks(partner_id);
    CREATE INDEX IF NOT EXISTS idx_provision_mode ON provisioning_tasks(mode);
  `);
}
