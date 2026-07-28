/**
 * Identity/auth subsystem — TOTP MFA tests (mfa.ts / totp-core.ts).
 *
 * RFC 6238 vectors (SHA-1): the well-known ASCII seed '12345678901234567890'
 * base32-encodes to GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ. The RFC quotes 8-digit
 * codes (T=59 → 94287082); this subsystem uses 6 digits, i.e. the low 6
 * digits of the same HOTP value (94287082 → 287082) — documented per
 * RFC 4226 §5.3 ("the last Digit digits").
 *
 * @see ../lib/identity/mfa.ts
 * @see ../lib/identity/totp-core.ts
 * @see ../lib/identity/identity.ts (login TOTP gate)
 * @see ../lib/identity/http.ts (/auth/me/totp/* routes)
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createIdentityHandler } from '../lib/identity/http.ts';
import {
  AccountLockedError,
  IdentityError,
  IdentitySystem,
  InvalidCredentialsError,
  TotpRequiredError,
} from '../lib/identity/identity.ts';
import { LOCKOUT_THRESHOLD } from '../lib/identity/lockout.ts';
import {
  confirmTotp,
  disableTotp,
  enrollTotp,
  generateTotp,
  totpEnabled,
  verifyTotp,
} from '../lib/identity/mfa.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

describe('identity-mfa', () => {
  // RFC 6238 Appendix B seed (ASCII '12345678901234567890'), base32-encoded.
  const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

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
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-mfa-'));
    dbPath = join(dir, 'identity.db');
    nodeId = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(nodeId);
    identity = new IdentitySystem(undefined, dbPath);
    await identity.createAlias(nodeId, 'mfa-agent', PASSWORD);
    handler = createIdentityHandler(identity);
  });

  afterEach(() => {
    identity.close();
    rmSync(dir, { recursive: true, force: true });
  });

  // ── TOTP core (RFC 6238) ───────────────────────────────────────────────

  test('RFC 6238 SHA-1 vectors, truncated to 6 digits', async () => {
    // 8-digit RFC values: 59→94287082, 1111111109→07081804,
    // 1111111111→14050471, 1234567890→89005924, 2000000000→69279037.
    // 6-digit expectation is value mod 1e6, zero-padded.
    const vectors: [number, string][] = [
      [59, '287082'],
      [1111111109, '081804'],
      [1111111111, '050471'],
      [1234567890, '005924'],
      [2000000000, '279037'],
    ];
    for (const [tSeconds, expected] of vectors) {
      const code = await generateTotp(RFC_SECRET, tSeconds * 1000);
      expect(code, `T=${tSeconds}`).toBe(expected);
    }
  });

  test('generate/verify round-trip at a fixed timestamp; leading zeros survive', async () => {
    const ts = 1_111_111_109_000; // vector above → '081804' (leading zero)
    const code = await generateTotp(RFC_SECRET, ts);
    expect(code).toBe('081804');
    expect(code.length).toBe(6);
    expect(await verifyTotp(RFC_SECRET, code, ts)).toBe(true);
    expect(await verifyTotp(RFC_SECRET, '000000', ts)).toBe(false);
    expect(await verifyTotp(RFC_SECRET, 'not-a-code', ts)).toBe(false);
  });

  test('window ±1 step accepts neighbors and rejects ±2', async () => {
    const ts = 59_000; // T=59 → '287082'
    const code = await generateTotp(RFC_SECRET, ts);

    expect(await verifyTotp(RFC_SECRET, code, ts)).toBe(true);
    expect(await verifyTotp(RFC_SECRET, code, ts - 30_000)).toBe(true); // one step early
    expect(await verifyTotp(RFC_SECRET, code, ts + 30_000)).toBe(true); // one step late
    expect(await verifyTotp(RFC_SECRET, code, ts - 60_000)).toBe(false); // two steps early
    expect(await verifyTotp(RFC_SECRET, code, ts + 60_000)).toBe(false); // two steps late
  });

  // ── Enrollment ─────────────────────────────────────────────────────────

  test('enrollTotp returns secret/uri/recoveryCodes and does NOT gate login yet', async () => {
    const enrollment = await enrollTotp(identity, nodeId);
    expect(enrollment.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(enrollment.uri).toContain('otpauth://totp/FactoryWager:mfa-agent');
    expect(enrollment.uri).toContain(`secret=${enrollment.secret}`);
    expect(enrollment.uri).toContain('issuer=FactoryWager');
    expect(enrollment.recoveryCodes.length).toBe(8);
    expect(new Set(enrollment.recoveryCodes).size).toBe(8); // unique
    for (const code of enrollment.recoveryCodes) {
      expect(code).toMatch(/^[a-zA-Z0-9]{10}$/);
    }

    expect(totpEnabled(identity, nodeId)).toBe(false);

    // Pending enrollment never gates login.
    const { token } = await identity.login('mfa-agent', PASSWORD);
    expect(identity.resolveSession(token)).not.toBeNull();

    const enrolled = identity.auditFor(nodeId, { action: 'totp_enrolled' });
    expect(enrolled.length).toBe(1);
  });

  test('enroll → confirm enables TOTP; wrong confirm code fails + audits', async () => {
    const { secret } = await enrollTotp(identity, nodeId);

    await expect(confirmTotp(identity, nodeId, '000000')).rejects.toThrow(IdentityError);
    expect(totpEnabled(identity, nodeId)).toBe(false);
    const failed = identity.auditFor(nodeId, { action: 'totp_confirm_failed' });
    expect(failed.length).toBe(1);
    expect(failed[0]!.success).toBe(false);

    const code = await generateTotp(secret);
    await confirmTotp(identity, nodeId, code);
    expect(totpEnabled(identity, nodeId)).toBe(true);
    const enabled = identity.auditFor(nodeId, { action: 'totp_enabled' });
    expect(enabled.length).toBe(1);
  });

  test('enrolling while ENABLED is a conflict', async () => {
    const { secret } = await enrollTotp(identity, nodeId);
    await confirmTotp(identity, nodeId, await generateTotp(secret));

    await expect(enrollTotp(identity, nodeId)).rejects.toThrow('TOTP is already enabled');
  });

  // ── Login gate ─────────────────────────────────────────────────────────

  test('login without otp → TotpRequiredError + login_totp_required audit', async () => {
    const { secret } = await enrollTotp(identity, nodeId);
    await confirmTotp(identity, nodeId, await generateTotp(secret));

    await expect(identity.login('mfa-agent', PASSWORD)).rejects.toThrow(TotpRequiredError);

    const required = identity.auditFor(nodeId, { action: 'login_totp_required' });
    expect(required.length).toBe(1);
    expect(required[0]!.success).toBe(false);

    // The counter is untouched — "otp missing" is not a credential failure.
    expect(identity.isLocked('mfa-agent')).toBe(false);
  });

  test('correct otp logs in; login_success is audited', async () => {
    const { secret } = await enrollTotp(identity, nodeId);
    await confirmTotp(identity, nodeId, await generateTotp(secret));

    const code = await generateTotp(secret);
    const { token } = await identity.login('mfa-agent', PASSWORD, { otp: code });
    expect(identity.resolveSession(token)).not.toBeNull();

    const success = identity.auditFor(nodeId, { action: 'login_success' });
    expect(success.length).toBe(1);
  });

  test('wrong otp behaves exactly like a bad password: counter increments, locks at threshold', async () => {
    const { secret } = await enrollTotp(identity, nodeId);
    await confirmTotp(identity, nodeId, await generateTotp(secret));

    for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
      await expect(
        identity.login('mfa-agent', PASSWORD, { otp: '000000' })
      ).rejects.toThrow(InvalidCredentialsError); // no MFA oracle
    }

    const failed = identity.auditFor(nodeId, { action: 'login_totp_failed' });
    expect(failed.length).toBe(LOCKOUT_THRESHOLD);
    expect(failed.every(f => f.success === false)).toBe(true);
    expect(failed[0]!.details).toMatchObject({ failedAttempts: LOCKOUT_THRESHOLD });

    const locked = identity.auditFor(nodeId, { action: 'account_locked' });
    expect(locked.length).toBe(1);
    expect(locked[0]!.details).toMatchObject({ reason: 'too_many_failed_attempts' });

    expect(identity.isLocked('mfa-agent')).toBe(true);

    // Even a CORRECT otp is rejected while locked.
    const code = await generateTotp(secret);
    await expect(identity.login('mfa-agent', PASSWORD, { otp: code })).rejects.toThrow(
      AccountLockedError
    );
  });

  test('recovery code works once, then is rejected', async () => {
    const { secret, recoveryCodes } = await enrollTotp(identity, nodeId);
    await confirmTotp(identity, nodeId, await generateTotp(secret));

    const first = await identity.login('mfa-agent', PASSWORD, { otp: recoveryCodes[0]! });
    expect(identity.resolveSession(first.token)).not.toBeNull();

    const used = identity.auditFor(nodeId, { action: 'totp_recovery_used' });
    expect(used.length).toBe(1);

    // Replay: same code is consumed → InvalidCredentialsError (no oracle).
    await expect(
      identity.login('mfa-agent', PASSWORD, { otp: recoveryCodes[0]! })
    ).rejects.toThrow(InvalidCredentialsError);

    // A different unused code still works.
    const second = await identity.login('mfa-agent', PASSWORD, { otp: recoveryCodes[1]! });
    expect(identity.resolveSession(second.token)).not.toBeNull();
  });

  // ── Disable / re-enroll ────────────────────────────────────────────────

  test('disableTotp requires a valid code; after disable, login needs no otp', async () => {
    const { secret } = await enrollTotp(identity, nodeId);
    await confirmTotp(identity, nodeId, await generateTotp(secret));

    await expect(disableTotp(identity, nodeId, '000000')).rejects.toThrow(IdentityError);
    expect(totpEnabled(identity, nodeId)).toBe(true);
    const failed = identity.auditFor(nodeId, { action: 'totp_disable_failed' });
    expect(failed.length).toBe(1);

    await disableTotp(identity, nodeId, await generateTotp(secret));
    expect(totpEnabled(identity, nodeId)).toBe(false);
    const disabled = identity.auditFor(nodeId, { action: 'totp_disabled' });
    expect(disabled.length).toBe(1);

    const { token } = await identity.login('mfa-agent', PASSWORD);
    expect(identity.resolveSession(token)).not.toBeNull();
  });

  test('disableTotp accepts a recovery code; re-enroll after disable starts clean', async () => {
    const first = await enrollTotp(identity, nodeId);
    await confirmTotp(identity, nodeId, await generateTotp(first.secret));

    await disableTotp(identity, nodeId, first.recoveryCodes[0]!);
    expect(totpEnabled(identity, nodeId)).toBe(false);

    const second = await enrollTotp(identity, nodeId);
    expect(second.secret).not.toBe(first.secret);
    await confirmTotp(identity, nodeId, await generateTotp(second.secret));

    // Old recovery codes are dead; new secret gates login.
    await expect(
      identity.login('mfa-agent', PASSWORD, { otp: first.recoveryCodes[1]! })
    ).rejects.toThrow(InvalidCredentialsError);

    const code = await generateTotp(second.secret);
    const { token } = await identity.login('mfa-agent', PASSWORD, { otp: code });
    expect(identity.resolveSession(token)).not.toBeNull();
  });

  // ── HTTP routes ────────────────────────────────────────────────────────

  test('POST /auth/login: MFA account without otp → 401 totp_required; with otp → 200', async () => {
    const { secret } = await enrollTotp(identity, nodeId);
    await confirmTotp(identity, nodeId, await generateTotp(secret));

    const missing = await handler(
      req('/auth/login', { method: 'POST', body: { slug: 'mfa-agent', password: PASSWORD } })
    );
    expect(missing!.status).toBe(401);
    expect(await missing!.json()).toEqual({ error: 'totp_required' });

    const code = await generateTotp(secret);
    const ok = await handler(
      req('/auth/login', {
        method: 'POST',
        body: { slug: 'mfa-agent', password: PASSWORD, otp: code },
      })
    );
    expect(ok!.status).toBe(200);
    const body = (await ok!.json()) as { token: string };
    expect(body.token.length).toBeGreaterThan(0);
  });

  test('/auth/me/totp/* end-to-end: enroll → confirm → disable, enroll-when-enabled → 409', async () => {
    const { token } = await identity.login('mfa-agent', PASSWORD);
    const bearer = token as string;

    const enroll = await handler(req('/auth/me/totp/enroll', { method: 'POST', token: bearer }));
    expect(enroll!.status).toBe(200);
    const enrollment = (await enroll!.json()) as {
      secret: string;
      uri: string;
      recoveryCodes: string[];
    };
    expect(enrollment.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(enrollment.recoveryCodes.length).toBe(8);

    const badConfirm = await handler(
      req('/auth/me/totp/confirm', { method: 'POST', token: bearer, body: { code: '000000' } })
    );
    expect(badConfirm!.status).toBe(400);

    const code = await generateTotp(enrollment.secret);
    const confirm = await handler(
      req('/auth/me/totp/confirm', { method: 'POST', token: bearer, body: { code } })
    );
    expect(confirm!.status).toBe(200);

    const conflict = await handler(req('/auth/me/totp/enroll', { method: 'POST', token: bearer }));
    expect(conflict!.status).toBe(409);

    const badDisable = await handler(
      req('/auth/me/totp/disable', { method: 'POST', token: bearer, body: { code: '000000' } })
    );
    expect(badDisable!.status).toBe(400);

    const disable = await handler(
      req('/auth/me/totp/disable', {
        method: 'POST',
        token: bearer,
        body: { code: await generateTotp(enrollment.secret) },
      })
    );
    expect(disable!.status).toBe(200);
    expect(totpEnabled(identity, nodeId)).toBe(false);
  });

  test('every /auth/me/totp/* route is 401 without a token', async () => {
    const routes: { method: string; path: string; body?: unknown }[] = [
      { method: 'POST', path: '/auth/me/totp/enroll' },
      { method: 'POST', path: '/auth/me/totp/confirm', body: { code: '000000' } },
      { method: 'POST', path: '/auth/me/totp/disable', body: { code: '000000' } },
    ];
    for (const route of routes) {
      const res = await handler(req(route.path, { method: route.method, body: route.body }));
      expect(res, `${route.method} ${route.path}`).not.toBeNull();
      expect(res!.status, `${route.method} ${route.path}`).toBe(401);
    }
  });
});
