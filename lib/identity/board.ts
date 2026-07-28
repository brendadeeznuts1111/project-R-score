// @see https://bun.com/docs/runtime/sqlite — bun:sqlite (readonly Database)
// @see https://bun.com/docs/runtime/file-io — Bun.file (existence probe via .size)
/**
 * Identity ops board — read-only aggregation over `data/accounts-<tenant>.db`.
 *
 * This module owns ALL read-only board queries and opens the SQLite file
 * ITSELF with `{ readonly: true }` — identity.ts stays the single write
 * authority and is never touched by the board path. Column selections are
 * explicit and mirror the export-safe accessors in identity.ts:
 * `password_hash` and `token_hash` are NEVER selected, so a serialized
 * IdentityBoardData is safe to bake into public/registry + public/portal.
 *
 * A missing DB file (fresh checkout, tenant never seeded) yields an
 * `empty: true` report instead of throwing — the bake renders a friendly
 * "seed the demo data" panel for it.
 */

import { Database } from 'bun:sqlite';
import { asTreeNodeId, type TreeNodeId } from '../types/branded.ts';
import type { IdentityRole } from './identity.ts';

// ── Types ────────────────────────────────────────────────────────────────

/** Alias row for the board — NEVER includes password_hash. */
export interface IdentityBoardAlias {
  nodeId: TreeNodeId;
  slug: string;
  role: IdentityRole;
  failedAttempts: number;
  lockedUntil: number | null; // unix seconds
  lockReason: string | null;
  createdAt: string;
}

/** Active (non-revoked, non-expired) session row — NEVER includes token_hash. */
export interface IdentityBoardSession {
  nodeId: TreeNodeId;
  createdAt: string;
  expiresAt: number; // unix seconds
  ip: string | null;
  userAgent: string | null;
  impersonatorId: TreeNodeId | null;
}

/** Recent auth_audit row (newest-first). */
export interface IdentityBoardAudit {
  nodeId: TreeNodeId | null;
  action: string;
  success: boolean;
  ip: string | null;
  createdAt: string;
  impersonatorId: TreeNodeId | null;
}

export interface IdentityBoardCounts {
  aliases: number;
  activeSessions: number;
  lockedAccounts: number;
  /** Security-signal events in the last 24h (see ANOMALY_ACTIONS). */
  anomalies24h: number;
}

export interface IdentityBoardData {
  kind: 'identity-board';
  generatedAt: string;
  /** True when the DB file is absent or has no identity rows to report. */
  empty: boolean;
  dbPath: string;
  counts: IdentityBoardCounts;
  /** 24h anomaly counts keyed by action (only actions with count > 0). */
  anomalyByAction: Record<string, number>;
  aliases: IdentityBoardAlias[];
  sessions: IdentityBoardSession[];
  audit: IdentityBoardAudit[];
}

/** Audit actions surfaced as security signals on the board. */
export const ANOMALY_ACTIONS = [
  'login_blocked_anomaly',
  'login_suspicious',
  'login_blocked_geo',
  'login_blocked_ip',
  'login_totp_required',
] as const;

export const BOARD_AUDIT_LIMIT = 50;

// ── Collection ───────────────────────────────────────────────────────────

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

function emptyBoard(dbPath: string): IdentityBoardData {
  return {
    kind: 'identity-board',
    generatedAt: new Date().toISOString(),
    empty: true,
    dbPath,
    counts: { aliases: 0, activeSessions: 0, lockedAccounts: 0, anomalies24h: 0 },
    anomalyByAction: {},
    aliases: [],
    sessions: [],
    audit: [],
  };
}

function hasTable(db: Database, name: string): boolean {
  const row = db
    .query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = $name")
    .get({ $name: name }) as Record<string, unknown> | null;
  return row !== null;
}

