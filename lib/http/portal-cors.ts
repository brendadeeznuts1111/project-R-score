/**
 * Shared CORS / OPTIONS for Pages Functions (edge-safe).
 *
 * @see docs/portal-foundation.md
 * @see docs/platform-routing.md
 */

export const PORTAL_CORS_ALLOW_ORIGIN = '*';
export const PORTAL_CORS_ALLOW_METHODS = 'GET, HEAD, OPTIONS';
export const PORTAL_CORS_ALLOW_HEADERS = 'If-None-Match, Accept, Content-Type';

/** 204 preflight for public portal JSON/plain APIs. */
export function portalOptionsResponse(extra?: Record<string, string>): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': PORTAL_CORS_ALLOW_ORIGIN,
      'Access-Control-Allow-Methods': PORTAL_CORS_ALLOW_METHODS,
      'Access-Control-Allow-Headers': PORTAL_CORS_ALLOW_HEADERS,
      ...extra,
    },
  });
}

/** Standard CORS headers for successful GET responses. */
export function portalCorsHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': PORTAL_CORS_ALLOW_ORIGIN,
    ...extra,
  };
}
