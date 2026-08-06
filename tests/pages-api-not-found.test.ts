import { describe, expect, test } from 'bun:test';
import { onRequest } from '../functions/api/[[path]].ts';

describe('Pages unmatched route boundaries', () => {
  test.each(['GET', 'POST', 'HEAD'])('returns a truthful JSON 404 for unmatched API %s', async method => {
    const response = onRequest({
      request: new Request('https://score.factory-wager.com/api/events', { method }),
    });
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json; charset=utf-8'
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    if (method === 'HEAD') {
      expect(await response.text()).toBe('');
      return;
    }
    expect(await response.json()).toEqual({
      type: 'about:blank',
      title: 'API route not found',
      status: 404,
      detail: 'This API route is not deployed on the Cloudflare Pages surface.',
      instance: '/api/events',
      code: 'PAGES_API_ROUTE_NOT_FOUND',
    });
  });

  test('registers the canonical v1.13 alias without a wildcard SPA rewrite', async () => {
    const redirects = await Bun.file('public/_redirects').text();
    expect(redirects).toContain(
      '/v1.13                   /portal/agent-odds/dashboard-v1.13      200'
    );
    expect(redirects).toContain('/v1.13/                  /v1.13');
    expect(redirects).not.toMatch(/^\/\*\s+/m);
  });

  test('ships an accessible noindex 404 page to disable Pages SPA fallback', async () => {
    const page = await Bun.file('public/404.html').text();
    expect(page).toContain('<meta name="robots" content="noindex"');
    expect(page).toContain('<h1>Page not found</h1>');
    expect(page).toContain('href="/portal/agent-odds/"');
  });
});
