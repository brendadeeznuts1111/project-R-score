// @see https://bun.com/docs/runtime/sqlite — bun:sqlite (access via IdentitySystem accessors)
/**
 * WebAuthn/passkeys — thin policy/audit wrapper over `IdentitySystem` (same
 * pattern as mfa.ts / self-service.ts): all DB access goes through narrow
 * typed accessors on the system; this file holds ceremony policy + audit.
 *
 * Attestation/assertion verification is delegated to `@simplewebauthn/server`
 * — the ONE approved runtime dependency for this subsystem. WebAuthn
 * verification (COSE key parsing, attestation formats, signature checks)
 * must NOT be hand-rolled; the repo stays Bun-native/zero-dep everywhere
 * else. The four library calls sit behind module-level wrappers and every
 * start/finish function accepts injectable overrides (`PasskeyOverrides`),
 * so tests run with fakes (zero real attestation crypto) while production
 * passes nothing.
 *
 * Registration (Bearer self-scope, caller's own node):
 *   1. startPasskeyRegistration → PublicKeyCredentialCreationOptionsJSON
 *      (excludeCredentials = the node's existing passkeys, userID = nodeId
 *      bytes); the challenge is stored (kind 'registration', 5min TTL,
 *      node-scoped).
 *   2. finishPasskeyRegistration → verifyRegistrationResponse against the
 *      stored challenge (single-use — consumed via the expectedChallenge
 *      callback, so a failed verify also burns the challenge), then the
 *      credential is stored. Audits `passkey_registered` (or
 *      `passkey_register_failed`, success 0).
 *
 * Authentication (passwordless login):
 *   1. startPasskeyAuthentication(slug) → PublicKeyCredentialRequestOptionsJSON
 *      scoped to the slug's credentials. An UNKNOWN slug gets an empty
 *      allowCredentials + a challenge anyway — no user enumeration. The
 *      challenge is stored with NULL node_id (the node is unknown until the
 *      assertion arrives) and consumed by challenge value.
 *   2. finishPasskeyAuthentication → verifyAuthenticationResponse
 *      (requireUserVerification false) against the stored credential; the
 *      sign counter advances. A counter REGRESSION audits
 *      `passkey_counter_regression` (success 0) and blocks. On success:
 *      audits `login_success` with details.via='passkey' and mints a session
 *      via IdentitySystem.createSession (same storage invariant as login()).
 *
 * Challenge hygiene: auth_webauthn_challenges rows are single-use (deleted
 * on consume) and expired rows are swept lazily by every store/consume.
 *
 * Errors (all extend IdentityError; http.ts maps them to 400 with
 * machine-readable codes): PasskeyChallengeError ('passkey_challenge_invalid'
 * — unknown/used/expired challenge), PasskeyVerificationError
 * ('passkey_verification_failed' — unknown credential or failed
 * attestation/assertion), PasskeyCounterRegressionError
 * ('passkey_counter_regression' — cloned authenticator signal).
 */

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { base64UrlToBytes, bytesToBase64Url } from '../bytes-base64.ts';
import type { TreeNodeId } from '../types/branded.ts';
import {
  IdentityError,
  type IdentitySystem,
  type LoginResult,
  type StoredPasskey,
} from './identity.ts';

// Options/response JSON wire types — the ONLY @simplewebauthn types re-exported.
export type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
};

// ── Errors ───────────────────────────────────────────────────────────────

/** Unknown, already-used, or expired challenge. HTTP → 400 'passkey_challenge_invalid'. */
export class PasskeyChallengeError extends IdentityError {
  constructor() {
    super('Invalid or expired passkey challenge');
    this.name = 'PasskeyChallengeError';
  }
}

/** Unknown credential, or attestation/assertion verification failed. HTTP → 400 'passkey_verification_failed'. */
export class PasskeyVerificationError extends IdentityError {
  constructor(message = 'Passkey verification failed') {
    super(message);
    this.name = 'PasskeyVerificationError';
  }
}

/** Sign counter moved backwards — cloned-authenticator signal. HTTP → 400 'passkey_counter_regression'. */
export class PasskeyCounterRegressionError extends IdentityError {
  constructor() {
    super('Passkey counter regression');
    this.name = 'PasskeyCounterRegressionError';
  }
}

// ── Testability seam ─────────────────────────────────────────────────────

/**
 * Injectable overrides for the four @simplewebauthn calls. Production passes
 * nothing (the real functions are used); tests inject fakes — zero real
 * attestation crypto anywhere in the test suite.
 */
export interface PasskeyOverrides {
  generateRegistration?: typeof generateRegistrationOptions;
  verifyRegistration?: typeof verifyRegistrationResponse;
  generateAuthentication?: typeof generateAuthenticationOptions;
  verifyAuthentication?: typeof verifyAuthenticationResponse;
}

// ── Constants / helpers ──────────────────────────────────────────────────

