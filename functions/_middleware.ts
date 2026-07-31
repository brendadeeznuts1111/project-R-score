/**
 * Pages middleware — apply the shared security-header contract to static assets
 * and Pages Functions without replacing route-specific cache or CORS headers.
 *
 * @see https://developers.cloudflare.com/pages/functions/middleware/
 */
import { withCloudflareSecurityHeaders } from '../lib/http/cloudflare-security-headers.ts';

export async function onRequest(context: { next: () => Promise<Response> }): Promise<Response> {
  return withCloudflareSecurityHeaders(await context.next());
}
