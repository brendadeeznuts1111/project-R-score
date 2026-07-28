/**
 * Identity board — readonly aggregation + bake safety contract tests.
 * @see ../lib/identity/board.ts
 * @see ../tools/identity-board-bake.ts
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccountSystem } from '../lib/accounts/accounts.ts';
import { collectBoardData, type IdentityBoardData } from '../lib/identity/board.ts';
import { IdentitySystem } from '../lib/identity/identity.ts';
import { LOCKOUT_THRESHOLD } from '../lib/identity/lockout.ts';
import { asTelegramUserId } from '../lib/types/branded.ts';

const PASSWORD = 'correct horse battery staple';

describe('identity-board', () => {
  let dir: string;
  let dbPath: string;
  let accounts: AccountSystem;
  let identity: IdentitySystem;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-board-'));
    dbPath = join(dir, 'identity-board.db');
    accounts = new AccountSystem(undefined, dbPath);
    identity = new IdentitySystem(undefined, dbPath);

    // 'board-user' holds one active session; 'board-locked' gets lockout-locked.
    for (const [slug, role] of [
      ['board-user', 'operator'],
      ['board-locked', 'operator'],
    ] as const) {
      const node = await accounts.create({
        type: 'partner',
        parentId: null,
        expertId: null,
        name: slug,
        telegramId: asTelegramUserId(`tg:${Bun.randomUUIDv7()}`),
        railPreference: 'paypal',
        cutPercentage: 0,
        status: 'active',
        phoneId: null,
      });
      await identity.createAlias(node.id, slug, PASSWORD, role);
    }
  });

  afterEach(() => {
    identity.close();
    rmSync(dir, { recursive: true, force: true });
  });

  async function seedActivity(): Promise<void> {
    await identity.login('board-user', PASSWORD);
    for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
      await expect(identity.login('board-locked', 'wrong password')).rejects.toThrow();
    }
    const nodeId = identity.nodeIdForSlug('board-locked');
    identity.logAuthEvent({ nodeId, action: 'login_blocked_geo', success: false });
  }

  function normalizedShape(data: IdentityBoardData): unknown {
    return JSON.parse(JSON.stringify(data), (_key, value: unknown) => {
      if (typeof value === 'string') {
        if (value.startsWith(dir)) return '<db>';
        if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return '<ts>';
        if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(value)) return '<uuid>';
        return value;
      }
      if (typeof value === 'number' && value > 1_000_000_000) return '<unix>';
      return value;
    });
  }

  test('collectBoardData aggregates aliases, sessions, audit, and counts', async () => {
    await seedActivity();
    identity.close();
    const data = collectBoardData(dbPath);

    expect(data.kind).toBe('identity-board');
    expect(data.empty).toBe(false);
    expect(data.counts.aliases).toBe(2);
    expect(data.counts.activeSessions).toBe(1);
    expect(data.counts.lockedAccounts).toBe(1);
    expect(data.counts.anomalies24h).toBe(1);
    expect(data.anomalyByAction.login_blocked_geo).toBe(1);

    const locked = data.aliases.find(a => a.slug === 'board-locked');
    expect(locked).toBeDefined();
    expect(locked?.lockedUntil).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(locked?.lockReason).toBe('too_many_failed_attempts');
    expect(locked?.failedAttempts).toBe(LOCKOUT_THRESHOLD);

    expect(data.sessions.length).toBe(1);
    expect(data.audit.length).toBeGreaterThan(0);
    expect(data.audit.some(e => e.action === 'account_locked')).toBe(true);
    expect(data.audit.some(e => e.action === 'login_success')).toBe(true);

    // Reopen for afterEach close.
    identity = new IdentitySystem(undefined, dbPath);
  });

  test('serialized board NEVER leaks password or token material', async () => {
    await seedActivity();
    identity.close();
    const json = JSON.stringify(collectBoardData(dbPath));

    expect(json).not.toContain('password_hash');
    expect(json).not.toContain('passwordHash');
    expect(json).not.toContain('$argon2');
    expect(json).not.toContain('token_hash');
    expect(json).not.toContain('tokenHash');

    identity = new IdentitySystem(undefined, dbPath);
  });

  test('missing DB file yields a graceful empty report', () => {
    identity.close();
    const data = collectBoardData(join(dir, 'does-not-exist.db'));
    expect(data.kind).toBe('identity-board');
    expect(data.empty).toBe(true);
    expect(data.counts).toEqual({
      aliases: 0,
      activeSessions: 0,
      lockedAccounts: 0,
      anomalies24h: 0,
    });
    expect(data.aliases).toEqual([]);
    expect(data.sessions).toEqual([]);
    expect(data.audit).toEqual([]);

    identity = new IdentitySystem(undefined, dbPath);
  });

  test('report shape snapshot (normalized)', async () => {
    await seedActivity();
    identity.close();
    expect(normalizedShape(collectBoardData(dbPath))).toMatchSnapshot();

    identity = new IdentitySystem(undefined, dbPath);
  });
});