const CHALLENGE_TTL_SECONDS = 5 * 60; // 5 min
const CREDENTIAL_ID_PREVIEW = 12; // truncated form shown by listPasskeys / audits

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

function base64urlEncode(bytes: Uint8Array): string {
  return bytesToBase64Url(bytes);
}

function base64urlDecode(value: string): Uint8Array {
  return base64UrlToBytes(value);
}

function toTransports(transports: string[] | null): AuthenticatorTransportFuture[] | undefined {
  return transports ? (transports as AuthenticatorTransportFuture[]) : undefined;
}

// ── Registration ─────────────────────────────────────────────────────────

/**
 * Begin passkey registration for the caller's OWN node. Returns the options
 * JSON the client hands to navigator.credentials.create() (via
 * @simplewebauthn/browser's startRegistration). `deviceName` is advisory at
 * this stage — the credential does not exist yet; the name is persisted by
 * finishPasskeyRegistration (register-verify body).
 */
export async function startPasskeyRegistration(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  deviceName?: string,
  overrides: PasskeyOverrides = {}
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  void deviceName; // persisted at finish time (see docblock)
  const generate = overrides.generateRegistration ?? generateRegistrationOptions;
  const config = identity.webauthnConfig;
  const existing = identity.passkeysFor(nodeId);
  const slug = identity.aliasSummaryFor(nodeId)?.slug ?? (nodeId as string);

  const options = await generate({
    rpName: config.rpName,
    rpID: config.rpID,
    userName: slug,
    userDisplayName: slug,
    userID: new TextEncoder().encode(nodeId as string),
    attestationType: 'none',
    excludeCredentials: existing.map(passkey => ({
      id: passkey.credentialId,
      transports: toTransports(passkey.transports),
    })),
  });

  identity.storeWebAuthnChallenge(
    options.challenge,
    'registration',
    nodeId,
    unixNow() + CHALLENGE_TTL_SECONDS
  );
  return options;
}

/**
 * Complete registration: verify the attestation response against the stored
 * (single-use, node-scoped) challenge, then persist the credential. Audits
 * `passkey_registered` with the truncated credential id; failures audit
 * `passkey_register_failed` (success 0).
 */
export async function finishPasskeyRegistration(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  response: RegistrationResponseJSON,
  deviceName?: string,
  overrides: PasskeyOverrides = {}
): Promise<void> {
  const verify = overrides.verifyRegistration ?? verifyRegistrationResponse;
  const config = identity.webauthnConfig;

  // The library calls this with the challenge from clientDataJSON; consuming
  // here makes every challenge single-use even when verification fails.
  let challengeConsumed = false;
  const expectedChallenge = (challenge: string): boolean => {
    challengeConsumed = identity.consumeWebAuthnChallenge(challenge, 'registration', nodeId);
    return challengeConsumed;
  };

  let result: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    result = await verify({
      response,
      expectedChallenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      requireUserVerification: false,
    });
  } catch (err) {
    if (!challengeConsumed) throw new PasskeyChallengeError();
    identity.logAuthEvent({ nodeId, action: 'passkey_register_failed', success: false });
    throw err instanceof IdentityError ? err : new PasskeyVerificationError();
  }
  if (!result.verified) {
    identity.logAuthEvent({ nodeId, action: 'passkey_register_failed', success: false });
    throw new PasskeyVerificationError();
  }

  const credential = result.registrationInfo.credential;
  identity.insertPasskey(nodeId, {
    credentialId: credential.id,
    publicKey: base64urlEncode(credential.publicKey),
    counter: credential.counter,
    deviceName: deviceName ?? null,
    transports: credential.transports ? [...credential.transports] : null,
  });
  identity.logAuthEvent({
    nodeId,
    action: 'passkey_registered',
    details: {
      credentialId: credential.id.slice(0, CREDENTIAL_ID_PREVIEW),
      deviceName: deviceName ?? null,
    },
  });
}

// ── Authentication (passwordless login) ──────────────────────────────────

/**
 * Begin passkey authentication for an alias slug. Scoped to the slug's
 * registered credentials; an UNKNOWN slug returns options with an empty
 * allowCredentials and a stored challenge anyway — the response shape is
 * identical either way (no user enumeration).
 */
export async function startPasskeyAuthentication(
  identity: IdentitySystem,
  slug: string,
  overrides: PasskeyOverrides = {}
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const generate = overrides.generateAuthentication ?? generateAuthenticationOptions;
  const config = identity.webauthnConfig;
  const nodeId = identity.nodeIdForSlug(slug);
  const passkeys = nodeId ? identity.passkeysFor(nodeId) : [];

  const options = await generate({
    rpID: config.rpID,
    allowCredentials: passkeys.map(passkey => ({
      id: passkey.credentialId,
      transports: toTransports(passkey.transports),
    })),
    userVerification: 'preferred',
  });

  // NULL node_id — the node is unknown until the assertion arrives; the
  // challenge is consumed by VALUE at finish time.
  identity.storeWebAuthnChallenge(
    options.challenge,
    'authentication',
    null,
    unixNow() + CHALLENGE_TTL_SECONDS
  );
  return options;
}

