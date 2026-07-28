/**
 * Shared method guard for read-only Pages Functions.
 * Edge handlers serve snapshots/scripts — writes are never valid (matches the
 * /api/registry contract: 405 for non-GET). Returns a 405 Response, or null
 * when the method is allowed (GET/HEAD/OPTIONS).
 *
 * Usage (first line of a generic onRequest):
 *   const blocked = getOnly(context.request);
 *   if (blocked) return blocked;
 */
export function getOnly(request: Request): Response | null {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return null;
  }
  return Response.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { 'Cache-Control': 'no-store', Allow: 'GET, HEAD, OPTIONS' } }
  );
}
