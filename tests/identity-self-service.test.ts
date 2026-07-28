/**
 * Identity/auth subsystem — Phase 4 self-service security tests.
 * @see ../lib/identity/self-service.ts
 * @see ../lib/identity/http.ts
 * @see ../lib/identity/identity.ts (IP allowlist login gate)
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getFingerprint, trustDevice } from '../lib/identity/anomaly.ts';
import { createIdentityHandler } from '../lib/identity/http.ts';
import {
  IdentitySystem,
  InvalidCredentialsError,
  IpNotAllowedError,
  WeakPasswordError,
} from '../lib/identity/identity.ts';
import {
  changePassword,
  getIpAllowlist,
  listDevices,
  listSessions,
  revokeOtherSessions,
  revokeOwnSession,
  setIpAllowlist,
  untrustDevice,
} from '../lib/identity/self-service.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

describe('identity-self-service', () => {
  let dir: string;
  let dbPath: string;
  let identity: IdentitySystem;
  let nodeId: TreeNodeId;
  let handler: (req: Request) => Promise<Response | null>;

  const PASSWORD = 'correct horse battery staple';
  const NEW_PASSWORD = 'different correct battery horse';

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

  function req(
    path: string,
    opts: { method?: string; token?: string | null; body?: unknown; ip?: string } = {}
  ): Request {
    const headers = new Headers();
    if (opts.token) headers.set('authorization', `Bearer ${opts.token}`);
    if (opts.ip) headers.set('cf-connecting-ip', opts.ip);
    if (opts.body !== undefined) headers.set('content-type', 'application/json');
    return new Request(`http://localhost${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  }

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-self-service-'));
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

  // ── Change password ────────────────────────────────────────────────────

  test('changePassword rotates the hash; login works with the new password only', async () => {
    const { token } = await identity.login('test-agent', PASSWORD);

    await changePassword(identity, nodeId, PASSWORD, NEW_PASSWORD, token);

    const relogin = await identity.login('test-agent', NEW_PASSWORD);
    expect(identity.resolveSession(relogin.token)).not.toBeNull();
    await expect(identity.login('test-agent', PASSWORD)).rejects.toThrow(InvalidCredentialsError);

    const changed = identity.auditFor(nodeId, { action: 'password_changed' });
    expect(changed.length).toBe(1);
    expect(changed[0]!.success).toBe(true);

    const summary = identity.aliasSummaryFor(nodeId);
    expect(summary!.rotatedAt).not.toBeNull();
  });

  test('changePassword rejects a wrong current password and audits the failure', async () => {
    const { token } = await identity.login('test-agent', PASSWORD);

    await expect(
      changePassword(identity, nodeId, 'not the password', NEW_PASSWORD, token)
    ).rejects.toThrow(InvalidCredentialsError);

    const failed = identity.auditFor(nodeId, { action: 'password_change_failed' });
    expect(failed.length).toBe(1);
    expect(failed[0]!.success).toBe(false);

    // Password unchanged.
    const relogin = await identity.login('test-agent', PASSWORD);
    expect(identity.resolveSession(relogin.token)).not.toBeNull();
  });

  test('changePassword rejects a weak new password with feedback', async () => {
    const { token } = await identity.login('test-agent', PASSWORD);

    const err = await changePassword(identity, nodeId, PASSWORD, 'weak', token).catch(e => e);
    expect(err).toBeInstanceOf(WeakPasswordError);
    expect((err as WeakPasswordError).feedback.length).toBeGreaterThan(0);

    // Password unchanged.
    const relogin = await identity.login('test-agent', PASSWORD);
    expect(identity.resolveSession(relogin.token)).not.toBeNull();
  });

  test('changePassword revokes all OTHER sessions; the current token survives', async () => {
    const old1 = await identity.login('test-agent', PASSWORD, { ip: '203.0.113.7' });
    const old2 = await identity.login('test-agent', PASSWORD, { ip: '203.0.113.8' });
    const current = await identity.login('test-agent', PASSWORD, { ip: '203.0.113.9' });

    const revoked = await changePassword(identity, nodeId, PASSWORD, NEW_PASSWORD, current.token);
    expect(revoked).toBe(2);

    expect(identity.resolveSession(old1.token)).toBeNull();
    expect(identity.resolveSession(old2.token)).toBeNull();
    expect(identity.resolveSession(current.token)).not.toBeNull();

    const audit = identity.auditFor(nodeId, { action: 'sessions_revoked' });
    expect(audit.length).toBe(1);
    expect(audit[0]!.details).toMatchObject({ count: 2, reason: 'password_changed' });
  });

  // ── Session management ─────────────────────────────────────────────────

  test('listSessions shows active sessions with ip/UA and never leaks token_hash', async () => {
    await identity.login('test-agent', PASSWORD, { ip: '203.0.113.7', userAgent: 'bun-test' });
    await identity.login('test-agent', PASSWORD, { ip: '198.51.100.9', userAgent: 'other-agent' });

    const sessions = listSessions(identity, nodeId);
    expect(sessions.length).toBe(2);
    expect(sessions.map(s => s.ip).sort()).toEqual(['198.51.100.9', '203.0.113.7']);
    expect(sessions.map(s => s.userAgent).sort()).toEqual(['bun-test', 'other-agent']);
    for (const s of sessions) {
      expect(s.impersonated).toBe(false);
      expect(s.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    }
    const json = JSON.stringify(sessions);
    expect(json).not.toContain('token_hash');
    expect(json).not.toContain('tokenHash');
  });

  test('revokeOtherSessions keeps the current session and kills the rest', async () => {
    const first = await identity.login('test-agent', PASSWORD);
    const second = await identity.login('test-agent', PASSWORD);

    const revoked = revokeOtherSessions(identity, nodeId, second.token);
    expect(revoked).toBe(1);

    expect(identity.resolveSession(first.token)).toBeNull();
    expect(identity.resolveSession(second.token)).not.toBeNull();

    const audit = identity.auditFor(nodeId, { action: 'sessions_revoked' });
    expect(audit[0]!.details).toMatchObject({ count: 1, reason: 'user_request' });
  });

  test('revokeOwnSession kills exactly that session ("log out this device")', async () => {
    const first = await identity.login('test-agent', PASSWORD);
    const second = await identity.login('test-agent', PASSWORD);

    revokeOwnSession(identity, nodeId, first.token);

    expect(identity.resolveSession(first.token)).toBeNull();
    expect(identity.resolveSession(second.token)).not.toBeNull();

    const audit = identity.auditFor(nodeId, { action: 'session_revoked' });
    expect(audit.length).toBe(1);
    expect(audit[0]!.success).toBe(true);
  });

  // ── Device trust ───────────────────────────────────────────────────────

  test('listDevices truncates the hash; untrustDevice flips trusted off (prefix ok)', async () => {
    await identity.login('test-agent', PASSWORD, { ip: '203.0.113.7', userAgent: 'bun-test' });
    const fullHash = getFingerprint('203.0.113.7', 'bun-test');
    trustDevice(identity, nodeId, fullHash);
    expect(identity.fingerprintFor(nodeId, fullHash)!.trusted).toBe(true);

    const devices = listDevices(identity, nodeId);
    expect(devices.length).toBe(1);
    expect(devices[0]!.fingerprintHash).toBe(fullHash.slice(0, 12));
    expect(devices[0]!.fingerprintHash.length).toBe(12);
    expect(devices[0]!.trusted).toBe(true);

    // The truncated form returned by listDevices is sufficient to untrust.
    untrustDevice(identity, nodeId, devices[0]!.fingerprintHash);
    expect(identity.fingerprintFor(nodeId, fullHash)!.trusted).toBe(false);

    const audit = identity.auditFor(nodeId, { action: 'device_untrusted' });
    expect(audit.length).toBe(1);
  });

  test('untrustDevice rejects unknown or too-short fingerprints', async () => {
    expect(() => untrustDevice(identity, nodeId, 'deadbeefdead')).toThrow(
      'Unknown or ambiguous device fingerprint'
    );
    expect(() => untrustDevice(identity, nodeId, 'short')).toThrow(
      'Unknown or ambiguous device fingerprint'
    );
  });

  // ── IP allowlist ───────────────────────────────────────────────────────

  test('setIpAllowlist/getIpAllowlist round-trip; invalid entries rejected atomically', async () => {
    setIpAllowlist(identity, nodeId, ['203.0.113.0/24', '198.51.100.9']);

    const entries = getIpAllowlist(identity, nodeId);
    expect(entries.map(e => e.cidr).sort()).toEqual(['198.51.100.9', '203.0.113.0/24']);

    const audit = identity.auditFor(nodeId, { action: 'ip_allowlist_updated' });
    expect(audit.length).toBe(1);
    expect(audit[0]!.details).toMatchObject({ count: 2 });

    // Replace-all semantics.
    setIpAllowlist(identity, nodeId, ['192.0.2.10']);
    expect(getIpAllowlist(identity, nodeId).map(e => e.cidr)).toEqual(['192.0.2.10']);

    // Invalid entry: rejected, nothing written.
    expect(() => setIpAllowlist(identity, nodeId, ['10.0.0.0/8'])).toThrow(
      'Invalid allowlist entry'
    );
    expect(() => setIpAllowlist(identity, nodeId, ['999.1.2.3'])).toThrow(
      'Invalid allowlist entry'
    );
    expect(getIpAllowlist(identity, nodeId).map(e => e.cidr)).toEqual(['192.0.2.10']);
  });

  test('login from a non-allowlisted IP is blocked and audited', async () => {
    setIpAllowlist(identity, nodeId, ['203.0.113.0/24']);

    await expect(
      identity.login('test-agent', PASSWORD, { ip: '198.51.100.9' })
    ).rejects.toThrow(IpNotAllowedError);

    const blocked = identity.auditFor(nodeId, { action: 'login_blocked_ip' });
    expect(blocked.length).toBe(1);
    expect(blocked[0]!.success).toBe(false);
    expect(blocked[0]!.ip).toBe('198.51.100.9');
  });

  test('allowlisted IPs pass: /24 prefix match and exact IPv4', async () => {
    setIpAllowlist(identity, nodeId, ['203.0.113.0/24', '198.51.100.9']);

    const prefix = await identity.login('test-agent', PASSWORD, { ip: '203.0.113.99' });
    expect(identity.resolveSession(prefix.token)).not.toBeNull();

    const exact = await identity.login('test-agent', PASSWORD, { ip: '198.51.100.9' });
    expect(identity.resolveSession(exact.token)).not.toBeNull();
  });

  test('an empty allowlist means no restriction; no ctx.ip never blocks', async () => {
    setIpAllowlist(identity, nodeId, ['203.0.113.0/24']);
    setIpAllowlist(identity, nodeId, []); // cleared

    const any = await identity.login('test-agent', PASSWORD, { ip: '198.51.100.9' });
    expect(identity.resolveSession(any.token)).not.toBeNull();

    // Even with entries set, a missing IP signal allows (documented posture).
    setIpAllowlist(identity, nodeId, ['203.0.113.0/24']);
    const noIp = await identity.login('test-agent', PASSWORD);
    expect(identity.resolveSession(noIp.token)).not.toBeNull();
  });

  // ── HTTP routes ────────────────────────────────────────────────────────

  test('POST /auth/login from a blocked IP is 403', async () => {
    setIpAllowlist(identity, nodeId, ['203.0.113.0/24']);

    const res = await handler(
      req('/auth/login', {
        method: 'POST',
        body: { slug: 'test-agent', password: PASSWORD },
        ip: '198.51.100.9',
      })
    );
    expect(res!.status).toBe(403);

    const blocked = identity.auditFor(nodeId, { action: 'login_blocked_ip' });
    expect(blocked.length).toBe(1);
  });

  test('POST /auth/me/password: 200 on success, 401 wrong current, 400 weak', async () => {
    const { token } = await identity.login('test-agent', PASSWORD);
    const bearer = token as string;

    const weak = await handler(
      req('/auth/me/password', {
        method: 'POST',
        token: bearer,
        body: { currentPassword: PASSWORD, newPassword: 'weak' },
      })
    );
    expect(weak!.status).toBe(400);
    expect(((await weak!.json()) as { feedback: string[] }).feedback.length).toBeGreaterThan(0);

    const wrong = await handler(
      req('/auth/me/password', {
        method: 'POST',
        token: bearer,
        body: { currentPassword: 'nope', newPassword: NEW_PASSWORD },
      })
    );
    expect(wrong!.status).toBe(401);

    const ok = await handler(
      req('/auth/me/password', {
        method: 'POST',
        token: bearer,
        body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
      })
    );
    expect(ok!.status).toBe(200);
    expect(((await ok!.json()) as { ok: boolean }).ok).toBe(true);

    // New password works at the login route too.
    const login = await handler(
      req('/auth/login', { method: 'POST', body: { slug: 'test-agent', password: NEW_PASSWORD } })
    );
    expect(login!.status).toBe(200);
  });

  test('GET /auth/me/sessions + POST /auth/me/sessions/revoke-others', async () => {
    const first = await identity.login('test-agent', PASSWORD, {
      ip: '203.0.113.7',
      userAgent: 'bun-test',
    });
    const second = await identity.login('test-agent', PASSWORD);

    const list = await handler(req('/auth/me/sessions', { token: second.token as string }));
    expect(list!.status).toBe(200);
    const body = (await list!.json()) as { sessions: { ip: string | null }[] };
    expect(body.sessions.length).toBe(2);
    expect(JSON.stringify(body)).not.toContain('token_hash');

    const revoke = await handler(
      req('/auth/me/sessions/revoke-others', { method: 'POST', token: second.token as string })
    );
    expect(revoke!.status).toBe(200);
    expect(((await revoke!.json()) as { revoked: number }).revoked).toBe(1);
    expect(identity.resolveSession(first.token)).toBeNull();
    expect(identity.resolveSession(second.token)).not.toBeNull();
  });

  test('GET /auth/me/devices + POST /auth/me/devices/untrust', async () => {
    const { token } = await identity.login('test-agent', PASSWORD, {
      ip: '203.0.113.7',
      userAgent: 'bun-test',
    });
    const fullHash = getFingerprint('203.0.113.7', 'bun-test');
    trustDevice(identity, nodeId, fullHash);

    const list = await handler(req('/auth/me/devices', { token: token as string }));
    expect(list!.status).toBe(200);
    const body = (await list!.json()) as { devices: { fingerprintHash: string; trusted: boolean }[] };
    expect(body.devices.length).toBe(1);
    expect(body.devices[0]!.fingerprintHash).toBe(fullHash.slice(0, 12));
    expect(body.devices[0]!.trusted).toBe(true);

    const untrust = await handler(
      req('/auth/me/devices/untrust', {
        method: 'POST',
        token: token as string,
        body: { fingerprintHash: body.devices[0]!.fingerprintHash },
      })
    );
    expect(untrust!.status).toBe(200);
    expect(identity.fingerprintFor(nodeId, fullHash)!.trusted).toBe(false);
  });

  test('GET/PUT /auth/me/ip-allowlist round-trip; invalid cidr is 400', async () => {
    const { token } = await identity.login('test-agent', PASSWORD);
    const bearer = token as string;

    const put = await handler(
      req('/auth/me/ip-allowlist', {
        method: 'PUT',
        token: bearer,
        body: { cidrs: ['203.0.113.0/24', '198.51.100.9'] },
      })
    );
    expect(put!.status).toBe(200);
    expect(((await put!.json()) as { count: number }).count).toBe(2);

    const get = await handler(req('/auth/me/ip-allowlist', { token: bearer }));
    expect(get!.status).toBe(200);
    const body = (await get!.json()) as { entries: { cidr: string }[] };
    expect(body.entries.map(e => e.cidr).sort()).toEqual(['198.51.100.9', '203.0.113.0/24']);

    const bad = await handler(
      req('/auth/me/ip-allowlist', { method: 'PUT', token: bearer, body: { cidrs: ['10.0.0.0/8'] } })
    );
    expect(bad!.status).toBe(400);
  });

  test('every /auth/me/* route is 401 without a token', async () => {
    const routes: { method: string; path: string; body?: unknown }[] = [
      { method: 'POST', path: '/auth/me/password', body: { currentPassword: 'x', newPassword: 'y' } },
      { method: 'GET', path: '/auth/me/sessions' },
      { method: 'POST', path: '/auth/me/sessions/revoke-others' },
      { method: 'GET', path: '/auth/me/devices' },
      { method: 'POST', path: '/auth/me/devices/untrust', body: { fingerprintHash: 'abc' } },
      { method: 'GET', path: '/auth/me/ip-allowlist' },
      { method: 'PUT', path: '/auth/me/ip-allowlist', body: { cidrs: [] } },
    ];
    for (const route of routes) {
      const res = await handler(req(route.path, { method: route.method, body: route.body }));
      expect(res, `${route.method} ${route.path}`).not.toBeNull();
      expect(res!.status, `${route.method} ${route.path}`).toBe(401);
    }
  });
});
