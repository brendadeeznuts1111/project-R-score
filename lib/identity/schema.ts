// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Identity/auth subsystem schema (Phase 0).
 *
 * Four tables, all keyed to `tree_nodes` from lib/accounts/accounts.ts.
 * Lockout columns (`failed_attempts`, `locked_until`, `lock_reason`) exist NOW
 * so Phase 1 lockout enforcement needs no ALTERs — Phase 0 only tracks
 * the counter.
 *
 * Impersonation columns (`impersonator_id` on auth_sessions + auth_audit) are
 * in the CREATEs for fresh DBs AND added via guarded ALTERs for pre-existing
 * DBs — CREATE TABLE IF NOT EXISTS never alters an existing table, so the
 * ALTERs are the upgrade path. `migrateIdentity` stays the single idempotent
 * entry point for both shapes.
 *
 * `auth_ip_allowlist` (Phase 4 self-service) and the TOTP MFA tables
 * (`auth_totp`, `auth_totp_recovery` — mfa.ts) are NEW tables, so the CREATE
 * IF NOT EXISTS alone covers both fresh and pre-existing DBs — no ALTERs.
 *
 * The WebAuthn/passkey tables (`auth_passkeys`, `auth_webauthn_challenges` —
 * webauthn.ts) are likewise NEW tables: CREATE IF NOT EXISTS covers both
 * fresh and pre-existing DBs.
 */

import { Database } from 'bun:sqlite';

/**
 * Add `column` to `table` only when missing. SQLite has no
 * ALTER TABLE ... ADD COLUMN IF NOT EXISTS, so guard with PRAGMA table_info.
 * Runs AFTER the CREATEs above, so the table always exists.
 */
function ensureColumn(db: Database, table: string, column: string, ddl: string): void {
  const columns = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some(c => c.name === column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

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
      user_agent TEXT,
      impersonator_id TEXT REFERENCES tree_nodes(id)
    );

    CREATE TABLE IF NOT EXISTS auth_audit (
      id TEXT PRIMARY KEY,
      node_id TEXT REFERENCES tree_nodes(id),
      action TEXT NOT NULL,
      details_json TEXT,
      ip TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      impersonator_id TEXT REFERENCES tree_nodes(id)
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

    CREATE TABLE IF NOT EXISTS auth_ip_allowlist (
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      cidr TEXT NOT NULL,
      label TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (node_id, cidr)
    );

    CREATE TABLE IF NOT EXISTS auth_totp (
      node_id TEXT PRIMARY KEY REFERENCES tree_nodes(id),
      secret TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      verified_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS auth_totp_recovery (
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      code_hash TEXT NOT NULL,
      used_at INTEGER,
      PRIMARY KEY (node_id, code_hash)
    );

    CREATE TABLE IF NOT EXISTS auth_passkeys (
      credential_id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      device_name TEXT,
      transports TEXT,
      created_at TEXT NOT NULL,
      last_used_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS auth_webauthn_challenges (
      challenge TEXT PRIMARY KEY,
      node_id TEXT REFERENCES tree_nodes(id),
      kind TEXT NOT NULL CHECK(kind IN ('registration', 'authentication')),
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_node ON auth_sessions(node_id);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_node_created ON auth_audit(node_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_action ON auth_audit(action);
  `);

  // Upgrade path for pre-existing DBs (CREATE IF NOT EXISTS leaves old-shaped
  // tables untouched). NULL default keeps this legal with REFERENCES under FK.
  ensureColumn(
    db,
    'auth_sessions',
    'impersonator_id',
    'impersonator_id TEXT REFERENCES tree_nodes(id)'
  );
  ensureColumn(
    db,
    'auth_audit',
    'impersonator_id',
    'impersonator_id TEXT REFERENCES tree_nodes(id)'
  );
}
