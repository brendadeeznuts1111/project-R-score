import { describe, expect, test } from 'bun:test';
import { validatePasswordStrength } from '../lib/identity/password-strength.ts';
import { IdentitySystem, WeakPasswordError } from '../lib/identity/identity.ts';
import { asTreeNodeId } from '../lib/types/branded.ts';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('identity-password-strength', () => {
  test('validatePasswordStrength accepts a strong passphrase', () => {
    const r = validatePasswordStrength('correct horse battery staple');
    expect(r.score).toBeGreaterThanOrEqual(3);
    expect(r.ok).toBe(true);
  });

  test('validatePasswordStrength rejects common short passwords', () => {
    const r = validatePasswordStrength('password');
    expect(r.ok).toBe(false);
    expect(r.feedback.length).toBeGreaterThan(0);
  });

  test('createAlias throws WeakPasswordError below default bar', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'id-pw-'));
    const dbPath = join(dir, 'accounts.db');
    const nodeId = asTreeNodeId(Bun.randomUUIDv7());
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
       VALUES ($id, 'agent', 'Agent', $tg, $now)`
    ).run({ $id: nodeId, $tg: `tg-${Bun.randomUUIDv7()}`, $now: new Date().toISOString() });
    db.close();

    const identity = new IdentitySystem(undefined, dbPath);
    try {
      await expect(identity.createAlias(nodeId, 'weak-user', 'pw')).rejects.toThrow(WeakPasswordError);
    } finally {
      identity.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('minPasswordScore 0 disables enforcement', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'id-pw-off-'));
    const dbPath = join(dir, 'accounts.db');
    const nodeId = asTreeNodeId(Bun.randomUUIDv7());
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
       VALUES ($id, 'agent', 'Agent', $tg, $now)`
    ).run({ $id: nodeId, $tg: `tg-${Bun.randomUUIDv7()}`, $now: new Date().toISOString() });
    db.close();

    const identity = new IdentitySystem(undefined, dbPath, { minPasswordScore: 0 });
    try {
      await identity.createAlias(nodeId, 'legacy-user', 'pw');
      const { token } = await identity.login('legacy-user', 'pw');
      expect(token).toBeDefined();
    } finally {
      identity.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
