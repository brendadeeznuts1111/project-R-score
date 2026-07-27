/**
 * Identity/auth subsystem — impersonation (superadmin → partner) tests.
 * @see ../lib/identity/impersonate.ts
 * @see ../lib/identity/http.ts
 * @see ../lib/identity/schema.ts
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createIdentityHandler } from '../lib/identity/http.ts';
import { IdentityError, IdentitySystem, SESSION_TTL_SECONDS } from '../lib/identity/identity.ts';
import {
  IMPERSONATION_TTL_SECONDS,
  endImpersonation,
  impersonate,
} from '../lib/identity/impersonate.ts';
import { migrateIdentity } from '../lib/identity/schema.ts';
import { asTokenId, asTreeNodeId, type TokenId, type TreeNodeId } from '../lib/types/branded.ts';

describe('identity-impersonate', () => {
  let dir: string;
  let dbPath: string;
  let identity: IdentitySystem;
  let handler: (req: Request) => Promise<Response | null>;
  let superNode: TreeNodeId;
  let super2Node: TreeNodeId;
  let adminNode: TreeNodeId;
  let partnerNode: TreeNodeId;

  function seedTreeNode(id: TreeNodeId, name: string): void {
    // Minimal tree_nodes — seeded directly, independent of AccountSystem.
    const db = new Database(dbPath);
    db.run(`
      CREATE TABLE IF NOT EXISTS tree_nodes (
        id TEXT PRIMARY KEY,
        type TEXT,
        name TEXT NOT NULL,
        telegram_id TEXT,
        created_at TEXT NOT NULL
      );
    `);
    db.query(
      `INSERT INTO tree_nodes (id, type, name, telegram_id, created_at)
       VALUES ($id, 'agent', $name, '111', $now)
       ON CONFLICT(id) DO NOTHING`
    ).run({ $id: id, $name: name, $now: new Date().toISOString() });
    db.close();
  }

  async function superToken(): Promise<TokenId> {
    const { token } = await identity.login('root-admin', 'correct horse battery staple');
    return token;
  }

  function impersonateReq(token: TokenId, body: string): Promise<Response | null> {
    return handler(
      new Request('http://test/auth/impersonate', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token as string}`,
          'content-type': 'application/json',
        },
        body,
      })
    );
  }

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-impersonate-'));
    dbPath = join(dir, 'identity.db');
    superNode = asTreeNodeId(Bun.randomUUIDv7());
    super2Node = asTreeNodeId(Bun.randomUUIDv7());
    adminNode = asTreeNodeId(Bun.randomUUIDv7());
    partnerNode = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(superNode, 'Root Admin');
    seedTreeNode(super2Node, 'Root Admin Two');
    seedTreeNode(adminNode, 'Ops Admin');
    seedTreeNode(partnerNode, 'Partner');

    identity = new IdentitySystem(undefined, dbPath);
    await identity.createAlias(superNode, 'root-admin', 'correct horse battery staple', 'superadmin');
    await identity.createAlias(super2Node, 'root-two', 'correct horse battery staple', 'superadmin');
    await identity.createAlias(adminNode, 'ops-admin', 'correct horse battery staple', 'admin');
    await identity.createAlias(partnerNode, 'partner-acct', 'correct horse battery staple', 'operator');
    handler = createIdentityHandler(identity);
  });

  afterEach(() => {
    identity.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('superadmin gets a working impersonated token for the target', async () => {
    const result = await impersonate(identity, superNode, partnerNode);

    const session = identity.resolveSession(result.token);
    expect(session).not.toBeNull();
    expect(session!.sessionId).toBe(result.sessionId);
    expect(session!.nodeId).toBe(partnerNode);
    expect(session!.impersonatorId).toBe(superNode);
    expect(session!.role).toBe('operator');
  });

  test('impersonated session TTL is ~1h, well under the 8h login TTL', async () => {
    const result = await impersonate(identity, superNode, partnerNode);
    const now = Math.floor(Date.now() / 1000);
    expect(result.expiresAt).toBeGreaterThan(now + IMPERSONATION_TTL_SECONDS - 60);
    expect(result.expiresAt).toBeLessThanOrEqual(now + IMPERSONATION_TTL_SECONDS);
    expect(result.expiresAt).toBeLessThan(now + SESSION_TTL_SECONDS);
  });

  test('operator and admin cannot impersonate (API throws, HTTP 403)', async () => {
    await expect(impersonate(identity, adminNode, partnerNode)).rejects.toThrow(
      'Superadmin role required'
    );
    await expect(impersonate(identity, partnerNode, adminNode)).rejects.toThrow(IdentityError);

    const { token } = await identity.login('ops-admin', 'correct horse battery staple');
    const res = await impersonateReq(token, JSON.stringify({ nodeId: partnerNode as string }));
    expect(res!.status).toBe(403);
  });

  test('impersonating a superadmin is refused (API throws, HTTP 403)', async () => {
    await expect(impersonate(identity, superNode, super2Node)).rejects.toThrow(
      'Cannot impersonate a superadmin'
    );

    const res = await impersonateReq(
      await superToken(),
      JSON.stringify({ nodeId: super2Node as string })
    );
    expect(res!.status).toBe(403);
  });

  test('unknown target → API throws, HTTP 404', async () => {
    const ghost = asTreeNodeId(Bun.randomUUIDv7());
    await expect(impersonate(identity, superNode, ghost)).rejects.toThrow('Target node not found');

    const res = await impersonateReq(await superToken(), JSON.stringify({ nodeId: ghost }));
    expect(res!.status).toBe(404);
  });

  test('HTTP impersonate rejects missing/invalid body with 400', async () => {
    const token = await superToken();
    expect((await impersonateReq(token, 'not json'))!.status).toBe(400);
    expect((await impersonateReq(token, '{}'))!.status).toBe(400);
    expect((await impersonateReq(token, JSON.stringify({ nodeId: '   ' })))!.status).toBe(400);
  });

  test('HTTP impersonate returns token + expiresAt for a superadmin', async () => {
    const res = await impersonateReq(
      await superToken(),
      JSON.stringify({ nodeId: partnerNode as string })
    );
    expect(res!.status).toBe(200);
    const body = (await res!.json()) as { token: string; expiresAt: number };
    expect(body.token.length).toBeGreaterThan(0);
    expect(body.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const session = identity.resolveSession(asTokenId(body.token));
    expect(session).not.toBeNull();
    expect(session!.nodeId).toBe(partnerNode);
    expect(session!.impersonatorId).toBe(superNode);
  });

  test('X-Impersonator header on /auth/session only for impersonated tokens', async () => {
    const { token: normalToken } = await identity.login('partner-acct', 'correct horse battery staple');
    const normal = await handler(
      new Request('http://test/auth/session', {
        headers: { authorization: `Bearer ${normalToken as string}` },
      })
    );
    expect(normal!.status).toBe(200);
    expect(normal!.headers.get('x-impersonator')).toBeNull();

    const imp = await impersonate(identity, superNode, partnerNode);
    const res = await handler(
      new Request('http://test/auth/session', {
        headers: { authorization: `Bearer ${imp.token as string}` },
      })
    );
    expect(res!.status).toBe(200);
    expect(res!.headers.get('x-impersonator')).toBe(superNode as string);
  });

  test('endImpersonation revokes the session and stamps the audit trail', async () => {
    const imp = await impersonate(identity, superNode, partnerNode);
    expect(identity.resolveSession(imp.token)).not.toBeNull();

    endImpersonation(identity, imp.token);
    expect(identity.resolveSession(imp.token)).toBeNull();

    const db = new Database(dbPath);
    const start = db
      .query("SELECT * FROM auth_audit WHERE action = 'impersonation_start'")
      .all() as Record<string, unknown>[];
    expect(start.length).toBe(1);
    expect(start[0]!.node_id).toBe(partnerNode as string);
    expect(start[0]!.impersonator_id).toBe(superNode as string);
    const details = JSON.parse(start[0]!.details_json as string) as Record<string, unknown>;
    expect(details.adminNodeId).toBe(superNode as string);
    expect(details.sessionId).toBe(imp.sessionId as string);

    const end = db
      .query("SELECT * FROM auth_audit WHERE action = 'impersonation_end'")
      .all() as Record<string, unknown>[];
    expect(end.length).toBe(1);
    expect(end[0]!.node_id).toBe(partnerNode as string);
    expect(end[0]!.impersonator_id).toBe(superNode as string);
    db.close();
  });

  test('HTTP /auth/impersonate/end revokes and carries X-Impersonator', async () => {
    const imp = await impersonate(identity, superNode, partnerNode);
    const res = await handler(
      new Request('http://test/auth/impersonate/end', {
        method: 'POST',
        headers: { authorization: `Bearer ${imp.token as string}` },
      })
    );
    expect(res!.status).toBe(200);
    expect(res!.headers.get('x-impersonator')).toBe(superNode as string);
    expect(identity.resolveSession(imp.token)).toBeNull();

    // Second call: session already revoked → 401
    const again = await handler(
      new Request('http://test/auth/impersonate/end', {
        method: 'POST',
        headers: { authorization: `Bearer ${imp.token as string}` },
      })
    );
    expect(again!.status).toBe(401);
  });

  test('migration adds impersonator_id to old-shaped tables, idempotently, data preserved', () => {
    const migDir = mkdtempSync(join(tmpdir(), 'fw-identity-migrate-'));
    const migPath = join(migDir, 'old.db');
    try {
      const db = new Database(migPath);
      const nodeId = asTreeNodeId(Bun.randomUUIDv7());
      // Pre-impersonation table shapes (no impersonator_id anywhere).
      db.run(`
        CREATE TABLE tree_nodes (
          id TEXT PRIMARY KEY,
          type TEXT,
          name TEXT NOT NULL,
          telegram_id TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE auth_sessions (
          token_hash TEXT PRIMARY KEY,
          node_id TEXT NOT NULL REFERENCES tree_nodes(id),
          created_at TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          revoked_at INTEGER,
          ip TEXT,
          user_agent TEXT
        );
        CREATE TABLE auth_audit (
          id TEXT PRIMARY KEY,
          node_id TEXT REFERENCES tree_nodes(id),
          action TEXT NOT NULL,
          details_json TEXT,
          ip TEXT,
          success INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );
      `);
      const now = new Date().toISOString();
      db.query(
        `INSERT INTO tree_nodes (id, type, name, telegram_id, created_at)
         VALUES ($id, 'agent', 'Old Node', '111', $now)`
      ).run({ $id: nodeId, $now: now });
      db.query(
        `INSERT INTO auth_sessions (token_hash, node_id, created_at, expires_at)
         VALUES ('deadbeef', $node, $now, 9999999999)`
      ).run({ $node: nodeId, $now: now });
      db.query(
        `INSERT INTO auth_audit (id, node_id, action, created_at)
         VALUES ('audit-1', $node, 'login_success', $now)`
      ).run({ $node: nodeId, $now: now });

      migrateIdentity(db);
      migrateIdentity(db); // second run must be a no-op, not an error

      const sessionCols = (
        db.query('PRAGMA table_info(auth_sessions)').all() as { name: string }[]
      ).map(c => c.name);
      const auditCols = (db.query('PRAGMA table_info(auth_audit)').all() as { name: string }[]).map(
        c => c.name
      );
      expect(sessionCols).toContain('impersonator_id');
      expect(auditCols).toContain('impersonator_id');

      const srow = db
        .query('SELECT token_hash, node_id, impersonator_id FROM auth_sessions')
        .get() as Record<string, unknown>;
      expect(srow.token_hash).toBe('deadbeef');
      expect(srow.node_id).toBe(nodeId as string);
      expect(srow.impersonator_id).toBeNull();

      const arow = db
        .query('SELECT id, action, impersonator_id FROM auth_audit')
        .get() as Record<string, unknown>;
      expect(arow.id).toBe('audit-1');
      expect(arow.impersonator_id).toBeNull();
      db.close();
    } finally {
      rmSync(migDir, { recursive: true, force: true });
    }
  });
});
