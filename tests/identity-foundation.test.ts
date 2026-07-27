/**
 * Identity/auth subsystem — Phase 0 foundation tests.
 * @see ../lib/identity/identity.ts
 * @see ../lib/identity/schema.ts
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AccountLockedError,
  IdentitySystem,
  InvalidCredentialsError,
  SESSION_TTL_SECONDS,
} from '../lib/identity/identity.ts';
import { migrateIdentity } from '../lib/identity/schema.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

describe('identity-foundation', () => {
  let dir: string;
  let dbPath: string;
  let identity: IdentitySystem;
  let nodeId: TreeNodeId;

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

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-foundation-'));
    dbPath = join(dir, 'identity.db');
    nodeId = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(nodeId);
    identity = new IdentitySystem(undefined, dbPath);
    await identity.createAlias(nodeId, 'test-agent', 'correct horse battery staple');
  });

  afterEach(() => {
    identity.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('schema migration is idempotent', () => {
    const db = new Database(dbPath);
    migrateIdentity(db);
    migrateIdentity(db);

    const tables = (
      db
        .query("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'auth_%'")
        .all() as { name: string }[]
    ).map((t) => t.name);
    expect(tables).toContain('auth_alias_credentials');
    expect(tables).toContain('auth_sessions');
    expect(tables).toContain('auth_audit');
    expect(tables).toContain('auth_device_fingerprints');
    db.close();
  });

  test('createAlias rejects duplicate slug', async () => {
    const otherNode = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(otherNode);
    await expect(identity.createAlias(otherNode, 'test-agent', 'correct horse battery staple')).rejects.toThrow(
      'already taken'
    );
  });

  test('createAlias rejects invalid slug and nonexistent node', async () => {
    await expect(identity.createAlias(nodeId, 'BAD SLUG!!', 'correct horse battery staple')).rejects.toThrow(
      'Invalid alias slug'
    );
    await expect(
      identity.createAlias(asTreeNodeId(Bun.randomUUIDv7()), 'ghost-node', 'correct horse battery staple')
    ).rejects.toThrow('Node not found');
  });

  test('login success returns a working token (resolveSession round-trip)', async () => {
    const result = await identity.login('test-agent', 'correct horse battery staple', {
      ip: '203.0.113.7',
      userAgent: 'bun-test',
    });

    expect(result.token.length).toBeGreaterThan(0);
    expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(result.expiresAt).toBeLessThanOrEqual(
      Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
    );

    const session = identity.resolveSession(result.token);
    expect(session).not.toBeNull();
    expect(session!.sessionId).toBe(result.sessionId);
    expect(session!.nodeId).toBe(nodeId);
    expect(session!.role).toBe('operator');
  });

  test('wrong password increments failed_attempts and writes audit row', async () => {
    await expect(identity.login('test-agent', 'wrong password')).rejects.toThrow(
      InvalidCredentialsError
    );
    await expect(identity.login('test-agent', 'wrong password')).rejects.toThrow(
      InvalidCredentialsError
    );

    const db = new Database(dbPath);
    const row = db
      .query('SELECT failed_attempts FROM auth_alias_credentials WHERE alias_slug = $slug')
      .get({ $slug: 'test-agent' }) as { failed_attempts: number };
    expect(row.failed_attempts).toBe(2);

    const audit = db
      .query("SELECT * FROM auth_audit WHERE action = 'login_failed' AND node_id = $id")
      .all({ $id: nodeId }) as { success: number }[];
    expect(audit.length).toBe(2);
    expect(audit[0]!.success).toBe(0);
    db.close();
  });

  test('successful login resets failed_attempts', async () => {
    await expect(identity.login('test-agent', 'nope')).rejects.toThrow(InvalidCredentialsError);
    await identity.login('test-agent', 'correct horse battery staple');

    const db = new Database(dbPath);
    const row = db
      .query('SELECT failed_attempts FROM auth_alias_credentials WHERE alias_slug = $slug')
      .get({ $slug: 'test-agent' }) as { failed_attempts: number };
    expect(row.failed_attempts).toBe(0);
    db.close();
  });

  test('locked account is rejected with login_locked audit', async () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const db = new Database(dbPath);
    db.query(
      "UPDATE auth_alias_credentials SET locked_until = $until, lock_reason = 'manual' WHERE alias_slug = $slug"
    ).run({ $until: future, $slug: 'test-agent' });
    db.close();

    await expect(
      identity.login('test-agent', 'correct horse battery staple')
    ).rejects.toThrow(AccountLockedError);

    const locked = identity.auditFor(nodeId, { action: 'login_locked' });
    expect(locked.length).toBe(1);
    expect(locked[0]!.success).toBe(false);
  });

  test('logout revokes the session', async () => {
    const { token } = await identity.login('test-agent', 'correct horse battery staple');
    expect(identity.resolveSession(token)).not.toBeNull();

    identity.logout(token);
    expect(identity.resolveSession(token)).toBeNull();

    const db = new Database(dbPath);
    const row = db
      .query('SELECT revoked_at FROM auth_sessions')
      .get() as { revoked_at: number | null };
    expect(row.revoked_at).not.toBeNull();
    db.close();
  });

  test('expired session resolves null', async () => {
    const { token } = await identity.login('test-agent', 'correct horse battery staple');

    const db = new Database(dbPath);
    const past = Math.floor(Date.now() / 1000) - 60;
    db.query('UPDATE auth_sessions SET expires_at = $past').run({ $past: past });
    db.close();

    expect(identity.resolveSession(token)).toBeNull();
  });

  test('raw token never appears in auth_sessions', async () => {
    const { token } = await identity.login('test-agent', 'correct horse battery staple');

    const db = new Database(dbPath);
    const rows = db.query('SELECT token_hash FROM auth_sessions').all() as {
      token_hash: string;
    }[];
    expect(rows.length).toBe(1);
    expect(rows[0]!.token_hash).not.toBe(token as string);
    expect(rows[0]!.token_hash).not.toContain(token as string);
    expect(rows[0]!.token_hash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex only
    db.close();
  });

  test('requireRole honors operator < admin < superadmin hierarchy', async () => {
    const adminNode = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(adminNode);
    await identity.createAlias(adminNode, 'admin-alias', 'correct horse battery staple', 'admin');

    expect(identity.requireRole(adminNode, 'operator')).toBe(true);
    expect(identity.requireRole(adminNode, 'admin')).toBe(true);
    expect(identity.requireRole(adminNode, 'superadmin')).toBe(false);

    expect(identity.requireRole(nodeId, 'operator')).toBe(true);
    expect(identity.requireRole(nodeId, 'admin')).toBe(false);

    const noCreds = asTreeNodeId(Bun.randomUUIDv7());
    expect(identity.requireRole(noCreds, 'operator')).toBe(false);
  });

  test('auditFor returns rows newest-first with action filter', async () => {
    await identity.login('test-agent', 'correct horse battery staple');
    identity.logAuthEvent({ nodeId, action: 'custom_probe', details: { n: 1 } });

    const all = identity.auditFor(nodeId);
    expect(all.length).toBeGreaterThanOrEqual(3); // alias_created, login_success, custom_probe
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    }
    expect(all[0]!.action).toBe('custom_probe');
    expect(all[0]!.details).toEqual({ n: 1 });

    const filtered = identity.auditFor(nodeId, { action: 'login_success' });
    expect(filtered.length).toBe(1);
    expect(filtered[0]!.action).toBe('login_success');
  });

  test('getRole and isLocked helpers', async () => {
    expect(identity.getRole(nodeId)).toBe('operator');
    expect(identity.isLocked('test-agent')).toBe(false);

    const db = new Database(dbPath);
    db.query('UPDATE auth_alias_credentials SET locked_until = $past WHERE alias_slug = $slug').run({
      $past: Math.floor(Date.now() / 1000) - 60,
      $slug: 'test-agent',
    });
    db.close();
    expect(identity.isLocked('test-agent')).toBe(false); // expired lock does not hold

    expect(identity.getRole(asTreeNodeId(Bun.randomUUIDv7()))).toBeNull();
  });
});
