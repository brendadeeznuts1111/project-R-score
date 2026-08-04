/**
 * factory-registry-pages-proxy-v1 — Pages Function /api/registry key + binding contract.
 *
 * @see functions/api/registry/[[path]].ts
 */

import { describe, expect, test } from 'bun:test';
import {
  jsonError,
  isRegistryIndexPayload,
  onRequest,
  parseRegistryObjectKey,
  type RegistryPagesContext,
  type RegistryR2Bucket,
} from '../functions/api/registry/[[path]].ts';

function mockBucket(
  objects: Record<string, { body: string; contentType?: string; etag?: string }>
): RegistryR2Bucket & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async get(key: string) {
      calls.push(key);
      const hit = objects[key];
      if (!hit) return null;
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(hit.body));
            controller.close();
          },
        }),
        httpEtag: hit.etag,
        httpMetadata: { contentType: hit.contentType ?? 'application/json' },
      };
    },
  };
}

function mockAssets(body: string, contentType = 'application/json') {
  return {
    fetch: async () =>
      new Response(body, {
        status: 200,
        headers: { 'Content-Type': contentType, ETag: '"static-1"' },
      }),
  };
}
function ctx(
  path: string,
  init?: {
    method?: string;
    env?: RegistryPagesContext['env'];
    origin?: string;
    paramsPath?: string | string[];
  }
): RegistryPagesContext {
  const headers = new Headers();
  if (init?.origin) headers.set('Origin', init.origin);
  return {
    request: new Request(`https://example.pages.dev${path}`, {
      method: init?.method ?? 'GET',
      headers,
    }),
    env: init?.env ?? {},
    params: init?.paramsPath !== undefined ? { path: init.paramsPath } : undefined,
  };
}

describe('parseRegistryObjectKey', () => {
  test('allows registry.json and known prefixes', () => {
    expect(parseRegistryObjectKey('registry.json')).toBe('registry.json');
    expect(parseRegistryObjectKey('@factorywager/my-lib/1.0.0.tgz')).toBe(
      '@factorywager/my-lib/1.0.0.tgz'
    );
    expect(parseRegistryObjectKey('@tennis-hq/ssot/1.5.0.tgz')).toBe(
      '@tennis-hq/ssot/1.5.0.tgz'
    );
    expect(parseRegistryObjectKey('projects/app/2.0.0.tgz')).toBe('projects/app/2.0.0.tgz');
    expect(parseRegistryObjectKey('readme/my-lib.md')).toBe('readme/my-lib.md');
  });

  test('rejects traversal, absolute, empty, and unknown prefixes', () => {
    expect(parseRegistryObjectKey('')).toBeNull();
    expect(parseRegistryObjectKey('../secret')).toBeNull();
    expect(parseRegistryObjectKey('foo/../../etc/passwd')).toBeNull();
    expect(parseRegistryObjectKey('%2e%2e/secret')).toBeNull();
    expect(parseRegistryObjectKey('/registry.json')).toBeNull();
    expect(parseRegistryObjectKey('other/prefix.json')).toBeNull();
    expect(parseRegistryObjectKey('a\0b')).toBeNull();
  });
});

describe('isRegistryIndexPayload', () => {
  test('accepts packages object', () => {
    expect(isRegistryIndexPayload('{"schemaVersion":1,"packages":{}}')).toBe(true);
  });

  test('rejects forbidden stub and malformed JSON', () => {
    expect(
      isRegistryIndexPayload('Forbidden: requests to project-r-score.pages.dev are not allowed')
    ).toBe(false);
    expect(isRegistryIndexPayload('{"packages":[]}')).toBe(false);
  });
});

describe('onRequest — Pages registry proxy', () => {
  test('registry.json prefers static ASSETS over corrupt R2', async () => {
    const bucket = mockBucket({
      'registry.json': {
        body: 'Forbidden: requests to project-r-score.pages.dev are not allowed',
        contentType: 'application/json',
      },
    });
    const res = await onRequest(
      ctx('/api/registry/registry.json', {
        env: {
          REGISTRY_BUCKET: bucket,
          ASSETS: mockAssets('{"schemaVersion":1,"packages":{"x":{"versions":["1.0.0"]}}}'),
        },
        paramsPath: 'registry.json',
      })
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('"packages"');
    expect(bucket.calls).toEqual([]);
  });

  test('streams allowlisted object with cache headers', async () => {
    const bucket = mockBucket({
      'registry.json': {
        body: '{"schemaVersion":1,"packages":{}}',
        contentType: 'application/json',
        etag: '"etag-1"',
      },
    });
    const res = await onRequest(
      ctx('/api/registry/registry.json', {
        env: { REGISTRY_BUCKET: bucket },
        paramsPath: 'registry.json',
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Cache-Control')).toContain('max-age=60');
    expect(res.headers.get('ETag')).toBe('"etag-1"');
    expect(await res.text()).toBe('{"schemaVersion":1,"packages":{}}');
    expect(bucket.calls).toEqual(['registry.json']);
  });

  test('rejects bad keys before calling the binding', async () => {
    const bucket = mockBucket({});
    const res = await onRequest(
      ctx('/api/registry/../secret', {
        env: { REGISTRY_BUCKET: bucket },
        paramsPath: '../secret',
      })
    );
    expect(res.status).toBe(400);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(bucket.calls).toEqual([]);
  });

  test('fail-closed when REGISTRY_BUCKET binding is missing', async () => {
    const res = await onRequest(ctx('/api/registry/registry.json', { paramsPath: 'registry.json' }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Registry index unavailable' });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  test('404 for missing registry.json when R2 empty and static absent', async () => {
    const bucket = mockBucket({});
    const res = await onRequest(
      ctx('/api/registry/registry.json', {
        env: { REGISTRY_BUCKET: bucket },
        paramsPath: 'registry.json',
      })
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Registry index unavailable' });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  test('404 for missing non-index object', async () => {
    const bucket = mockBucket({});
    const res = await onRequest(
      ctx('/api/registry/@factorywager/missing/1.0.0.tgz', {
        env: { REGISTRY_BUCKET: bucket },
        paramsPath: '@factorywager/missing/1.0.0.tgz',
      })
    );
    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  test('OPTIONS returns 204; CORS only for allowlisted Origin', async () => {
    const env = {
      REGISTRY_CORS_ORIGINS: 'https://factory-wager.com,https://project-r-score.pages.dev',
    };
    const ok = await onRequest(
      ctx('/api/registry/registry.json', {
        method: 'OPTIONS',
        env,
        origin: 'https://factory-wager.com',
      })
    );
    expect(ok.status).toBe(204);
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('https://factory-wager.com');

    const denied = await onRequest(
      ctx('/api/registry/registry.json', {
        method: 'OPTIONS',
        env,
        origin: 'https://evil.example',
      })
    );
    expect(denied.status).toBe(204);
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  test('non-GET returns 405', async () => {
    const res = await onRequest(
      ctx('/api/registry/registry.json', {
        method: 'POST',
        env: { REGISTRY_BUCKET: mockBucket({}) },
        paramsPath: 'registry.json',
      })
    );
    expect(res.status).toBe(405);
  });

  test('jsonError helper is no-store JSON', () => {
    const res = jsonError(502, 'Registry unreachable');
    expect(res.status).toBe(502);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
