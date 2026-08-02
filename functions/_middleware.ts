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

export async function onRequest(context: {
  request: Request;
  next: (input?: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}): Promise<Response> {
  return withCloudflareSecurityHeaders(await context.next());
}
