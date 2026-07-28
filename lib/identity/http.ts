/**
 * HTTP wire boundary for the identity subsystem (Phase 0).
 *
 * This is the ONLY place `unknown` enters: request bodies are parsed and
 * type-guarded here, then branded/typed values flow inward. Returns `null`
 * for non-`/auth/` paths so hosts can chain handlers.
 *
 * Routes:
 *   POST /auth/login    { slug, password, otp? } → { token, sessionId, expiresAt }
 *                       (otp = TOTP/recovery code; MFA-enabled + no otp → 401 { error: 'totp_required' })
 *   POST /auth/logout   Authorization: Bearer <token>
 *   GET  /auth/session  Authorization: Bearer <token> → { sessionId, nodeId, role }
 *   GET  /auth/export   Authorization: Bearer <token> → JSON attachment (own data;
 *                       ?node=<TreeNodeId> for another node requires admin|superadmin)
 *   POST /auth/impersonate     Bearer (superadmin) + { nodeId } → { token, expiresAt }
 *   POST /auth/impersonate/end Bearer (the impersonated token) → { ok: true }
 *
 * Self-service (Phase 4, all Bearer-required, scoped to the caller's OWN node):
 *   POST /auth/me/password               { currentPassword, newPassword } → { ok, revoked }
 *   GET  /auth/me/sessions               → { sessions: [...] }
 *   POST /auth/me/sessions/revoke-others → { revoked: n }
 *   GET  /auth/me/devices                → { devices: [...] } (hash truncated to 12)
 *   POST /auth/me/devices/untrust        { fingerprintHash } → { ok: true }
 *   GET  /auth/me/ip-allowlist           → { entries: [...] }
 *   PUT  /auth/me/ip-allowlist           { cidrs: string[] } → { ok, count }
 *   POST /auth/me/totp/enroll            → { secret, uri, recoveryCodes } (409 if enabled)
 *   POST /auth/me/totp/confirm           { code } → { ok: true }
 *   POST /auth/me/totp/disable           { code } → { ok: true } (code = TOTP or recovery)
 *   GET  /auth/me/passkeys               → { passkeys: [...] } (credential id truncated to 12)
 *   POST /auth/me/passkeys/revoke        { credentialId } → { ok: true }
 *
 * WebAuthn/passkeys (webauthn.ts):
 *   POST /auth/passkey/register-options  Bearer self + { deviceName? } → PublicKeyCredentialCreationOptionsJSON
 *   POST /auth/passkey/register-verify   Bearer self + { response, deviceName? } → { ok: true }
 *   POST /auth/passkey/auth-options      (public) { slug } → PublicKeyCredentialRequestOptionsJSON
 *                                        (unknown slug → empty allowCredentials, no enumeration)
 *   POST /auth/passkey/auth-verify       (public) { slug, response } → { token, expiresAt }
 * Passkey failures map to 400 with machine-readable codes:
 * 'passkey_challenge_invalid' | 'passkey_verification_failed' | 'passkey_counter_regression'.
 *
 * Responses to session-resolving routes (session, export, impersonate/end)
 * carry `X-Impersonator: <nodeId>` when the resolved session is impersonated.
 */

import { asTokenId, tryTreeNodeId } from '../types/branded.ts';
import { exportData } from './export.ts';
import {
  AccountLockedError,
  AnomalyBlockedError,
  GeoBlockedError,
  IdentityError,
  InvalidCredentialsError,
  IpNotAllowedError,
  TotpRequiredError,
  WeakPasswordError,
  type IdentitySystem,
  type SessionInfo,
} from './identity.ts';
import { endImpersonation, impersonate } from './impersonate.ts';
import { confirmTotp, disableTotp, enrollTotp } from './mfa.ts';
import {
  changePassword,
  getIpAllowlist,
  listDevices,
  listSessions,
  revokeOtherSessions,
  setIpAllowlist,
  untrustDevice,
} from './self-service.ts';
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
} from './webauthn.ts';

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

function isChangePasswordBody(value: unknown): value is ChangePasswordBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.currentPassword === 'string' && typeof body.newPassword === 'string';
}

interface UntrustDeviceBody {
  fingerprintHash: string;
}

function isUntrustDeviceBody(value: unknown): value is UntrustDeviceBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.fingerprintHash === 'string';
}

interface IpAllowlistBody {
  cidrs: string[];
}

function isIpAllowlistBody(value: unknown): value is IpAllowlistBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return Array.isArray(body.cidrs) && body.cidrs.every(c => typeof c === 'string');
}

interface LoginBody {
  slug: string;
  password: string;
  otp?: string; // TOTP code or recovery code, when the node has MFA enabled
}

function isLoginBody(value: unknown): value is LoginBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.slug === 'string' &&
    typeof body.password === 'string' &&
    (body.otp === undefined || typeof body.otp === 'string')
  );
}

