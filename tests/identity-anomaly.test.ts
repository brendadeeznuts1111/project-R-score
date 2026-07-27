/**
 * Identity/auth subsystem — Phase 2 anomaly detection tests.
 * @see ../lib/identity/anomaly.ts
 * @see ../lib/identity/identity.ts
 *
 * ZERO network: every geo lookup uses a fake GeoResolver injected via the
 * IdentitySystem constructor option or passed directly to checkAnomaly.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  checkAnomaly,
  getFingerprint,
  trustDevice,
  type GeoResolver,
} from '../lib/identity/anomaly.ts';
import { AnomalyBlockedError, IdentitySystem } from '../lib/identity/identity.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

describe('identity-anomaly', () => {
  let dir: string;
  let dbPath: string;
  let identity: IdentitySystem;
  let nodeId: TreeNodeId;

  const PASSWORD = 'correct horse battery staple';
  const IP = '203.0.113.7';
  const UA = 'Mozilla/5.0 (bun-test)';

  const noGeo: GeoResolver = () => Promise.resolve(null);

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
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-anomaly-'));
    dbPath = join(dir, 'identity.db');
    nodeId = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(nodeId);
    identity = new IdentitySystem(undefined, dbPath, { geoResolver: noGeo });
    await identity.createAlias(nodeId, 'test-agent', PASSWORD);
  });

  afterEach(() => {
    identity.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('getFingerprint is /24-stable for IPv4 and UA-truncating', () => {
    const a = getFingerprint('203.0.113.7', UA);
    const b = getFingerprint('203.0.113.99', UA); // same /24, different host
    const c = getFingerprint('203.0.114.7', UA); // different /24
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);

    const longUa = `x${'y'.repeat(200)}`;
    expect(getFingerprint(IP, longUa)).toBe(getFingerprint(IP, `${longUa}zzz`));
  });

  test('first login from a new device is medium and allowed (login_suspicious)', async () => {
    const result = await identity.login('test-agent', PASSWORD, { ip: IP, userAgent: UA });
    expect(identity.resolveSession(result.token)).not.toBeNull();

    const suspicious = identity.auditFor(nodeId, { action: 'login_suspicious' });
    expect(suspicious.length).toBe(1);
    expect(suspicious[0]!.success).toBe(true);
    expect(suspicious[0]!.details).toMatchObject({ reason: 'New device/unknown location' });

    // Direct scoring of an unseen device agrees (fresh ip → no prior upsert).
    const risk = await checkAnomaly(identity, nodeId, '198.51.100.23', UA);
    expect(risk).toEqual({ risk: 'medium', reason: 'New device/unknown location' });
  });

  test('known-but-untrusted device is medium', async () => {
    await identity.login('test-agent', PASSWORD, { ip: IP, userAgent: UA });
    const risk = await checkAnomaly(identity, nodeId, IP, UA);
    expect(risk).toEqual({ risk: 'medium', reason: 'Known device but not trusted' });
  });

  test('trusted device scores low and skips login_suspicious', async () => {
    await identity.login('test-agent', PASSWORD, { ip: IP, userAgent: UA });

    trustDevice(identity, nodeId, getFingerprint(IP, UA));

    const risk = await checkAnomaly(identity, nodeId, IP, UA);
    expect(risk).toEqual({ risk: 'low' });

    const trustedAudit = identity.auditFor(nodeId, { action: 'device_trusted' });
    expect(trustedAudit.length).toBe(1);
    expect(trustedAudit[0]!.success).toBe(true);

    // Repeat login from the trusted device: no new login_suspicious row.
    const before = identity.auditFor(nodeId, { action: 'login_suspicious' }).length;
    await identity.login('test-agent', PASSWORD, { ip: IP, userAgent: UA });
    expect(identity.auditFor(nodeId, { action: 'login_suspicious' }).length).toBe(before);
  });

  test('new country is high: login blocked with AnomalyBlockedError + audit + onHighRisk', async () => {
    const highRiskCalls: { nodeId: TreeNodeId; reason: string }[] = [];
    // Baseline: first geo-resolved login from US (empty baseline → medium, allowed).
    identity.close();
    identity = new IdentitySystem(undefined, dbPath, {
      geoResolver: () => Promise.resolve('US'),
      onHighRisk: (id, reason) => highRiskCalls.push({ nodeId: id, reason }),
    });
    await identity.login('test-agent', PASSWORD, { ip: IP, userAgent: UA });

    // New device + new country → high → blocked.
    identity.close();
    identity = new IdentitySystem(undefined, dbPath, {
      geoResolver: () => Promise.resolve('RU'),
      onHighRisk: (id, reason) => highRiskCalls.push({ nodeId: id, reason }),
    });

    let caught: unknown;
    try {
      await identity.login('test-agent', PASSWORD, { ip: '198.51.100.9', userAgent: 'other-ua' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AnomalyBlockedError);
    expect((caught as AnomalyBlockedError).reason).toBe('Login from RU (first time)');

    const blocked = identity.auditFor(nodeId, { action: 'login_blocked_anomaly' });
    expect(blocked.length).toBe(1);
    expect(blocked[0]!.success).toBe(false);
    expect(blocked[0]!.details).toMatchObject({
      reason: 'Login from RU (first time)',
      risk: 'high',
    });

    expect(highRiskCalls.length).toBe(1);
    expect(highRiskCalls[0]).toEqual({
      nodeId: nodeId as string,
      reason: 'Login from RU (first time)',
    });

    // Blocked login still recorded the sighting (fingerprint upserted with RU).
    const sightings = identity.fingerprintsFor(nodeId);
    expect(sightings.some(s => s.countryCode === 'RU')).toBe(true);
  });

  test('throwing resolver is treated as no geo signal; login allowed', async () => {
    identity.close();
    identity = new IdentitySystem(undefined, dbPath, {
      geoResolver: () => Promise.reject(new Error('geo provider down')),
    });

    const risk = await checkAnomaly(identity, nodeId, IP, UA, () =>
      Promise.reject(new Error('boom'))
    );
    expect(risk).toEqual({ risk: 'medium', reason: 'New device/unknown location' });

    const result = await identity.login('test-agent', PASSWORD, { ip: IP, userAgent: UA });
    expect(identity.resolveSession(result.token)).not.toBeNull();
    expect(identity.auditFor(nodeId, { action: 'login_blocked_anomaly' }).length).toBe(0);
  });

  test('login without ctx.ip skips anomaly scoring entirely', async () => {
    await identity.login('test-agent', PASSWORD);
    expect(identity.auditFor(nodeId, { action: 'login_suspicious' }).length).toBe(0);
    expect(identity.fingerprintsFor(nodeId).length).toBe(0);
  });

  test('fingerprint upsert refreshes last_seen, keeps first_seen and country', async () => {
    await checkAnomaly(identity, nodeId, IP, UA, () => Promise.resolve('US'));
    const first = identity.fingerprintFor(nodeId, getFingerprint(IP, UA));
    expect(first).not.toBeNull();
    expect(first!.countryCode).toBe('US');

    // Backdate last_seen, then re-check: last_seen must move forward,
    // first_seen must stay, and a null geo signal must not erase the country.
    const db = new Database(dbPath);
    db.query(
      'UPDATE auth_device_fingerprints SET last_seen = $past WHERE node_id = $node'
    ).run({ $past: first!.lastSeen - 600, $node: nodeId });
    db.close();

    await checkAnomaly(identity, nodeId, IP, UA);
    const after = identity.fingerprintFor(nodeId, getFingerprint(IP, UA));
    expect(after!.firstSeen).toBe(first!.firstSeen);
    expect(after!.lastSeen).toBeGreaterThan(first!.lastSeen - 600);
    expect(after!.countryCode).toBe('US');
  });
});
