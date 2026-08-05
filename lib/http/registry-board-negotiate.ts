/**
 * Browser document navigations to registry JSON should land on the portal board.
 * Machine clients (curl Accept: star/star, fetch Accept: application/json, ?raw=1) keep JSON.
 *
 * Used by scripts/serve-public.ts fetchHandler before staticFile.
 */
export const REGISTRY_BOARD_REDIRECTS: Readonly<Record<string, string>> = {
  '/registry/vault-health.json': '/portal/vault/',
  '/registry/vault-map.json': '/portal/env/',
  '/registry/env-inventory.json': '/portal/env/',
  '/registry/partners-ops.json': '/portal/partners/',
};

/** True when the request is a browser document load that prefers HTML over JSON. */
export function prefersRegistryBoardHtml(req: Request): boolean {
  const url = new URL(req.url);
  if (url.searchParams.has('raw')) return false;
  if (url.searchParams.get('format') === 'json') return false;

  // Chromium/WebKit navigation from the address bar / link click
  if (req.headers.get('sec-fetch-dest') === 'document') return true;

  const accept = (req.headers.get('accept') ?? '').toLowerCase();
  if (!accept || accept === '*/*') return false;
  // Explicit JSON-only clients
  if (accept.includes('application/json') && !accept.includes('text/html')) return false;
  return accept.includes('text/html');
}

/** Board path to redirect to, or null to serve the JSON file. */
export function registryBoardRedirectFor(req: Request, pathname: string): string | null {
  if (req.method !== 'GET' && req.method !== 'HEAD') return null;
  const board = REGISTRY_BOARD_REDIRECTS[pathname];
  if (!board) return null;
  if (!prefersRegistryBoardHtml(req)) return null;
  return board;
}
