/**
 * Pages middleware — apply the shared security-header contract to static assets
 * and Pages Functions without replacing route-specific cache or CORS headers.
 *
 * Note: URL rewriting does NOT belong here — Pages computes function routing
 * independently of `next(input)`, so middleware rewrites cannot re-route
 * npm-encoded paths (proven on production, #199/#202). Scoped npm traffic is
 * served by the `/api/npm/*` catch-all instead.
 *
 * @see https://developers.cloudflare.com/pages/functions/middleware/
 */
import { withCloudflareSecurityHeaders } from '../lib/http/cloudflare-security-headers.ts';
import {
  DATA_FORMAT_CANONICAL_HOST,
  DATA_FORMAT_PROTECTED_HOSTS,
} from '../lib/data-format-access.ts';

const DATA_FORMAT_PATHS = ['/portal/labs/data-formats', '/portal/registry/data-format-lab.json'];

export function dataFormatCanonicalRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (
    !DATA_FORMAT_PATHS.some(path => url.pathname === path || url.pathname.startsWith(`${path}/`))
  ) {
    return null;
  }
  if (
    DATA_FORMAT_PROTECTED_HOSTS.includes(
      url.hostname as (typeof DATA_FORMAT_PROTECTED_HOSTS)[number]
    ) ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1'
  ) {
    return null;
  }
  url.protocol = 'https:';
  url.hostname = DATA_FORMAT_CANONICAL_HOST;
  url.port = '';
  return Response.redirect(url, 307);
}

export async function onRequest(context: {
  request: Request;
  next: (input?: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}): Promise<Response> {
  const redirect = dataFormatCanonicalRedirect(context.request);
  const response = withCloudflareSecurityHeaders(redirect ?? (await context.next()));
  const url = new URL(context.request.url);
  if (!redirect && (url.pathname === '/' || url.pathname === '/index.html')) {
    response.headers.append('Link', '</.well-known/experiments>; rel="help"');
  }
  return response;
}
