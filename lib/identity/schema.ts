// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Identity/auth subsystem schema (Phase 0).
 *
 * Four tables, all keyed to `tree_nodes` from lib/accounts/accounts.ts.
 * Lockout columns (`failed_attempts`, `locked_until`, `lock_reason`) exist NOW
 * so Phase 1 lockout enforcement needs no ALTERs — Phase 0 only tracks
 * the counter.
 */

import { Database } from 'bun:sqlite';

export function migrateIdentity(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS auth_alias_credentials (
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      alias_slug TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator' CHECK(role IN ('operator', 'admin', 'superadmin')),
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER,
      lock_reason TEXT,
      created_at TEXT NOT NULL,
      rotated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      created_at TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      ip TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_audit (
      id TEXT PRIMARY KEY,
      node_id TEXT REFERENCES tree_nodes(id),
      action TEXT NOT NULL,
      details_json TEXT,
      ip TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_device_fingerprints (
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      fingerprint_hash TEXT NOT NULL,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      country_code TEXT,
      trusted INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (node_id, fingerprint_hash)
    );

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_node ON auth_sessions(node_id);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_node_created ON auth_audit(node_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_action ON auth_audit(action);
  `);
}
