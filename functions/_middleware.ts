/**
 * Pages middleware — apply the shared security-header contract to static assets
 * and Pages Functions without replacing route-specific cache or CORS headers.
 *
 * Also decodes npm scoped-package URLs: npm/bun clients request packuments as
 * `/@scope%2fname`, but Pages filesystem routing does not decode `%2f` into a
 * path separator, so the request would fall through to the SPA HTML fallback.
 * Rewriting to the decoded path here lets `functions/@factorywager/[pkg].ts`
 * (and any future scoped route) match real npm client traffic.
 *
 * @see https://developers.cloudflare.com/pages/functions/middleware/
 */
import { withCloudflareSecurityHeaders } from '../lib/http/cloudflare-security-headers.ts';

/** `/@scope%2fname` → `/@scope/name`; null when the path is not an encoded scope. */
export function decodeScopedPackagePath(pathname: string): string | null {
  const m = pathname.match(/^\/(@[A-Za-z0-9._~-]+)%2f([A-Za-z0-9._-]+)\/?$/i);
  return m ? `/${m[1]}/${m[2]}` : null;
}

export async function onRequest(context: {
  request: Request;
  next: (input?: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}): Promise<Response> {
  const url = new URL(context.request.url);
  const decoded = decodeScopedPackagePath(url.pathname);
  const response = decoded
    ? await context.next(
        new Request(new URL(decoded + url.search, url).toString(), context.request)
      )
    : await context.next();
  return withCloudflareSecurityHeaders(response);
}
