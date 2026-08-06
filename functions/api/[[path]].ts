/**
 * Cloudflare Pages boundary for API routes owned by the Bun operator runtime.
 * More-specific Pages Functions win; unmatched /api/* requests fail as JSON
 * instead of falling through to the static command-centre shell.
 *
 * @see https://developers.cloudflare.com/pages/functions/routing/
 */

export function onRequest(context: { request: Request }): Response {
  const url = new URL(context.request.url);
  const body = JSON.stringify({
    type: 'about:blank',
    title: 'API route not found',
    status: 404,
    detail: 'This API route is not deployed on the Cloudflare Pages surface.',
    instance: url.pathname,
    code: 'PAGES_API_ROUTE_NOT_FOUND',
  });
  return new Response(context.request.method === 'HEAD' ? null : body, {
    status: 404,
    headers: {
      'content-type': 'application/problem+json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
