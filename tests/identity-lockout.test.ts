/**
 * Identity/auth subsystem — Phase 1a lockout tests.
 * @see ../lib/identity/identity.ts
 * @see ../lib/identity/lockout.ts
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AccountLockedError,
  IdentityError,
  IdentitySystem,
  InvalidCredentialsError,
} from '../lib/identity/identity.ts';
import {
  LOCKOUT_DURATION_SECONDS,
  LOCKOUT_THRESHOLD,
  lockAccount,
  unlockAccount,
} from '../lib/identity/lockout.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

describe('identity-lockout', () => {
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

  function credentialRow(slug: string): {
    failed_attempts: number;
    locked_until: number | null;
    lock_reason: string | null;
  } {
    const db = new Database(dbPath);
    const row = db
      .query(
        `SELECT failed_attempts, locked_until, lock_reason
         FROM auth_alias_credentials WHERE alias_slug = $slug`
      )
      .get({ $slug: slug }) as {
      failed_attempts: number;
      locked_until: number | null;
      lock_reason: string | null;
    };
    db.close();
    return row;
  }

  async function failLogins(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await expect(identity.login('test-agent', 'wrong password')).rejects.toThrow(
        InvalidCredentialsError
      );
    }
  }

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-lockout-'));
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

  test('threshold bad logins lock the account; next attempt throws AccountLockedError', async () => {
    // Every escalating attempt (including the one that trips the threshold)
    // throws InvalidCredentialsError — no lock enumeration.
    await failLogins(LOCKOUT_THRESHOLD);

    const cred = credentialRow('test-agent');
    expect(cred.failed_attempts).toBe(LOCKOUT_THRESHOLD);
    expect(cred.lock_reason).toBe('too_many_failed_attempts');
    expect(cred.locked_until).not.toBeNull();
    expect(cred.locked_until!).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(cred.locked_until!).toBeLessThanOrEqual(
      Math.floor(Date.now() / 1000) + LOCKOUT_DURATION_SECONDS
    );
    expect(identity.isLocked('test-agent')).toBe(true);

    // 6th attempt — even with the CORRECT password — is rejected as locked.
    await expect(
      identity.login('test-agent', 'correct horse battery staple')
    ).rejects.toThrow(AccountLockedError);

    const lockedAudit = identity.auditFor(nodeId, { action: 'account_locked' });
    expect(lockedAudit.length).toBe(1);
    expect(lockedAudit[0]!.success).toBe(true);
    expect(lockedAudit[0]!.details).toMatchObject({
      slug: 'test-agent',
      reason: 'too_many_failed_attempts',
      failedAttempts: LOCKOUT_THRESHOLD,
      durationSeconds: LOCKOUT_DURATION_SECONDS,
    });
  });

  test('locked login attempts do NOT increment failed_attempts further', async () => {
    await failLogins(LOCKOUT_THRESHOLD);

    await expect(identity.login('test-agent', 'wrong password')).rejects.toThrow(
      AccountLockedError
    );
    await expect(identity.login('test-agent', 'wrong password')).rejects.toThrow(
      AccountLockedError
    );

    expect(credentialRow('test-agent').failed_attempts).toBe(LOCKOUT_THRESHOLD);

    const lockedAttempts = identity.auditFor(nodeId, { action: 'login_locked' });
    expect(lockedAttempts.length).toBe(2);
    expect(lockedAttempts.every(a => a.success === false)).toBe(true);
  });

  test('admin unlock restores access and audits adminNodeId', async () => {
    await failLogins(LOCKOUT_THRESHOLD);
    expect(identity.isLocked('test-agent')).toBe(true);

    const adminNode = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(adminNode);
    await identity.createAlias(adminNode, 'admin-alias', 'pw', 'admin');

    unlockAccount(identity, adminNode, 'test-agent');

    const cred = credentialRow('test-agent');
    expect(cred.locked_until).toBeNull();
    expect(cred.lock_reason).toBeNull();
    expect(cred.failed_attempts).toBe(0);
    expect(identity.isLocked('test-agent')).toBe(false);

    // Access restored: correct password logs in again.
    const result = await identity.login('test-agent', 'correct horse battery staple');
    expect(identity.resolveSession(result.token)).not.toBeNull();

    const unlockedAudit = identity.auditFor(nodeId, { action: 'account_unlocked' });
    expect(unlockedAudit.length).toBe(1);
    expect(unlockedAudit[0]!.success).toBe(true);
    expect(unlockedAudit[0]!.details).toMatchObject({
      slug: 'test-agent',
      adminNodeId: adminNode as string,
    });
  });

  test('operator cannot unlock (throws IdentityError)', async () => {
    await failLogins(LOCKOUT_THRESHOLD);

    const operatorNode = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(operatorNode);
    await identity.createAlias(operatorNode, 'operator-alias', 'pw', 'operator');

    expect(() => unlockAccount(identity, operatorNode, 'test-agent')).toThrow(IdentityError);
    expect(() => unlockAccount(identity, nodeId, 'test-agent')).toThrow(IdentityError);

    // Still locked — the rejected unlock changed nothing.
    expect(identity.isLocked('test-agent')).toBe(true);
    expect(identity.auditFor(nodeId, { action: 'account_unlocked' }).length).toBe(0);
  });

  test('superadmin can unlock', async () => {
    await failLogins(LOCKOUT_THRESHOLD);

    const superNode = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(superNode);
    await identity.createAlias(superNode, 'super-alias', 'pw', 'superadmin');

    unlockAccount(identity, superNode, 'test-agent');
    expect(identity.isLocked('test-agent')).toBe(false);
    await identity.login('test-agent', 'correct horse battery staple');
  });

  test('expired lock allows login and resets failed_attempts', async () => {
    await failLogins(LOCKOUT_THRESHOLD);
    expect(identity.isLocked('test-agent')).toBe(true);

    // Backdate locked_until into the past — the lock has expired.
    const past = Math.floor(Date.now() / 1000) - 60;
    const db = new Database(dbPath);
    db.query('UPDATE auth_alias_credentials SET locked_until = $past WHERE alias_slug = $slug').run(
      { $past: past, $slug: 'test-agent' }
    );
    db.close();

    expect(identity.isLocked('test-agent')).toBe(false);

    const result = await identity.login('test-agent', 'correct horse battery staple');
    expect(identity.resolveSession(result.token)).not.toBeNull();

    // Successful login after expiry clears the counter.
    expect(credentialRow('test-agent').failed_attempts).toBe(0);
  });

  test('manual lockAccount sets lock with reason/duration and audits account_locked', () => {
    lockAccount(identity, 'test-agent', 'security_ops', 120);

    const cred = credentialRow('test-agent');
    expect(cred.lock_reason).toBe('security_ops');
    expect(cred.locked_until).not.toBeNull();
    expect(cred.locked_until!).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 120);
    expect(identity.isLocked('test-agent')).toBe(true);

    const lockedAudit = identity.auditFor(nodeId, { action: 'account_locked' });
    expect(lockedAudit.length).toBe(1);
    expect(lockedAudit[0]!.success).toBe(true);
    expect(lockedAudit[0]!.details).toMatchObject({
      slug: 'test-agent',
      reason: 'security_ops',
      durationSeconds: 120,
    });
  });

  test('lockAccount on unknown slug throws; unlockAccount on unknown slug throws', async () => {
    const adminNode = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(adminNode);
    await identity.createAlias(adminNode, 'admin-alias', 'pw', 'admin');

    expect(() => lockAccount(identity, 'ghost-alias', 'manual')).toThrow(IdentityError);
    expect(() => unlockAccount(identity, adminNode, 'ghost-alias')).toThrow(IdentityError);
  });
});
