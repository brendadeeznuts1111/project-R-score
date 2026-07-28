/**
 * Identity/auth subsystem — activity-timeline query layer tests.
 * @see ../lib/identity/timeline.ts
 * @see ../lib/identity/identity.ts
 *
 * Hermetic: temp DB per test, logins without ctx.ip (anomaly scoring
 * skipped), no geo resolver, no network.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IdentitySystem } from '../lib/identity/identity.ts';
import { getTimeline, TIMELINE_ACTIONS } from '../lib/identity/timeline.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

describe('identity-timeline', () => {
  let dir: string;
  let dbPath: string;
  let identity: IdentitySystem;
  let nodeId: TreeNodeId;
  let adminNodeId: TreeNodeId;

  const PASSWORD = 'correct horse battery staple';

  function seedTreeNode(id: TreeNodeId, name: string): void {
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

  /**
   * Seed the canonical event sequence on nodeId (newest last):
   *   alias_created → login_success → login_failed → account_locked
   *   → account_unlocked → impersonation_start (impersonatorId stamped)
   */
  async function seedEvents(): Promise<void> {
    await identity.createAlias(nodeId, 'timeline-agent', PASSWORD);
    await identity.login('timeline-agent', PASSWORD); // no ip → no anomaly scoring
    await identity.login('timeline-agent', 'wrong password').catch(() => {}); // login_failed
    identity.lockAccount('timeline-agent', 'test lock', 3600);
    identity.unlockAccount(adminNodeId, 'timeline-agent');
    // Column is stamped for the audit trail; details mirror makes it visible
    // through auditFor (which does not map the impersonator_id column).
    identity.logAuthEvent({
      nodeId,
      action: 'impersonation_start',
      details: { impersonatorId: adminNodeId },
      impersonatorId: adminNodeId,
    });
  }

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-timeline-'));
    dbPath = join(dir, 'identity.db');
    nodeId = asTreeNodeId(Bun.randomUUIDv7());
    adminNodeId = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(nodeId, 'Timeline Agent');
    seedTreeNode(adminNodeId, 'Timeline Admin');
    identity = new IdentitySystem(undefined, dbPath);
    await identity.createAlias(adminNodeId, 'timeline-admin', PASSWORD, 'admin');
    await seedEvents();
  });

  afterEach(() => {
    identity.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('unfiltered timeline is newest-first and mirrors audit entries', () => {
    const events = getTimeline(identity, nodeId);
    expect(events.length).toBe(6);
    expect(events.map(e => e.action)).toEqual([
      'impersonation_start',
      'account_unlocked',
      'account_locked',
      'login_failed',
      'login_success',
      'alias_created',
    ]);
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1]!.createdAt >= events[i]!.createdAt).toBe(true);
    }
    const failed = events.find(e => e.action === 'login_failed');
    expect(failed!.success).toBe(false);
    expect(failed!.nodeId).toBe(nodeId as string);
    expect(failed!.details).toMatchObject({ slug: 'timeline-agent' });
  });

  test('actions filter keeps only the requested subset', () => {
    const events = getTimeline(identity, nodeId, {
      actions: ['login_success', 'login_failed'],
    });
    expect(events.length).toBe(2);
    expect(events.map(e => e.action)).toEqual(['login_failed', 'login_success']);
  });

  test('since/until bound the createdAt range inclusively', () => {
    const all = getTimeline(identity, nodeId, { limit: 500 });
    const pivot = all[2]!.createdAt; // account_locked

    const since = getTimeline(identity, nodeId, { since: pivot });
    expect(since.length).toBe(all.filter(e => e.createdAt >= pivot).length);
    expect(since.every(e => e.createdAt >= pivot)).toBe(true);

    const until = getTimeline(identity, nodeId, { until: pivot });
    expect(until.length).toBe(all.filter(e => e.createdAt <= pivot).length);
    expect(until.every(e => e.createdAt <= pivot)).toBe(true);

    expect(getTimeline(identity, nodeId, { until: '2000-01-01T00:00:00.000Z' }).length).toBe(0);
    expect(
      getTimeline(identity, nodeId, { since: '2999-01-01T00:00:00.000Z' }).length
    ).toBe(0);
    expect(
      getTimeline(identity, nodeId, {
        since: '2000-01-01T00:00:00.000Z',
        until: '2999-01-01T00:00:00.000Z',
      }).length
    ).toBe(all.length);
  });

  test('failedOnly keeps failures; successOnly keeps successes', () => {
    const failed = getTimeline(identity, nodeId, { failedOnly: true });
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every(e => !e.success)).toBe(true);
    expect(failed.map(e => e.action)).toContain('login_failed');
    expect(failed.map(e => e.action)).not.toContain('login_success');

    const succeeded = getTimeline(identity, nodeId, { successOnly: true });
    expect(succeeded.every(e => e.success)).toBe(true);
    expect(succeeded.map(e => e.action)).toContain('login_success');
  });

  test('limit clamps the result after filtering', () => {
    const limited = getTimeline(identity, nodeId, { limit: 2 });
    expect(limited.length).toBe(2);
    expect(limited[0]!.action).toBe('impersonation_start'); // newest first

    const oversized = getTimeline(identity, nodeId, { limit: 9999 });
    expect(oversized.length).toBe(6); // clamped to the auditFor window, not padded

    const zero = getTimeline(identity, nodeId, { limit: 0 });
    expect(zero.length).toBe(1); // clamped up to 1
  });

  test('impersonatorId passes through from the audit entry', () => {
    const events = getTimeline(identity, nodeId, { actions: ['impersonation_start'] });
    expect(events.length).toBe(1);
    expect(events[0]!.impersonatorId).toBe(adminNodeId as string);

    // Non-impersonated events carry no impersonatorId.
    const login = getTimeline(identity, nodeId, { actions: ['login_success'] });
    expect(login[0]!.impersonatorId).toBeUndefined();
  });

  test('TIMELINE_ACTIONS covers the known auth/admin/security vocabulary', () => {
    expect(TIMELINE_ACTIONS).toContain('login_success');
    expect(TIMELINE_ACTIONS).toContain('login_failed');
    expect(TIMELINE_ACTIONS).toContain('login_locked');
    expect(TIMELINE_ACTIONS).toContain('login_blocked_anomaly');
    expect(TIMELINE_ACTIONS).toContain('login_blocked_geo');
    expect(TIMELINE_ACTIONS).toContain('login_blocked_ip');
    expect(TIMELINE_ACTIONS).toContain('logout');
    expect(TIMELINE_ACTIONS).toContain('account_locked');
    expect(TIMELINE_ACTIONS).toContain('account_unlocked');
    expect(TIMELINE_ACTIONS).toContain('impersonation_start');
    expect(TIMELINE_ACTIONS).toContain('impersonation_end');
    expect(TIMELINE_ACTIONS).toContain('alias_created');
    expect(TIMELINE_ACTIONS).toContain('password_changed');
    expect(TIMELINE_ACTIONS).toContain('device_trusted');
    expect(TIMELINE_ACTIONS).toContain('device_untrusted');
    expect(TIMELINE_ACTIONS).toContain('ip_allowlist_updated');
    expect(TIMELINE_ACTIONS).toContain('jit_provision');
    expect(TIMELINE_ACTIONS).toContain('sessions_revoked');
    expect(new Set(TIMELINE_ACTIONS).size).toBe(TIMELINE_ACTIONS.length);
  });
});
