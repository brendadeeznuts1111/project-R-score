/**
 * Identity/auth subsystem — WebAuthn/passkey tests (webauthn.ts).
 *
 * Zero real attestation crypto: every @simplewebauthn verify/generate call is
 * injected via PasskeyOverrides fakes. The fakes honor the expectedChallenge
 * function-form contract (calling it with the ceremony challenge), which is
 * what drives challenge consumption — single-use and expiry are therefore
 * exercised against the REAL challenge store.
 *
 * @see ../lib/identity/webauthn.ts
 * @see ../lib/identity/identity.ts (passkey/challenge accessors, createSession)
 * @see ../lib/identity/http.ts (/auth/passkey/* + /auth/me/passkeys* routes)
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { createIdentityHandler } from '../lib/identity/http.ts';
import { IdentitySystem } from '../lib/identity/identity.ts';
import {
  finishPasskeyAuthentication,
  finishPasskeyRegistration,
  listPasskeys,
  PasskeyChallengeError,
  PasskeyCounterRegressionError,
  PasskeyVerificationError,
  revokePasskey,
  startPasskeyAuthentication,
  startPasskeyRegistration,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '../lib/identity/webauthn.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

describe('identity-webauthn', () => {
  const REG_CHALLENGE = 'cmVnLWNoYWxsZW5nZS0x'; // base64url('reg-challenge-1')
  const AUTH_CHALLENGE = 'YXV0aC1jaGFsbGVuZ2UtMQ'; // base64url('auth-challenge-1')
  const CRED_ID = 'Y3JlZGVudGlhbC1pZC0x'; // base64url('credential-id-1'), 16 chars
  const PASSWORD = 'correct horse battery staple';

  let dir: string;
  let dbPath: string;
  let identity: IdentitySystem;
  let nodeId: TreeNodeId;
  let handler: (req: Request) => Promise<Response | null>;
  let nextAuthCounter: number;

  const regResponse = {
    id: CRED_ID,
    rawId: CRED_ID,
    type: 'public-key',
    response: { clientDataJSON: 'Y2xpZW50', attestationObject: 'YXR0ZXN0' },
    clientExtensionResults: {},
  } as RegistrationResponseJSON;

  const authResponse = {
    id: CRED_ID,
    rawId: CRED_ID,
    type: 'public-key',
    response: { clientDataJSON: 'Y2xpZW50', authenticatorData: 'YXV0aA', signature: 'c2ln' },
    clientExtensionResults: {},
  } as AuthenticationResponseJSON;

  /** Fake options generator — mirrors the real shape, fixed challenge. */
  const fakeGenerateRegistration = (async (
    opts: Parameters<typeof generateRegistrationOptions>[0]
  ) => ({
    challenge: REG_CHALLENGE,
    rp: { name: opts.rpName, id: opts.rpID },
    user: {
      id: Buffer.from(opts.userID ?? new Uint8Array()).toString('base64url'),
      name: opts.userName,
      displayName: opts.userDisplayName ?? opts.userName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -8 },
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    timeout: 60000,
    attestation: 'none',
    excludeCredentials: (opts.excludeCredentials ?? []).map(c => ({
      id: c.id,
      type: 'public-key',
      transports: c.transports,
    })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  })) as unknown as typeof generateRegistrationOptions;

  /** Fake attestation verifier — honors the expectedChallenge callback contract. */
  const fakeVerifyRegistration = (async (
    opts: Parameters<typeof verifyRegistrationResponse>[0]
  ) => {
    const ok =
      typeof opts.expectedChallenge === 'function'
        ? await opts.expectedChallenge(REG_CHALLENGE)
        : opts.expectedChallenge === REG_CHALLENGE;
    if (!ok) throw new Error('unexpected challenge');
    return {
      verified: true,
      registrationInfo: {
        fmt: 'none',
        aaguid: '',
        credential: {
          id: CRED_ID,
          publicKey: new Uint8Array([1, 2, 3, 4]),
          counter: 0,
          transports: ['internal'],
        },
        credentialType: 'public-key',
        attestationObject: new Uint8Array(),
        userVerified: false,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'https://factory-wager.com',
      },
    } as unknown as Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  }) as unknown as typeof verifyRegistrationResponse;

  /** Fake request-options generator — fixed challenge, echoes allowCredentials. */
  const fakeGenerateAuthentication = (async (
    opts: Parameters<typeof generateAuthenticationOptions>[0]
  ) => ({
    challenge: AUTH_CHALLENGE,
    timeout: 60000,
    rpId: opts.rpID,
    allowCredentials: (opts.allowCredentials ?? []).map(c => ({
      id: c.id,
      type: 'public-key',
      transports: c.transports,
    })),
    userVerification: opts.userVerification ?? 'preferred',
  })) as unknown as typeof generateAuthenticationOptions;

  /** Fake assertion verifier — honors expectedChallenge; counter via nextAuthCounter. */
  const fakeVerifyAuthentication = (async (
    opts: Parameters<typeof verifyAuthenticationResponse>[0]
  ) => {
    const ok =
      typeof opts.expectedChallenge === 'function'
        ? await opts.expectedChallenge(AUTH_CHALLENGE)
        : opts.expectedChallenge === AUTH_CHALLENGE;
    if (!ok) throw new Error('unexpected challenge');
    return {
      verified: true,
      authenticationInfo: {
        newCounter: nextAuthCounter,
        credentialID: opts.response.id,
        userVerified: false,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'https://factory-wager.com',
        rpID: 'factory-wager.com',
      },
    } as unknown as Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  }) as unknown as typeof verifyAuthenticationResponse;

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

  function challengeRow(challenge: string): Record<string, unknown> | null {
    const db = new Database(dbPath);
    const row = db
      .query(
        'SELECT challenge, node_id, kind, expires_at FROM auth_webauthn_challenges WHERE challenge = $c'
      )
      .get({ $c: challenge }) as Record<string, unknown> | null;
    db.close();
    return row;
  }

  function req(
    path: string,
    opts: { method?: string; token?: string | null; body?: unknown } = {}
  ): Request {
    const headers = new Headers();
    if (opts.token) headers.set('authorization', `Bearer ${opts.token}`);
    if (opts.body !== undefined) headers.set('content-type', 'application/json');
    return new Request(`http://localhost${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  }

  /** Full registration ceremony with fakes (start + finish). */
  async function registerPasskey(deviceName?: string): Promise<void> {
    await startPasskeyRegistration(identity, nodeId, deviceName, {
      generateRegistration: fakeGenerateRegistration,
    });
    await finishPasskeyRegistration(identity, nodeId, regResponse, deviceName, {
      verifyRegistration: fakeVerifyRegistration,
    });
  }

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-webauthn-'));
    dbPath = join(dir, 'identity.db');
    nodeId = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(nodeId);
    identity = new IdentitySystem(undefined, dbPath);
    await identity.createAlias(nodeId, 'passkey-agent', PASSWORD);
    handler = createIdentityHandler(identity);
    nextAuthCounter = 1;
  });

  afterEach(() => {
    identity.close();
    rmSync(dir, { recursive: true, force: true });
  });

  // ── Registration ───────────────────────────────────────────────────────

  test('startPasskeyRegistration issues a stored challenge and well-shaped options', async () => {
    const options = await startPasskeyRegistration(identity, nodeId, 'MacBook Touch ID', {
      generateRegistration: fakeGenerateRegistration,
    });

    expect(options.rp.id).toBe('factory-wager.com'); // default rpID
    expect(options.rp.name).toBe('FactoryWager'); // default rpName
    expect(options.user.name).toBe('passkey-agent');
    // userID is the nodeId bytes.
    expect(Buffer.from(options.user.id, 'base64url').toString()).toBe(nodeId as string);
    expect(options.challenge).toBe(REG_CHALLENGE);
    expect(options.excludeCredentials ?? []).toHaveLength(0);

    // Challenge stored: node-scoped, kind 'registration', ~5min TTL.
    const row = challengeRow(REG_CHALLENGE);
    expect(row).not.toBeNull();
    expect(row!.node_id).toBe(nodeId as string);
    expect(row!.kind).toBe('registration');
    expect(row!.expires_at as number).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // After a credential exists, it is excluded from the next ceremony.
    await registerPasskey('YubiKey 5');
    const second = await startPasskeyRegistration(identity, nodeId, undefined, {
      generateRegistration: fakeGenerateRegistration,
    });
    expect(second.excludeCredentials?.map(c => c.id)).toEqual([CRED_ID]);
  });

  test('finishPasskeyRegistration with injected verify stores the credential and audits', async () => {
    await registerPasskey('YubiKey 5');

    const stored = identity.passkeysFor(nodeId);
    expect(stored).toHaveLength(1);
    expect(stored[0]!.credentialId).toBe(CRED_ID);
    expect(stored[0]!.deviceName).toBe('YubiKey 5');
    expect(stored[0]!.counter).toBe(0);
    expect(stored[0]!.transports).toEqual(['internal']);
    expect(stored[0]!.lastUsedAt).toBeNull();

    const audit = identity.auditFor(nodeId, { action: 'passkey_registered' });
    expect(audit).toHaveLength(1);
    expect(audit[0]!.details).toMatchObject({
      credentialId: CRED_ID.slice(0, 12),
      deviceName: 'YubiKey 5',
    });
  });

  test('registration challenge is single-use — a second finish hits PasskeyChallengeError', async () => {
    await registerPasskey();
    await expect(
      finishPasskeyRegistration(identity, nodeId, regResponse, undefined, {
        verifyRegistration: fakeVerifyRegistration,
      })
    ).rejects.toThrow(PasskeyChallengeError);
    expect(challengeRow(REG_CHALLENGE)).toBeNull();
  });

  // ── Authentication (passwordless login) ────────────────────────────────

  test('auth-options for an UNKNOWN slug: empty allowCredentials + stored challenge (no enumeration)', async () => {
    const options = await startPasskeyAuthentication(identity, 'no-such-slug', {
      generateAuthentication: fakeGenerateAuthentication,
    });

    expect(options.allowCredentials ?? []).toHaveLength(0);
    expect(options.challenge).toBe(AUTH_CHALLENGE);

    // Challenge stored with NULL node_id — node unknown until the assertion.
    const row = challengeRow(AUTH_CHALLENGE);
    expect(row).not.toBeNull();
    expect(row!.node_id).toBeNull();
    expect(row!.kind).toBe('authentication');
  });

  test('finishPasskeyAuthentication mints a working session, advances the counter, audits via=passkey', async () => {
    await registerPasskey('YubiKey 5');

    await startPasskeyAuthentication(identity, 'passkey-agent', {
      generateAuthentication: fakeGenerateAuthentication,
    });
    const result = await finishPasskeyAuthentication(
      identity,
      'passkey-agent',
      authResponse,
      { ip: '203.0.113.7', userAgent: 'test-agent' },
      { verifyAuthentication: fakeVerifyAuthentication }
    );

    // resolveSession round-trip — the minted token is a live session.
    const session = identity.resolveSession(result.token);
    expect(session).not.toBeNull();
    expect(session!.nodeId).toBe(nodeId);
    expect(session!.sessionId).toBe(result.sessionId);

    // Counter advanced + last_used_at stamped.
    const stored = identity.passkeysFor(nodeId);
    expect(stored[0]!.counter).toBe(1);
    expect(stored[0]!.lastUsedAt).not.toBeNull();

    const audit = identity.auditFor(nodeId, { action: 'login_success' });
    expect(audit).toHaveLength(1);
    expect(audit[0]!.details).toMatchObject({ slug: 'passkey-agent', via: 'passkey' });
    expect(audit[0]!.ip).toBe('203.0.113.7');
  });

  test('counter regression is blocked and audited (counter unchanged)', async () => {
    await registerPasskey();

    nextAuthCounter = 5;
    await startPasskeyAuthentication(identity, 'passkey-agent', {
      generateAuthentication: fakeGenerateAuthentication,
    });
    await finishPasskeyAuthentication(identity, 'passkey-agent', authResponse, {}, {
      verifyAuthentication: fakeVerifyAuthentication,
    });
    expect(identity.passkeysFor(nodeId)[0]!.counter).toBe(5);

    nextAuthCounter = 3; // authenticator reports a LOWER counter — clone signal
    await startPasskeyAuthentication(identity, 'passkey-agent', {
      generateAuthentication: fakeGenerateAuthentication,
    });
    await expect(
      finishPasskeyAuthentication(identity, 'passkey-agent', authResponse, {}, {
        verifyAuthentication: fakeVerifyAuthentication,
      })
    ).rejects.toThrow(PasskeyCounterRegressionError);

    const audit = identity.auditFor(nodeId, { action: 'passkey_counter_regression' });
    expect(audit).toHaveLength(1);
    expect(audit[0]!.success).toBe(false);
    expect(audit[0]!.details).toMatchObject({ storedCounter: 5, newCounter: 3 });
    expect(identity.passkeysFor(nodeId)[0]!.counter).toBe(5); // unchanged
  });

  test('authentication challenge is single-use — replaying the assertion fails', async () => {
    await registerPasskey();

    await startPasskeyAuthentication(identity, 'passkey-agent', {
      generateAuthentication: fakeGenerateAuthentication,
    });
    await finishPasskeyAuthentication(identity, 'passkey-agent', authResponse, {}, {
      verifyAuthentication: fakeVerifyAuthentication,
    });

    // Same assertion again, no new ceremony: the challenge is gone.
    await expect(
      finishPasskeyAuthentication(identity, 'passkey-agent', authResponse, {}, {
        verifyAuthentication: fakeVerifyAuthentication,
      })
    ).rejects.toThrow(PasskeyChallengeError);
  });

  test('expired challenge is rejected (backdated via SQL)', async () => {
    await registerPasskey();

    await startPasskeyAuthentication(identity, 'passkey-agent', {
      generateAuthentication: fakeGenerateAuthentication,
    });
    const db = new Database(dbPath);
    db.query("UPDATE auth_webauthn_challenges SET expires_at = 1 WHERE kind = 'authentication'").run();
    db.close();

    await expect(
      finishPasskeyAuthentication(identity, 'passkey-agent', authResponse, {}, {
        verifyAuthentication: fakeVerifyAuthentication,
      })
    ).rejects.toThrow(PasskeyChallengeError);
  });

  // ── Management ─────────────────────────────────────────────────────────

  test('listPasskeys truncates the credential id and never exposes the public key; revoke works by prefix', async () => {
    await registerPasskey('YubiKey 5');

    const list = listPasskeys(identity, nodeId);
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({
      credentialId: CRED_ID.slice(0, 12),
      deviceName: 'YubiKey 5',
      createdAt: expect.any(String),
      lastUsedAt: null,
    });
    expect('publicKey' in list[0]!).toBe(false);

    revokePasskey(identity, nodeId, list[0]!.credentialId); // truncated ≥12-char prefix
    expect(listPasskeys(identity, nodeId)).toHaveLength(0);

    const audit = identity.auditFor(nodeId, { action: 'passkey_revoked' });
    expect(audit).toHaveLength(1);
    expect(audit[0]!.details).toMatchObject({ credentialId: CRED_ID.slice(0, 12) });
  });

  test('a revoked credential fails finish-auth with PasskeyVerificationError', async () => {
    await registerPasskey();
    revokePasskey(identity, nodeId, CRED_ID);

    await startPasskeyAuthentication(identity, 'passkey-agent', {
      generateAuthentication: fakeGenerateAuthentication,
    });
    await expect(
      finishPasskeyAuthentication(identity, 'passkey-agent', authResponse, {}, {
        verifyAuthentication: fakeVerifyAuthentication,
      })
    ).rejects.toThrow(PasskeyVerificationError);
  });

  // ── HTTP routes ────────────────────────────────────────────────────────

  test('register + management routes are 401 without a token; auth-options is public', async () => {
    const guarded: { method: string; path: string; body?: unknown }[] = [
      { method: 'POST', path: '/auth/passkey/register-options', body: {} },
      { method: 'POST', path: '/auth/passkey/register-verify', body: { response: regResponse } },
      { method: 'GET', path: '/auth/me/passkeys' },
      { method: 'POST', path: '/auth/me/passkeys/revoke', body: { credentialId: CRED_ID } },
    ];
    for (const route of guarded) {
      const res = await handler(req(route.path, { method: route.method, body: route.body }));
      expect(res, `${route.method} ${route.path}`).not.toBeNull();
      expect(res!.status, `${route.method} ${route.path}`).toBe(401);
    }

    // Public ceremony start (real generator — no crypto verification involved).
    const pub = await handler(
      req('/auth/passkey/auth-options', { method: 'POST', body: { slug: 'passkey-agent' } })
    );
    expect(pub!.status).toBe(200);
    const pubBody = (await pub!.json()) as { challenge: string; allowCredentials?: unknown[] };
    expect(typeof pubBody.challenge).toBe('string');
    expect(pubBody.allowCredentials ?? []).toHaveLength(0); // no passkeys registered yet
  });

  test('register-options with a Bearer token returns creation options scoped to the caller', async () => {
    const { token } = await identity.login('passkey-agent', PASSWORD);
    const res = await handler(
      req('/auth/passkey/register-options', {
        method: 'POST',
        token: token as string,
        body: { deviceName: 'MacBook Touch ID' },
      })
    );
    expect(res!.status).toBe(200);
    const options = (await res!.json()) as {
      challenge: string;
      rp: { id: string; name: string }; // brand-ok — WebAuthn RP id is a domain-name string, not an entity id
      user: { id: string; name: string }; // brand-ok — WebAuthn user handle (base64url wire bytes), not a domain id
    };
    expect(options.rp.id).toBe('factory-wager.com');
    expect(options.user.name).toBe('passkey-agent');
    expect(Buffer.from(options.user.id, 'base64url').toString()).toBe(nodeId as string);

    const row = challengeRow(options.challenge);
    expect(row).not.toBeNull();
    expect(row!.kind).toBe('registration');
  });

  test('register-verify with a malformed body → 400; bad attestation → 400 passkey code', async () => {
    const { token } = await identity.login('passkey-agent', PASSWORD);
    const bearer = token as string;

    const badBody = await handler(
      req('/auth/passkey/register-verify', {
        method: 'POST',
        token: bearer,
        body: { response: { nope: true } },
      })
    );
    expect(badBody!.status).toBe(400);
    expect(await badBody!.json()).toEqual({ error: 'Invalid request body' });

    // Well-shaped response but no ceremony started → real verifier rejects
    // the bogus clientDataJSON before any challenge check → 400 family.
    const badAttestation = await handler(
      req('/auth/passkey/register-verify', {
        method: 'POST',
        token: bearer,
        body: { response: regResponse },
      })
    );
    expect(badAttestation!.status).toBe(400);
  });

  test('GET /auth/me/passkeys lists own passkeys; revoke route removes them', async () => {
    await registerPasskey('YubiKey 5');
    const { token } = await identity.login('passkey-agent', PASSWORD);
    const bearer = token as string;

    const list = await handler(req('/auth/me/passkeys', { token: bearer }));
    expect(list!.status).toBe(200);
    const listBody = (await list!.json()) as {
      passkeys: { credentialId: string; deviceName: string | null }[]; // brand-ok — truncated opaque WebAuthn credential id straight from the wire
    };
    expect(listBody.passkeys).toHaveLength(1);
    expect(listBody.passkeys[0]).toMatchObject({
      credentialId: CRED_ID.slice(0, 12),
      deviceName: 'YubiKey 5',
    });

    const revoke = await handler(
      req('/auth/me/passkeys/revoke', {
        method: 'POST',
        token: bearer,
        body: { credentialId: listBody.passkeys[0]!.credentialId },
      })
    );
    expect(revoke!.status).toBe(200);
    expect(listPasskeys(identity, nodeId)).toHaveLength(0);
  });

  test('auth-verify with an unknown credential → 400 passkey_verification_failed', async () => {
    // Ceremony started (real generator stores the challenge), but the
    // credential id in the response was never registered → 400 before verify.
    await handler(
      req('/auth/passkey/auth-options', { method: 'POST', body: { slug: 'passkey-agent' } })
    );
    const res = await handler(
      req('/auth/passkey/auth-verify', {
        method: 'POST',
        body: { slug: 'passkey-agent', response: authResponse },
      })
    );
    expect(res!.status).toBe(400);
    expect(await res!.json()).toEqual({ error: 'passkey_verification_failed' });
  });
});