/**
 * Collect the full board snapshot from a tenant accounts DB, READONLY.
 *
 * Returns an `empty: true` report when the file does not exist or the
 * identity tables have not been migrated yet — never throws for a missing
 * database. A malformed/unreadable file still throws (real error).
 */
export function collectBoardData(dbPath: string): IdentityBoardData {
  if (!Bun.file(dbPath).size) {
    return emptyBoard(dbPath);
  }

  const db = new Database(dbPath, { readonly: true });
  try {
    if (!hasTable(db, 'auth_alias_credentials')) {
      return emptyBoard(dbPath);
    }

    const now = unixNow();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const aliases = (
      db
        .query(
          `SELECT node_id, alias_slug, role, failed_attempts, locked_until, lock_reason, created_at
           FROM auth_alias_credentials ORDER BY created_at ASC, alias_slug ASC`
        )
        .all() as Record<string, unknown>[]
    ).map(row => ({
      nodeId: asTreeNodeId(row.node_id as string),
      slug: row.alias_slug as string,
      role: row.role as IdentityRole,
      failedAttempts: row.failed_attempts as number,
      lockedUntil: (row.locked_until as number | null) ?? null,
      lockReason: (row.lock_reason as string | null) ?? null,
      createdAt: row.created_at as string,
    }));

    const sessions = hasTable(db, 'auth_sessions')
      ? (
          db
            .query(
              `SELECT node_id, created_at, expires_at, ip, user_agent, impersonator_id
               FROM auth_sessions
               WHERE revoked_at IS NULL AND expires_at > $now
               ORDER BY created_at DESC`
            )
            .all({ $now: now }) as Record<string, unknown>[]
        ).map(row => ({
          nodeId: asTreeNodeId(row.node_id as string),
          createdAt: row.created_at as string,
          expiresAt: row.expires_at as number,
          ip: (row.ip as string | null) ?? null,
          userAgent: (row.user_agent as string | null) ?? null,
          impersonatorId: row.impersonator_id ? asTreeNodeId(row.impersonator_id as string) : null,
        }))
      : [];

    const audit = hasTable(db, 'auth_audit')
      ? (
          db
            .query(
              `SELECT node_id, action, success, ip, created_at, impersonator_id
               FROM auth_audit
               ORDER BY created_at DESC, rowid DESC LIMIT $limit`
            )
            .all({ $limit: BOARD_AUDIT_LIMIT }) as Record<string, unknown>[]
        ).map(row => ({
          nodeId: row.node_id ? asTreeNodeId(row.node_id as string) : null,
          action: row.action as string,
          success: row.success === 1,
          ip: (row.ip as string | null) ?? null,
          createdAt: row.created_at as string,
          impersonatorId: row.impersonator_id ? asTreeNodeId(row.impersonator_id as string) : null,
        }))
      : [];

    const anomalyByAction: Record<string, number> = {};
    if (hasTable(db, 'auth_audit')) {
      const rows = db
        .query(
          `SELECT action, COUNT(*) AS n FROM auth_audit
           WHERE created_at >= $since AND action IN (${ANOMALY_ACTIONS.map(a => `'${a}'`).join(', ')})
           GROUP BY action`
        )
        .all({ $since: since24h }) as Record<string, unknown>[];
      for (const row of rows) anomalyByAction[row.action as string] = row.n as number;
    }

    const lockedAccounts = aliases.filter(
      a => a.lockedUntil !== null && a.lockedUntil > now
    ).length;
    const anomalies24h = Object.values(anomalyByAction).reduce((sum, n) => sum + n, 0);

    return {
      kind: 'identity-board',
      generatedAt: new Date().toISOString(),
      empty: aliases.length === 0 && audit.length === 0,
      dbPath,
      counts: {
        aliases: aliases.length,
        activeSessions: sessions.length,
        lockedAccounts,
        anomalies24h,
      },
      anomalyByAction,
      aliases,
      sessions,
      audit,
    };
  } finally {
    db.close();
  }
}
