import { afterEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import {
  cleanupExpiredSessions,
  getActiveSession,
  listActiveSessions,
  updateSessionCfToken,
} from "../../src/auth/session";

function sessionDb(): Database {
  const db = new Database(":memory:");
  db.run(`
    CREATE TABLE buckeye_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      cf_token TEXT,
      user_agent TEXT,
      ip_address TEXT,
      metadata_json TEXT,
      created_at INTEGER DEFAULT 0,
      updated_at INTEGER DEFAULT 0
    )
  `);
  return db;
}

let db: Database | null = null;
afterEach(() => {
  db?.close();
  db = null;
});

describe("Buckeye session repository", () => {
  it("lists only active, unexpired sessions and maps metadata", () => {
    db = sessionDb();
    db.run(
      `INSERT INTO buckeye_sessions
       (session_id, token, expires_at, is_active, metadata_json)
       VALUES (?, ?, ?, 1, ?), (?, ?, ?, 1, NULL), (?, ?, ?, 0, NULL)`,
      ["active", "token-a", 200, '{"userId":"partner-1"}', "expired", "token-b", 99, "inactive", "token-c", 300]
    );

    expect(listActiveSessions(100, db)).toEqual([
      expect.objectContaining({
        sessionId: "active",
        expiresAt: 200,
        metadata: { userId: "partner-1" },
      }),
    ]);
    expect(getActiveSession("expired", 100, db)).toBeNull();
  });

  it("updates clearance only for an active session", () => {
    db = sessionDb();
    db.run(
      `INSERT INTO buckeye_sessions (session_id, token, expires_at, is_active)
       VALUES ('active', 'token-a', 4102444800, 1), ('inactive', 'token-b', 4102444800, 0)`
    );

    expect(updateSessionCfToken("active", "clearance", 4102444801, db)).toBe(true);
    expect(updateSessionCfToken("inactive", "clearance", 4102444801, db)).toBe(false);
    expect(getActiveSession("active", 100, db)?.cfToken).toBe("clearance");
  });

  it("retires expired sessions without deleting audit rows", () => {
    db = sessionDb();
    db.run(
      `INSERT INTO buckeye_sessions (session_id, token, expires_at, is_active)
       VALUES ('expired', 'token-a', 100, 1), ('active', 'token-b', 200, 1)`
    );

    expect(cleanupExpiredSessions(100, db)).toBe(1);
    expect(db.query("SELECT COUNT(*) AS count FROM buckeye_sessions").get()).toEqual({ count: 2 });
    expect(getActiveSession("expired", 99, db)).toBeNull();
  });
});