interface TotpCodeBody {
  code: string;
}

function isTotpCodeBody(value: unknown): value is TotpCodeBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.code === 'string';
}

interface ImpersonateBody {
  nodeId: string; // brand-ok — raw wire body, branded via tryTreeNodeId at this boundary
}

function isImpersonateBody(value: unknown): value is ImpersonateBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.nodeId === 'string';
}

// ── WebAuthn/passkey wire bodies ──

interface PasskeyRegisterOptionsBody {
  deviceName?: string;
}

function isPasskeyRegisterOptionsBody(value: unknown): value is PasskeyRegisterOptionsBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return body.deviceName === undefined || typeof body.deviceName === 'string';
}

interface PasskeyRegisterVerifyBody {
  response: RegistrationResponseJSON;
  deviceName?: string;
}

function isPasskeyRegisterVerifyBody(value: unknown): value is PasskeyRegisterVerifyBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  if (typeof body.response !== 'object' || body.response === null) return false;
  const response = body.response as Record<string, unknown>;
  if (typeof response.id !== 'string') return false;
  return body.deviceName === undefined || typeof body.deviceName === 'string';
}

interface PasskeyAuthOptionsBody {
  slug: string;
}

function isPasskeyAuthOptionsBody(value: unknown): value is PasskeyAuthOptionsBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.slug === 'string';
}

interface PasskeyAuthVerifyBody {
  slug: string;
  response: AuthenticationResponseJSON;
}

function isPasskeyAuthVerifyBody(value: unknown): value is PasskeyAuthVerifyBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  if (typeof body.slug !== 'string') return false;
  if (typeof body.response !== 'object' || body.response === null) return false;
  return typeof (body.response as Record<string, unknown>).id === 'string';
}

interface PasskeyRevokeBody {
  credentialId: string; // brand-ok — opaque WebAuthn credential id (or its ≥12-char prefix) straight from the wire
}

function isPasskeyRevokeBody(value: unknown): value is PasskeyRevokeBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.credentialId === 'string';
}

/** Passkey error → machine-readable 400; null when the error isn't a passkey/identity error. */
// Intentional boundary: catch-all error mapper at the wire edge.
// eslint-disable-next-line harness/no-unknown-function-param
function passkeyErrorResponse(err: unknown): Response | null {
  if (err instanceof PasskeyChallengeError) return jsonError(400, 'passkey_challenge_invalid');
  if (err instanceof PasskeyCounterRegressionError)
    return jsonError(400, 'passkey_counter_regression');
  if (err instanceof PasskeyVerificationError) return jsonError(400, 'passkey_verification_failed');
  if (err instanceof IdentityError) return jsonError(400, err.message);
  return null;
}

async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function clientIp(req: Request): string | undefined {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined
  );
}

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** Stamps `X-Impersonator` when the resolved session is impersonated. */
function withImpersonatorHeader(res: Response, session: SessionInfo): Response {
  if (session.impersonatorId) {
    res.headers.set('X-Impersonator', session.impersonatorId as string);
  }
  return res;
}

