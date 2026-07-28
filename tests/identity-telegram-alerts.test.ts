/**
 * Identity/auth subsystem — Telegram high-risk ops alert tests.
 * @see ../lib/identity/telegram-alerts.ts
 * @see ../lib/identity/identity.ts
 *
 * ZERO network/env dependence: the sender is injected everywhere except the
 * default-hook test, which sanitizes the Telegram env keys first so the
 * default sender provably degrades to its no-op path.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IdentitySystem } from '../lib/identity/identity.ts';
import {
  createHighRiskTelegramHook,
  formatHighRiskAlert,
} from '../lib/identity/telegram-alerts.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

const TELEGRAM_ENV_KEYS = [
  'TELEGRAM_BOT_FACTORY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_OPS_CHAT_ID',
] as const;

describe('identity-telegram-alerts', () => {
  let dir: string;
  let dbPath: string;
  let nodeId: TreeNodeId;

  const PASSWORD = 'correct horse battery staple';

  function seedTreeNode(id: TreeNodeId): void {
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
       VALUES ($id, 'agent', 'Alert Agent', '111', $now)
       ON CONFLICT(id) DO NOTHING`
    ).run({ $id: id, $now: new Date().toISOString() });
    db.close();
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-tg-alerts-'));
    dbPath = join(dir, 'identity.db');
    nodeId = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(nodeId);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('formatHighRiskAlert contains node, reason, and an ISO timestamp', () => {
    const text = formatHighRiskAlert(nodeId, 'Login from RU (first time)');
    expect(text).toContain('🚨 High-risk login blocked');
    expect(text).toContain(`Node: ${nodeId as string}`);
    expect(text).toContain('Reason: Login from RU (first time)');
    const timeLine = text.split('\n').find(l => l.startsWith('Time: '));
    expect(timeLine).toBeDefined();
    expect(new Date(timeLine!.slice('Time: '.length)).toISOString()).toBe(
      timeLine!.slice('Time: '.length)
    );
  });

  test('hook with injected send fires the formatted message (sync fire, async send)', async () => {
    const sent: string[] = [];
    const hook = createHighRiskTelegramHook({
      send: text => {
        sent.push(text);
        return Promise.resolve(true);
      },
    });

    hook(nodeId, 'Login from RU (first time)');
    await Promise.resolve(); // let the fire-and-forget promise settle

    expect(sent.length).toBe(1);
    expect(sent[0]!.startsWith('🚨 High-risk login blocked\n')).toBe(true);
    expect(sent[0]).toContain(`Node: ${nodeId as string}`);
    expect(sent[0]).toContain('Reason: Login from RU (first time)');
  });

  test('hook never throws when send rejects', async () => {
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '));
    };
    try {
      const hook = createHighRiskTelegramHook({
        send: () => Promise.reject(new Error('telegram down')),
      });
      expect(() => hook(nodeId, 'boom')).not.toThrow();
      await Promise.resolve();
      await Promise.resolve(); // flush the .catch handler
    } finally {
      console.warn = originalWarn;
    }
    // Failure was swallowed with at most a warning — never an exception.
    expect(warnings.length).toBeLessThanOrEqual(1);
  });

  test('hook never throws when send throws synchronously', () => {
    const hook = createHighRiskTelegramHook({
      send: () => {
        throw new Error('sync explosion');
      },
    });
    expect(() => hook(nodeId, 'boom')).not.toThrow();
  });

  test('default hook without Telegram env is a safe no-op; login flows still work', async () => {
    // Sanitize env so the default sender provably takes its no-op path —
    // no assertion on the ambient env, just hermetic construction.
    const saved = new Map<string, string | undefined>();
    for (const key of TELEGRAM_ENV_KEYS) {
      saved.set(key, Bun.env[key]);
      delete Bun.env[key];
    }

    let identity: IdentitySystem | undefined;
    try {
      const hook = createHighRiskTelegramHook(); // default send, no env
      expect(() => hook(nodeId, 'no-op check')).not.toThrow();
      await Promise.resolve();

      identity = new IdentitySystem(undefined, dbPath, { onHighRisk: hook });
      await identity.createAlias(nodeId, 'alert-agent', PASSWORD);

      const result = await identity.login('alert-agent', PASSWORD); // no ip → no anomaly scoring
      expect(identity.resolveSession(result.token)).not.toBeNull();
      expect(identity.auditFor(nodeId, { action: 'login_success' }).length).toBe(1);
    } finally {
      identity?.close();
      for (const key of TELEGRAM_ENV_KEYS) {
        const value = saved.get(key);
        if (value === undefined) delete Bun.env[key];
        else Bun.env[key] = value;
      }
    }
  });

  test('default hook on a real high-risk block does not mask AnomalyBlockedError', async () => {
    const saved = new Map<string, string | undefined>();
    for (const key of TELEGRAM_ENV_KEYS) {
      saved.set(key, Bun.env[key]);
      delete Bun.env[key];
    }

    let identity: IdentitySystem | undefined;
    try {
      // Baseline US login (medium, allowed), then a new-country login (high).
      identity = new IdentitySystem(undefined, dbPath, {
        geoResolver: () => Promise.resolve('US'),
        onHighRisk: createHighRiskTelegramHook(),
      });
      await identity.createAlias(nodeId, 'alert-agent', PASSWORD);
      await identity.login('alert-agent', PASSWORD, { ip: '203.0.113.7', userAgent: 'ua-1' });
      identity.close();

      identity = new IdentitySystem(undefined, dbPath, {
        geoResolver: () => Promise.resolve('RU'),
        onHighRisk: createHighRiskTelegramHook(),
      });

      let caught: unknown;
      try {
        await identity.login('alert-agent', PASSWORD, { ip: '198.51.100.9', userAgent: 'ua-2' });
      } catch (err) {
        caught = err;
      }
      expect((caught as Error).name).toBe('AnomalyBlockedError');
      await Promise.resolve(); // flush fire-and-forget send (no-op)
      expect(identity.auditFor(nodeId, { action: 'login_blocked_anomaly' }).length).toBe(1);
    } finally {
      identity?.close();
      for (const key of TELEGRAM_ENV_KEYS) {
        const value = saved.get(key);
        if (value === undefined) delete Bun.env[key];
        else Bun.env[key] = value;
      }
    }
  });
});
