/**
 * OIDC callback handler — placeholder for Phase 2.
 *
 * Flow (not yet implemented):
 *   1. GET /api/auth/callback?code=...&state=...
 *   2. Exchange code for tokens at OIDC provider
 *   3. Set HttpOnly Secure SameSite=Lax session cookie
 *   4. Redirect to /portal/ only (fixed relative target — no open redirect)
 *
 * @see https://developers.cloudflare.com/pages/functions/ — Pages Functions
 */

export type AuthCallbackEnv = Record<string, string | undefined>;

export type AuthCallbackContext = {
  request: Request;
  env: AuthCallbackEnv;
};

const PORTAL_REDIRECT = '/portal/';

export async function onRequest(context: AuthCallbackContext): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  // TODO(phase-2): exchange `code` at OIDC token endpoint using env secrets.
  // Do not accept a user-controlled redirect target — always PORTAL_REDIRECT.
  return Response.redirect(new URL(PORTAL_REDIRECT, url.origin).toString(), 302);
}