/**
 * Complete authentication: verify the assertion against the stored challenge
 * and credential, advance the sign counter, and mint a session via
 * `IdentitySystem.createSession` (same hash-only storage invariant as
 * login()). Audits `login_success` with details.via='passkey'. A counter
 * regression audits `passkey_counter_regression` (success 0) and blocks;
 * other failures audit `passkey_auth_failed` (success 0).
 */
export async function finishPasskeyAuthentication(
  identity: IdentitySystem,
  slug: string,
  response: AuthenticationResponseJSON,
  ctx: { ip?: string; userAgent?: string } = {},
  overrides: PasskeyOverrides = {}
): Promise<LoginResult> {
  const verify = overrides.verifyAuthentication ?? verifyAuthenticationResponse;
  const config = identity.webauthnConfig;

  const passkey = identity.passkeyByCredentialId(response.id);
  if (!passkey) throw new PasskeyVerificationError('Unknown passkey credential');
  const nodeId = passkey.nodeId;

  let challengeConsumed = false;
  const expectedChallenge = (challenge: string): boolean => {
    challengeConsumed = identity.consumeWebAuthnChallenge(challenge, 'authentication', null);
    return challengeConsumed;
  };

  let result: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    result = await verify({
      response,
      expectedChallenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      requireUserVerification: false,
      credential: {
        id: passkey.credentialId,
        publicKey: base64urlDecode(passkey.publicKey),
        counter: passkey.counter,
        transports: toTransports(passkey.transports),
      },
    });
  } catch (err) {
    if (!challengeConsumed) throw new PasskeyChallengeError();
    identity.logAuthEvent({
      nodeId,
      action: 'passkey_auth_failed',
      details: { slug },
      ip: ctx.ip,
      success: false,
    });
    throw err instanceof IdentityError ? err : new PasskeyVerificationError();
  }
  if (!result.verified) {
    identity.logAuthEvent({
      nodeId,
      action: 'passkey_auth_failed',
      details: { slug },
      ip: ctx.ip,
      success: false,
    });
    throw new PasskeyVerificationError();
  }

  const newCounter = result.authenticationInfo.newCounter;
  if (newCounter < passkey.counter) {
    identity.logAuthEvent({
      nodeId,
      action: 'passkey_counter_regression',
      details: {
        slug,
        credentialId: passkey.credentialId.slice(0, CREDENTIAL_ID_PREVIEW),
        storedCounter: passkey.counter,
        newCounter,
      },
      ip: ctx.ip,
      success: false,
    });
    throw new PasskeyCounterRegressionError();
  }

  identity.updatePasskeyCounter(passkey.credentialId, newCounter);
  identity.logAuthEvent({
    nodeId,
    action: 'login_success',
    details: { slug, via: 'passkey' },
    ip: ctx.ip,
  });
  return identity.createSession(nodeId, { ip: ctx.ip, userAgent: ctx.userAgent });
}

// ── Management (self-service) ────────────────────────────────────────────

/** Self-service passkey view — credential id truncated, public key NEVER included. */
export interface PasskeySummary {
  credentialId: string; // brand-ok — truncated opaque WebAuthn credential ID (first 12 chars: enough to identify, not to replay)
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: number | null; // unix seconds
}

/** The node's passkeys (credential id truncated to 12 chars, like listDevices). */
export function listPasskeys(identity: IdentitySystem, nodeId: TreeNodeId): PasskeySummary[] {
  return identity.passkeysFor(nodeId).map(passkey => ({
    credentialId: passkey.credentialId.slice(0, CREDENTIAL_ID_PREVIEW),
    deviceName: passkey.deviceName,
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt,
  }));
}

/**
 * Revoke a passkey, scoped to the caller's OWN node. Accepts the full
 * credential id OR a unique prefix of ≥12 chars (the truncated form
 * listPasskeys returns), so the HTTP surface never needs the full id.
 * Audits `passkey_revoked`.
 */
export function revokePasskey(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  credentialId: string // brand-ok — opaque WebAuthn credential ID or its unique ≥12-char prefix
): void {
  const matches = identity
    .passkeysFor(nodeId)
    .filter(
      passkey =>
        passkey.credentialId === credentialId || passkey.credentialId.startsWith(credentialId)
    );
  if (credentialId.length < CREDENTIAL_ID_PREVIEW || matches.length !== 1) {
    throw new IdentityError('Unknown or ambiguous passkey credential');
  }
  const target: StoredPasskey = matches[0]!;
  identity.deletePasskey(nodeId, target.credentialId);
  identity.logAuthEvent({
    nodeId,
    action: 'passkey_revoked',
    details: { credentialId: target.credentialId.slice(0, CREDENTIAL_ID_PREVIEW) },
  });
}
