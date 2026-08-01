/**
 * Canonical trailing-slash redirect for portal board routes.
 *
 * 301s to the directory form while preserving the query string
 * (`/portal?tenant=factory` → `/portal/?tenant=factory`). The URL hash is
 * client-side and re-applied by the browser across redirects, so it needs
 * no handling here.
 */
export function canonicalSlashRedirect(req: Request, dir: string): Response {
  const url = new URL(req.url);
  return new Response(null, { status: 301, headers: { Location: `${dir}${url.search}` } });
}
