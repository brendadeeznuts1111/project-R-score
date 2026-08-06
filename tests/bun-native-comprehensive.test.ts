// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
// @see https://bun.com/docs/runtime/http/routing — typed Bun.serve routes
// @see https://bun.com/docs/test/writing-tests#type-testing — expectTypeOf via tsc
import { describe, expect, expectTypeOf, test } from 'bun:test';

// ── 20. URLPattern & Route Type Safety ───────────────────────────────────
describe('URLPattern and route type safety', () => {
  test('URLPattern matches pathname patterns and extracts params', () => {
    const pattern = new URLPattern({ pathname: '/api/catalog/:host' });
    const result = pattern.exec('https://example.com/api/catalog/hardrock.bet');

    expect(result).not.toBeNull();
    expect(result?.pathname.groups.host).toBe('hardrock.bet');
  });

  test('URLPattern wildcard matches', () => {
    const pattern = new URLPattern({ pathname: '/api/*' });

    expect(pattern.test('https://example.com/api/anything')).toBeTrue();
    expect(pattern.test('https://example.com/other')).toBeFalse();
  });

  test('Bun.serve routes extract params correctly', async () => {
    let capturedHost = '';
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      routes: {
        '/api/catalog/:host': req => {
          expectTypeOf(req.params.host).toEqualTypeOf<string>();
          // @ts-expect-error — route inference must reject undeclared parameters.
          void req.params.missing;
          capturedHost = req.params.host;
          return new Response('ok');
        },
      },
      fetch: () => new Response('not found', { status: 404 }),
    });

    try {
      const response = await fetch(new URL('/api/catalog/test-host', server.url));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('ok');
      expect(capturedHost).toBe('test-host');
    } finally {
      await server.stop(true);
    }
  });

  test('Bun.serve routes with multiple params', async () => {
    let capturedSite = '';
    let capturedId = '';
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      routes: {
        '/api/sites/:host/:id': req => {
          expectTypeOf(req.params.host).toEqualTypeOf<string>();
          expectTypeOf(req.params.id).toEqualTypeOf<string>();
          // @ts-expect-error — route inference must expose only host and id.
          void req.params.slug;
          capturedSite = req.params.host;
          capturedId = req.params.id;
          return new Response('ok');
        },
      },
      fetch: () => new Response('not found', { status: 404 }),
    });

    try {
      const response = await fetch(new URL('/api/sites/example.com/123', server.url));
      expect(response.status).toBe(200);
      expect(capturedSite).toBe('example.com');
      expect(capturedId).toBe('123');
    } finally {
      await server.stop(true);
    }
  });

  test('URLPattern matches hostname and protocol groups', () => {
    const pattern = new URLPattern({
      protocol: 'https',
      hostname: '*.example.com',
      pathname: '/api/:version/:host',
    });
    const result = pattern.exec('https://sub.example.com/api/v1/hardrock.bet');

    expect(result).not.toBeNull();
    expect(result?.pathname.groups.version).toBe('v1');
    expect(result?.pathname.groups.host).toBe('hardrock.bet');
    expect(result?.hostname.groups[0]).toBe('sub');
  });

  test('URLPattern hasRegExpGroups distinguishes named params from regex groups', () => {
    const pattern = new URLPattern({ pathname: '/api/:host' });
    const wildcardPattern = new URLPattern({ pathname: '/api/(.*)' });
    const regexPattern = new URLPattern({ pathname: '/api/:host([a-z]+)' });

    expect(pattern.hasRegExpGroups).toBeFalse();
    expect(wildcardPattern.hasRegExpGroups).toBeFalse();
    expect(regexPattern.hasRegExpGroups).toBeTrue();
  });
});
