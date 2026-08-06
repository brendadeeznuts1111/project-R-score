/**
 * Buckeye session persistence.
 *
 * Session rows belong to the upstream connector boundary. Authentication code
 * may look them up, but partner-domain code must not depend on their tokens or
 * Cloudflare clearance state.
 */

import type { Database } from "bun:sqlite";
import { getDb } from "@db/index";
import type { BuckeyeSession } from "@utils/types";

interface BuckeyeSessionRow {
  session_id: string;
  token: string;
  expires_at: number;
  is_active: number;
  cf_token: string | null;
  user_agent: string | null;
  ip_address: string | null;
  metadata_json: string | null;
}

function parseMetadata(value: string | null): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function mapSession(row: BuckeyeSessionRow): BuckeyeSession {
  const metadata = parseMetadata(row.metadata_json);
  return {
    sessionId: row.session_id,
    token: row.token,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    ...(row.cf_token ? { cfToken: row.cf_token } : {}),
    ...(row.user_agent ? { userAgent: row.user_agent } : {}),
    ...(row.ip_address ? { ipAddress: row.ip_address } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

const SESSION_COLUMNS = `
  session_id, token, expires_at, is_active, cf_token,
  user_agent, ip_address, metadata_json
`;

export function listActiveSessions(
  nowSeconds = Math.floor(Date.now() / 1000),
  db: Database = getDb()
): BuckeyeSession[] {
  const rows = db
    .query(
      `SELECT ${SESSION_COLUMNS}
       FROM buckeye_sessions
       WHERE is_active = 1 AND expires_at > ?
       ORDER BY expires_at ASC`
    )
    .all(nowSeconds) as BuckeyeSessionRow[];

  return rows.map(mapSession);
}

export function getActiveSession(
  sessionId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  db: Database = getDb()
): BuckeyeSession | null {
  const row = db
    .query(
      `SELECT ${SESSION_COLUMNS}
       FROM buckeye_sessions
       WHERE session_id = ? AND is_active = 1 AND expires_at > ?
       LIMIT 1`
    )
    .get(sessionId, nowSeconds) as BuckeyeSessionRow | null;

  return row ? mapSession(row) : null;
}

export function updateSessionCfToken(
  sessionId: string,
  cfToken: string,
  expiresAt = Math.floor(Date.now() / 1000) + 30 * 60,
  db: Database = getDb()
): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const result = db.run(
    `UPDATE buckeye_sessions
     SET cf_token = ?, expires_at = ?, updated_at = ?
     WHERE session_id = ? AND is_active = 1 AND expires_at > ?`,
    [cfToken, expiresAt, nowSeconds, sessionId, nowSeconds]
  );
  return result.changes === 1;
}

/** Mark expired sessions inactive while retaining their audit history. */
export function cleanupExpiredSessions(
  nowSeconds = Math.floor(Date.now() / 1000),
  db: Database = getDb()
): number {
  const result = db.run(
    `UPDATE buckeye_sessions
     SET is_active = 0, updated_at = ?
     WHERE is_active = 1 AND expires_at <= ?`,
    [nowSeconds, nowSeconds]
  );
  return result.changes;
}
