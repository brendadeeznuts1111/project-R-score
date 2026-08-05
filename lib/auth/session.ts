/**
 * Compact HMAC-SHA256 portal sessions.
 *
 * Web Crypto and Web platform encoding APIs keep this module usable from both
 * Bun handlers and Cloudflare Workers/Pages Functions.
 */

import { base64UrlToBytes, bytesToBase64Url } from '../bytes-base64.ts';
import { BRAND_GUARDS, type PortalAccountId, type PortalTenantId } from '../types/branded.ts';

export const SESSION_COOKIE_NAME = 'fw_session';
export const DEFAULT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_HEADER = Object.freeze({ alg: 'HS256', typ: 'JWT' });

export interface SessionClaims {
  sub: string;
  email: string;
  accountId?: PortalAccountId;
  tenantId?: PortalTenantId;
  iat: number;
  exp: number;
}

export interface SignSessionInput {
  sub: string;
  email: string;
  /** Branded at the session boundary before it enters the signed payload. */
  accountId?: unknown;
  /** Branded at the session boundary before it enters the signed payload. */
  tenantId?: unknown;
  ttlSeconds?: number;
}

function encodeBase64Url(bytes: Uint8Array): string {
  return bytesToBase64Url(bytes);
}

function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  try {
    return base64UrlToBytes(value);
  } catch {
    return null;
  }
}

function encodeJson(value: object): string {
  return encodeBase64Url(encoder.encode(JSON.stringify(value)));
}

function decodeJson(value: string): unknown {
  const bytes = decodeBase64Url(value);
  if (!bytes) return undefined;
  try {
    return JSON.parse(decoder.decode(bytes)) as unknown;
  } catch {
    return undefined;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (!secret.trim()) throw new TypeError('Session secret must not be blank');
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOptionalAccountId(value: unknown): PortalAccountId | undefined {
  if (value == null) return undefined;
  if (!BRAND_GUARDS.isPortalAccountId(value)) throw new TypeError('Invalid portal account ID');
  return value;
}

function parseOptionalTenantId(value: unknown): PortalTenantId | undefined {
  if (value == null) return undefined;
  if (!BRAND_GUARDS.isPortalTenantId(value)) throw new TypeError('Invalid portal tenant ID');
  return value;
}

function normalizeClaims(value: unknown): SessionClaims | null {
  if (!isRecord(value)) return null;
  if (typeof value.sub !== 'string' || value.sub.trim() === '') return null;
  if (typeof value.email !== 'string' || value.email.trim() === '') return null;
  if (!Number.isInteger(value.iat) || !Number.isInteger(value.exp)) return null;
  if ((value.exp as number) <= (value.iat as number)) return null;

  try {
    const accountId = parseOptionalAccountId(value.accountId);
    const tenantId = parseOptionalTenantId(value.tenantId);
    return {
      sub: value.sub,
      email: value.email,
      ...(accountId ? { accountId } : {}),
      ...(tenantId ? { tenantId } : {}),
      iat: value.iat as number,
      exp: value.exp as number,
    };
  } catch {
    return null;
  }
}

export async function signSession(input: SignSessionInput, secret: string): Promise<string> {
  const sub = input.sub.trim();
  const email = input.email.trim();
  if (!sub || !email) throw new TypeError('Session subject and email are required');

  const ttlSeconds = input.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new RangeError('Session ttlSeconds must be a positive integer');
  }

  const now = Math.floor(Date.now() / 1000);
  const accountId = parseOptionalAccountId(input.accountId);
  const tenantId = parseOptionalTenantId(input.tenantId);
  const payload: SessionClaims = {
    sub,
    email,
    ...(accountId ? { accountId } : {}),
    ...(tenantId ? { tenantId } : {}),
    iat: now,
    exp: now + ttlSeconds,
  };
  const unsigned = `${encodeJson(SESSION_HEADER)}.${encodeJson(payload)}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(unsigned))
  );
  return `${unsigned}.${encodeBase64Url(signature)}`;
}

export async function verifySession(token: string, secret: string): Promise<SessionClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const header = decodeJson(encodedHeader);
  if (!isRecord(header) || header.alg !== 'HS256' || header.typ !== 'JWT') return null;
  const signature = decodeBase64Url(encodedSignature);
  if (!signature) return null;

  try {
    const verified = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      copyArrayBuffer(signature),
      encoder.encode(`${encodedHeader}.${encodedPayload}`)
    );
    if (!verified) return null;
  } catch {
    return null;
  }

  const claims = normalizeClaims(decodeJson(encodedPayload));
  if (!claims) return null;
  const now = Math.floor(Date.now() / 1000);
  return claims.exp > now ? claims : null;
}

export function sessionCookieHeader(token: string, secure = true): string {
  const secureAttribute = secure ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DEFAULT_SESSION_TTL_SECONDS}${secureAttribute}`;
}

function cookieValue(request: Request, name: string): string | undefined {
  const rawCookie = request.headers.get('Cookie');
  if (!rawCookie) return undefined;
  for (const field of rawCookie.split(';')) {
    const separator = field.indexOf('=');
    if (separator < 0) continue;
    if (field.slice(0, separator).trim() !== name) continue;
    const encoded = field.slice(separator + 1).trim();
    try {
      return decodeURIComponent(encoded);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function sessionFromRequest(
  request: Request,
  secret: string
): Promise<SessionClaims | null> {
  const token = cookieValue(request, SESSION_COOKIE_NAME);
  return token ? verifySession(token, secret) : null;
}
