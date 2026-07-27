/**
 * Identity/auth subsystem — Phase 2 GDPR-style export tests.
 * @see ../lib/identity/export.ts
 * @see ../lib/identity/http.ts
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportData } from '../lib/identity/export.ts';
import { createIdentityHandler } from '../lib/identity/http.ts';
import { IdentitySystem } from '../lib/identity/identity.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

describe('identity-export', () => {
  let dir: string;
  let dbPath: string;
  let identity: IdentitySystem;
  let nodeId: TreeNodeId;
  let handler: (req: Request) => Promise<Response | null>;

  const PASSWORD = 'correct horse battery staple';

  function seedTreeNode(id: TreeNodeId): void {
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
       VALUES ($id, 'agent', 'Test Agent', '111', $now)
       ON CONFLICT(id) DO NOTHING`
    ).run({ $id: id, $now: new Date().toISOString() });
    db.close();
  }

  async function loginToken(slug: string, ip?: string): Promise<string> {
    const result = await identity.login(slug, PASSWORD, ip ? { ip, userAgent: 'bun-test' } : {});
    return result.token as string;
  }

  function exportRequest(token: string | null, nodeParam?: string): Request {
    const query = nodeParam ? `?node=${nodeParam}` : '';
    const headers = new Headers();
    if (token) headers.set('authorization', `Bearer ${token}`);
    return new Request(`http://localhost/auth/export${query}`, { headers });
  }

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-export-'));
    dbPath = join(dir, 'identity.db');
    nodeId = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(nodeId);
    identity = new IdentitySystem(undefined, dbPath);
    await identity.createAlias(nodeId, 'test-agent', PASSWORD);
    handler = createIdentityHandler(identity);
  });

  afterEach(() => {
    identity.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('exportData contains alias, sessions, audit, fingerprints', async () => {
    await identity.login('test-agent', PASSWORD, { ip: '203.0.113.7', userAgent: 'bun-test' });

    const data = exportData(identity, nodeId);

    expect(data.alias).toMatchObject({ slug: 'test-agent', role: 'operator' });
    expect(data.alias!.createdAt.length).toBeGreaterThan(0);

    expect(data.sessions.length).toBe(1);
    expect(data.sessions[0]).toMatchObject({
      ip: '203.0.113.7',
      userAgent: 'bun-test',
      revokedAt: null,
    });
    expect(data.sessions[0]!.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const actions = data.audit.map(a => a.action);
    expect(actions).toContain('alias_created');
    expect(actions).toContain('login_success');

    expect(data.deviceFingerprints.length).toBe(1);
    expect(data.deviceFingerprints[0]!.trusted).toBe(false);
  });

  test('export NEVER serializes password_hash or token_hash', async () => {
    await identity.login('test-agent', PASSWORD, { ip: '203.0.113.7', userAgent: 'bun-test' });

    const json = JSON.stringify(exportData(identity, nodeId));
    expect(json).not.toContain('password_hash');
    expect(json).not.toContain('token_hash');
    expect(json).not.toContain('passwordHash');
    expect(json).not.toContain('tokenHash');

    // Belt and braces: the actual stored secret values must not appear either.
    const db = new Database(dbPath);
    const cred = db
      .query('SELECT password_hash FROM auth_alias_credentials WHERE node_id = $node')
      .get({ $node: nodeId }) as { password_hash: string };
    const sess = db
      .query('SELECT token_hash FROM auth_sessions WHERE node_id = $node')
      .get({ $node: nodeId }) as { token_hash: string };
    db.close();
    expect(json).not.toContain(cred.password_hash);
    expect(json).not.toContain(sess.token_hash);
  });

  test('GET /auth/export: self export is 200 with attachment disposition', async () => {
    const token = await loginToken('test-agent', '203.0.113.7');

    const res = await handler(exportRequest(token));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    expect(res!.headers.get('content-disposition')).toBe(
      `attachment; filename="export-${nodeId as string}.json"`
    );

    const body = (await res!.json()) as Record<string, unknown>;
    expect((body.alias as Record<string, unknown>).slug).toBe('test-agent');
    expect(JSON.stringify(body)).not.toContain('token_hash');
  });

  test('GET /auth/export: own node via ?node= needs no admin', async () => {
    const token = await loginToken('test-agent');
    const res = await handler(exportRequest(token, nodeId as string));
    expect(res!.status).toBe(200);
  });

  test('GET /auth/export: operator exporting another node is 403', async () => {
    const otherNode = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(otherNode);

    const token = await loginToken('test-agent');
    const res = await handler(exportRequest(token, otherNode as string));
    expect(res!.status).toBe(403);
  });

  test('GET /auth/export: admin exporting another node is 200', async () => {
    const adminNode = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(adminNode);
    await identity.createAlias(adminNode, 'admin-alias', PASSWORD, 'admin');

    const token = await loginToken('admin-alias');
    const res = await handler(exportRequest(token, nodeId as string));
    expect(res!.status).toBe(200);

    const body = (await res!.json()) as Record<string, unknown>;
    expect((body.alias as Record<string, unknown>).slug).toBe('test-agent');
  });

  test('GET /auth/export: no token is 401; bad token is 401', async () => {
    const noToken = await handler(exportRequest(null));
    expect(noToken!.status).toBe(401);

    const badToken = await handler(exportRequest('not-a-real-token'));
    expect(badToken!.status).toBe(401);
  });
});