export function createIdentityHandler(
  identity: IdentitySystem
): (req: Request) => Promise<Response | null> {
  return async (req: Request): Promise<Response | null> => {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/auth/')) return null;

    if (url.pathname === '/auth/login' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!isLoginBody(body)) return jsonError(400, 'Invalid request body');

      try {
        const result = await identity.login(body.slug, body.password, {
          ip: clientIp(req),
          userAgent: req.headers.get('user-agent') ?? undefined,
          otp: body.otp,
        });
        return Response.json({
          token: result.token as string,
          sessionId: result.sessionId as string,
          expiresAt: result.expiresAt,
        });
      } catch (err) {
        if (err instanceof AccountLockedError) return jsonError(423, 'Account is locked');
        if (err instanceof GeoBlockedError)
          return jsonError(403, `Login not permitted from ${err.country}`);
        if (err instanceof IpNotAllowedError) return jsonError(403, err.message);
        if (err instanceof AnomalyBlockedError) return jsonError(403, err.reason);
        // Distinct machine-readable code, SAME 401 as bad credentials — a
        // client cannot tell "MFA-enabled account" from anything else.
        if (err instanceof TotpRequiredError) return jsonError(401, 'totp_required');
        if (err instanceof InvalidCredentialsError) return jsonError(401, 'Invalid credentials');
        if (err instanceof WeakPasswordError) {
          return Response.json({ error: err.message, feedback: err.feedback }, { status: 400 });
        }
        if (err instanceof IdentityError) return jsonError(400, err.message);
        throw err;
      }
    }

    if (url.pathname === '/auth/logout' && req.method === 'POST') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      identity.logout(asTokenId(token));
      return Response.json({ ok: true });
    }

    if (url.pathname === '/auth/session' && req.method === 'GET') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      const session = identity.resolveSession(asTokenId(token));
      if (!session) return jsonError(401, 'Invalid or expired session');
      return withImpersonatorHeader(
        Response.json({
          sessionId: session.sessionId as string,
          nodeId: session.nodeId as string,
          role: session.role,
        }),
        session
      );
    }

    if (url.pathname === '/auth/export' && req.method === 'GET') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      const session = identity.resolveSession(asTokenId(token));
      if (!session) return jsonError(401, 'Invalid or expired session');

      let targetNode = session.nodeId;
      const nodeParam = url.searchParams.get('node');
      if (nodeParam !== null && nodeParam !== (session.nodeId as string)) {
        if (!identity.requireRole(session.nodeId, 'admin')) {
          return jsonError(403, 'Admin role required to export another node');
        }
        const parsed = tryTreeNodeId(nodeParam);
        if (!parsed) return jsonError(400, 'Invalid node id');
        targetNode = parsed;
      }

      const data = exportData(identity, targetNode);
      return withImpersonatorHeader(
        new Response(JSON.stringify(data, null, 2), {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'content-disposition': `attachment; filename="export-${targetNode as string}.json"`,
          },
        }),
        session
      );
    }

    if (url.pathname === '/auth/impersonate' && req.method === 'POST') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      const session = identity.resolveSession(asTokenId(token));
      if (!session) return jsonError(401, 'Invalid or expired session');
      if (!identity.requireRole(session.nodeId, 'superadmin')) {
        return jsonError(403, 'Superadmin role required to impersonate');
      }

      const body = await parseJsonBody(req);
      if (!isImpersonateBody(body)) return jsonError(400, 'Invalid request body');
      const targetNodeId = tryTreeNodeId(body.nodeId);
      if (!targetNodeId) return jsonError(400, 'Invalid node id');

      try {
        const result = await impersonate(identity, session.nodeId, targetNodeId);
        return Response.json({
          token: result.token as string,
          expiresAt: result.expiresAt,
        });
      } catch (err) {
        if (err instanceof IdentityError) {
          if (err.message === 'Target node not found') return jsonError(404, err.message);
          if (err.message.includes('superadmin')) return jsonError(403, err.message);
          return jsonError(400, err.message);
        }
        throw err;
      }
    }

    if (url.pathname === '/auth/impersonate/end' && req.method === 'POST') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      const session = identity.resolveSession(asTokenId(token));
      if (!session) return jsonError(401, 'Invalid or expired session');
      endImpersonation(identity, asTokenId(token));
      return withImpersonatorHeader(Response.json({ ok: true }), session);
    }

    // ── WebAuthn/passkeys (/auth/passkey/*) — webauthn.ts ──

    if (url.pathname === '/auth/passkey/auth-options' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!isPasskeyAuthOptionsBody(body)) return jsonError(400, 'Invalid request body');
      const options = await startPasskeyAuthentication(identity, body.slug);
      return Response.json(options);
    }

    if (url.pathname === '/auth/passkey/auth-verify' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!isPasskeyAuthVerifyBody(body)) return jsonError(400, 'Invalid request body');
      try {
        const result = await finishPasskeyAuthentication(identity, body.slug, body.response, {
          ip: clientIp(req),
          userAgent: req.headers.get('user-agent') ?? undefined,
        });
        return Response.json({ token: result.token as string, expiresAt: result.expiresAt });
      } catch (err) {
        const mapped = passkeyErrorResponse(err);
        if (mapped) return mapped;
        throw err;
      }
    }

    if (url.pathname === '/auth/passkey/register-options' && req.method === 'POST') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      const session = identity.resolveSession(asTokenId(token));
      if (!session) return jsonError(401, 'Invalid or expired session');
      if (session.impersonatorId !== null) {
        return jsonError(403, 'Self-service is unavailable while impersonating');
      }
      const body = await parseJsonBody(req);
      if (!isPasskeyRegisterOptionsBody(body)) return jsonError(400, 'Invalid request body');
      const options = await startPasskeyRegistration(identity, session.nodeId, body.deviceName);
      return Response.json(options);
    }

    if (url.pathname === '/auth/passkey/register-verify' && req.method === 'POST') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      const session = identity.resolveSession(asTokenId(token));
      if (!session) return jsonError(401, 'Invalid or expired session');
      if (session.impersonatorId !== null) {
        return jsonError(403, 'Self-service is unavailable while impersonating');
      }
      const body = await parseJsonBody(req);
      if (!isPasskeyRegisterVerifyBody(body)) return jsonError(400, 'Invalid request body');
      try {
        await finishPasskeyRegistration(identity, session.nodeId, body.response, body.deviceName);
        return Response.json({ ok: true });
      } catch (err) {
        const mapped = passkeyErrorResponse(err);
        if (mapped) return mapped;
        throw err;
      }
    }

    // ── Self-service (/auth/me/*) — Bearer-required, caller's OWN node only ──

    if (url.pathname.startsWith('/auth/me/')) {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      const tokenId = asTokenId(token);
      const session = identity.resolveSession(tokenId);
      if (!session) return jsonError(401, 'Invalid or expired session');
      if (session.impersonatorId !== null) {
        return jsonError(403, 'Self-service is unavailable while impersonating');
      }
      const nodeId = session.nodeId;

      if (url.pathname === '/auth/me/password' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (!isChangePasswordBody(body)) return jsonError(400, 'Invalid request body');
        try {
          const revoked = await changePassword(
            identity,
            nodeId,
            body.currentPassword,
            body.newPassword,
            tokenId
          );
          return Response.json({ ok: true, revoked });
        } catch (err) {
          if (err instanceof InvalidCredentialsError) return jsonError(401, 'Invalid credentials');
          if (err instanceof WeakPasswordError) {
            return Response.json({ error: err.message, feedback: err.feedback }, { status: 400 });
          }
          if (err instanceof IdentityError) return jsonError(400, err.message);
          throw err;
        }
      }

      if (url.pathname === '/auth/me/sessions' && req.method === 'GET') {
        return Response.json({ sessions: listSessions(identity, nodeId) });
      }

      if (url.pathname === '/auth/me/sessions/revoke-others' && req.method === 'POST') {
        return Response.json({ revoked: revokeOtherSessions(identity, nodeId, tokenId) });
      }

      if (url.pathname === '/auth/me/devices' && req.method === 'GET') {
        return Response.json({ devices: listDevices(identity, nodeId) });
      }

      if (url.pathname === '/auth/me/devices/untrust' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (!isUntrustDeviceBody(body)) return jsonError(400, 'Invalid request body');
        try {
          untrustDevice(identity, nodeId, body.fingerprintHash);
          return Response.json({ ok: true });
        } catch (err) {
          if (err instanceof IdentityError) return jsonError(400, err.message);
          throw err;
        }
      }

      if (url.pathname === '/auth/me/ip-allowlist' && req.method === 'GET') {
        return Response.json({ entries: getIpAllowlist(identity, nodeId) });
      }

      if (url.pathname === '/auth/me/ip-allowlist' && req.method === 'PUT') {
        const body = await parseJsonBody(req);
        if (!isIpAllowlistBody(body)) return jsonError(400, 'Invalid request body');
        try {
          setIpAllowlist(identity, nodeId, body.cidrs);
          return Response.json({ ok: true, count: body.cidrs.length });
        } catch (err) {
          if (err instanceof IdentityError) return jsonError(400, err.message);
          throw err;
        }
      }

      // ── TOTP MFA (/auth/me/totp/*) — enroll/confirm/disable, own node only ──

      if (url.pathname === '/auth/me/totp/enroll' && req.method === 'POST') {
        try {
          const enrollment = await enrollTotp(identity, nodeId);
          // Plaintext secret + recovery codes are returned ONCE — the DB
          // holds the secret + code hashes only.
          return Response.json(enrollment);
        } catch (err) {
          if (err instanceof IdentityError) {
            if (err.message === 'TOTP is already enabled') return jsonError(409, err.message);
            return jsonError(400, err.message);
          }
          throw err;
        }
      }

      if (url.pathname === '/auth/me/totp/confirm' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (!isTotpCodeBody(body)) return jsonError(400, 'Invalid request body');
        try {
          await confirmTotp(identity, nodeId, body.code);
          return Response.json({ ok: true });
        } catch (err) {
          if (err instanceof IdentityError) return jsonError(400, err.message);
          throw err;
        }
      }

      if (url.pathname === '/auth/me/totp/disable' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (!isTotpCodeBody(body)) return jsonError(400, 'Invalid request body');
        try {
          await disableTotp(identity, nodeId, body.code);
          return Response.json({ ok: true });
        } catch (err) {
          if (err instanceof IdentityError) return jsonError(400, err.message);
          throw err;
        }
      }

      // ── Passkey management (/auth/me/passkeys*) — list/revoke, own node only ──

      if (url.pathname === '/auth/me/passkeys' && req.method === 'GET') {
        return Response.json({ passkeys: listPasskeys(identity, nodeId) });
      }

      if (url.pathname === '/auth/me/passkeys/revoke' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (!isPasskeyRevokeBody(body)) return jsonError(400, 'Invalid request body');
        try {
          revokePasskey(identity, nodeId, body.credentialId);
          return Response.json({ ok: true });
        } catch (err) {
          if (err instanceof IdentityError) return jsonError(400, err.message);
          throw err;
        }
      }
    }

    return jsonError(404, 'Not found');
  };
}
