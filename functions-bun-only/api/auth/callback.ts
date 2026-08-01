/**
 * OIDC callback — exchange code, mint session cookie, redirect to portal.
 *
 * Dev stub (`dev:sub:email`) only when ALLOW_DEV_AUTH=1 (never on production deploys).
 */

import { devClaimsFromCode, exchangeAuthorizationCode } from '../../../lib/auth/oidc.ts';
import { signSession, sessionCookieHeader } from '../../../lib/auth/session.ts';
import { AccountR2Store } from '../../../lib/accounts/account-r2-store.ts';
import { tryOidcClientId } from '../../../lib/types/branded.ts';
import {
  jsonResponse,
  requireBucket,
  requireSessionSecret,
  type PagesContext,
} from '../_shared/pages-env.ts';

const PORTAL_REDIRECT = '/portal/';

function allowDevAuth(env: PagesContext['env']): boolean {
  return env.ALLOW_DEV_AUTH === '1';
}

function oidcConfigured(env: PagesContext['env']): boolean {
  return Boolean(env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET && env.OIDC_TOKEN_URL);
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return jsonResponse({ error: 'Missing authorization code' }, 400);
  }

  let secret: string;
  let bucket: NonNullable<typeof env.REGISTRY_BUCKET>;
  try {
    secret = requireSessionSecret(env);
    bucket = requireBucket(env);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  let sub: string;
  let email: string;

  if (oidcConfigured(env)) {
    const clientId = tryOidcClientId(env.OIDC_CLIENT_ID);
    if (!clientId) return jsonResponse({ error: 'OIDC not configured' }, 503);
    const redirectUri = env.OIDC_REDIRECT_URI ?? `${url.origin}/api/auth/callback`;
    const claims = await exchangeAuthorizationCode({
      code,
      clientId,
      clientSecret: env.OIDC_CLIENT_SECRET!,
      tokenUrl: env.OIDC_TOKEN_URL!,
      redirectUri,
    });
    if (!claims) return jsonResponse({ error: 'Token exchange failed' }, 401);
    sub = claims.sub;
    email = claims.email ?? `${claims.sub}@unknown.local`;
  } else if (allowDevAuth(env)) {
    const claims = devClaimsFromCode(code);
    if (!claims) return jsonResponse({ error: 'Invalid dev authorization code' }, 400);
    sub = claims.sub;
    email = claims.email ?? `${claims.sub}@dev.local`;
  } else {
    return jsonResponse({ error: 'OIDC not configured' }, 503);
  }

  const accounts = new AccountR2Store(bucket);
  const existing = await accounts.getByOidc(sub);
  const token = await signSession(
    {
      sub,
      email,
      accountId: existing?.id as string | undefined,
      tenantId: existing?.tenantId as string | undefined,
    },
    secret
  );

  const target = new URL(PORTAL_REDIRECT, url.origin);
  if (!existing) target.searchParams.set('onboard', '1');

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      'Set-Cookie': sessionCookieHeader(token, url.protocol === 'https:'),
      'Cache-Control': 'no-store',
    },
  });
}
