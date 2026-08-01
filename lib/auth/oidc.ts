/**
 * OIDC authorization-code exchange helpers.
 *
 * This module deliberately uses fetch, URLSearchParams, and JSON only so it is
 * safe in Cloudflare Pages Functions as well as Bun.
 */

import type { OidcClientId } from '../types/branded.ts';

export interface OidcClaims {
  sub: string;
  email?: string;
}

export interface ExchangeAuthorizationCodeOptions {
  code: string;
  clientId: OidcClientId;
  clientSecret: string;
  tokenUrl: string;
  redirectUri: string;
}

interface TokenResponse {
  id_token?: unknown;
  access_token?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeBase64UrlJson(value: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return undefined;
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return undefined;
  }
}

function validTokenTime(payload: Record<string, unknown>): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp <= now) return false;
  if (typeof payload.nbf === 'number' && payload.nbf > now) return false;
  return true;
}

// eslint-disable-next-line harness/no-unknown-function-param -- decoded OIDC wire claim
function validAudience(audience: unknown, clientId: OidcClientId): boolean {
  if (audience === undefined) return true;
  const audiences =
    typeof audience === 'string'
      ? [audience]
      : Array.isArray(audience)
        ? audience.filter((value): value is string => typeof value === 'string')
        : [];
  return audiences.includes(clientId);
}

// eslint-disable-next-line harness/no-unknown-function-param -- token endpoint JSON wire value
function claimsFromJwt(token: unknown, clientId: OidcClientId): OidcClaims | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  const payload = decodeBase64UrlJson(parts[1]);
  if (!isRecord(payload) || typeof payload.sub !== 'string' || payload.sub.trim() === '') {
    return null;
  }
  if (!validTokenTime(payload) || !validAudience(payload.aud, clientId)) return null;

  return {
    sub: payload.sub.trim(),
    ...(typeof payload.email === 'string' && payload.email.trim()
      ? { email: payload.email.trim() }
      : {}),
  };
}

/**
 * Exchange an authorization code at the configured token endpoint.
 *
 * The ID-token payload is consumed only from the authenticated HTTPS token
 * exchange response. Deployments needing independent bearer-token validation
 * must verify issuer JWKS before accepting a token from any other source.
 */
export async function exchangeAuthorizationCode(
  options: ExchangeAuthorizationCodeOptions
): Promise<OidcClaims | null> {
  if (
    !options.code.trim() ||
    !options.clientId.trim() ||
    !options.clientSecret.trim() ||
    !options.redirectUri.trim()
  ) {
    return null;
  }

  let tokenUrl: URL;
  try {
    tokenUrl = new URL(options.tokenUrl);
  } catch {
    return null;
  }
  if (tokenUrl.protocol !== 'https:' && tokenUrl.hostname !== 'localhost') return null;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: options.code,
    client_id: options.clientId,
    client_secret: options.clientSecret,
    redirect_uri: options.redirectUri,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!response.ok) return null;
    const tokenResponse = (await response.json()) as TokenResponse;
    return (
      claimsFromJwt(tokenResponse.id_token, options.clientId) ??
      claimsFromJwt(tokenResponse.access_token, options.clientId)
    );
  } catch {
    return null;
  }
}

/** Parse the explicit test-only `dev:<sub>:<email>` authorization code. */
export function devClaimsFromCode(code: string): OidcClaims | null {
  if (!code.startsWith('dev:')) return null;
  const separator = code.indexOf(':', 4);
  if (separator < 0) return null;

  let sub: string;
  let email: string;
  try {
    sub = decodeURIComponent(code.slice(4, separator)).trim();
    email = decodeURIComponent(code.slice(separator + 1)).trim();
  } catch {
    return null;
  }
  if (!sub || !email?.includes('@')) return null;
  return { sub, email };
}
