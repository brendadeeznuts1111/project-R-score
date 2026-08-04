import { describe, expect, test } from 'bun:test';
import { createMemoryObjectStore } from '../lib/factory/object-store';
import { RegistryClient } from '../lib/factory/registry';
import { buildRegistryHealthReport } from '../lib/factory/health';
import { runIntegrityCheck } from '../lib/factory/integrity';
import { parseRegistryObjectKey } from '../lib/factory/http-keys';
import { sendRegistryAlert } from '../lib/factory/alerts';
import {
  REGISTRY_INTEGRITY_CRON_TITLE,
  REGISTRY_INTEGRITY_SCHEDULE,
  registerRegistryCrons,
} from '../lib/factory/monitoring';
import {
  createRegistryFetchHandler,
  createRegistryServer,
  RegistryGatewayPatterns,
} from '../lib/factory/server';
import { onRequest as registryHealthOnRequest } from '../functions/api/registry/health';

describe('parseRegistryObjectKey (lib)', () => {
  test('allows registry.json and factory prefixes', () => {
    expect(parseRegistryObjectKey('registry.json')).toBe('registry.json');
    expect(parseRegistryObjectKey('static.json')).toBe('static.json');
    expect(parseRegistryObjectKey('ops-summary.json')).toBe('ops-summary.json');
    expect(parseRegistryObjectKey('monitoring.json')).toBe('monitoring.json');
    expect(parseRegistryObjectKey('tennis/registry.json')).toBe('tennis/registry.json');
    expect(parseRegistryObjectKey('tennis/agent-auth.json')).toBe('tennis/agent-auth.json');
    expect(parseRegistryObjectKey('@factorywager/pkg/1.0.0.tgz')).toBe(
      '@factorywager/pkg/1.0.0.tgz'
    );
    expect(parseRegistryObjectKey('@factorywager/routing-test/latest.json')).toBe(
      '@factorywager/routing-test/latest.json'
    );
    expect(parseRegistryObjectKey('@tennis-hq/ssot/1.5.0.tgz')).toBe(
      '@tennis-hq/ssot/1.5.0.tgz'
    );
  });

  test('rejects traversal', () => {
    expect(parseRegistryObjectKey('../x')).toBeNull();
  });
});

describe('registry integrity', () => {
  test('fails when the registry index is absent', async () => {
    const client = new RegistryClient({ store: createMemoryObjectStore() });
    await expect(runIntegrityCheck(client)).rejects.toThrow('Registry index is unavailable');
  });

  test('passes when checksums match', async () => {
    const store = createMemoryObjectStore();
    const client = new RegistryClient({ store });
    const data = new Uint8Array([1, 2, 3]);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const checksum = [...new Uint8Array(hashBuffer)]
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    await store.putBytes('@factorywager/good/1.0.0.tgz', data);
    await store.putJson('registry.json', {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: {
        good: {
          versions: ['1.0.0'],
          'dist-tags': { latest: '1.0.0' },
          releases: {
            '1.0.0': {
              id: 'good@1.0.0',
              name: 'good',
              version: '1.0.0',
              type: 'library',
              publishedAt: new Date().toISOString(),
              publisher: 'test',
              storage: {
                r2Key: '@factorywager/good/1.0.0.tgz',
                size: 3,
                checksum,
                contentType: 'application/gzip',
              },
            },
          },
        },
      },
    });

    const report = await runIntegrityCheck(client);
    expect(report.total).toBe(1);
    expect(report.ok).toBe(1);
    expect(report.failures).toHaveLength(0);
  });

  test('reports size, checksum, and missing-object failures', async () => {
    const store = createMemoryObjectStore();
    const client = new RegistryClient({ store });
    await client.publish('broken', '1.0.0', new Uint8Array([1, 2, 3]), { readme: false });

    const key = '@factorywager/broken/1.0.0.tgz';
    const original = store.objects.get(key)!;
    store.objects.set(key, { ...original, body: new Uint8Array([9, 9, 9]) });
    const checksumReport = await runIntegrityCheck(client);
    expect(checksumReport.failures[0]?.reason).toBe('checksum');

    store.objects.set(key, { ...original, body: new Uint8Array([9]) });
    const sizeReport = await runIntegrityCheck(client);
    expect(sizeReport.failures[0]?.reason).toBe('size');

    store.objects.delete(key);
    const missingReport = await runIntegrityCheck(client);
    expect(missingReport.failures[0]?.reason).toBe('missing');
  });
});

describe('registry health report', () => {
  test('reports an absent index as an error instead of a healthy empty registry', async () => {
    const client = new RegistryClient({ store: createMemoryObjectStore() });
    const report = await buildRegistryHealthReport(client);
    expect(report.status).toBe('error');
    expect(report.indexAvailable).toBe(false);
  });

  test('counts packages from memory store', async () => {
    const store = createMemoryObjectStore();
    const client = new RegistryClient({ store });
    await store.putJson('registry.json', {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: {
        a: { versions: ['1.0.0'], 'dist-tags': { latest: '1.0.0' }, releases: {} },
        b: { versions: ['2.0.0', '2.1.0'], 'dist-tags': { latest: '2.1.0' }, releases: {} },
      },
    });

    const report = await buildRegistryHealthReport(client);
    expect(report.status).toBe('ok');
    expect(report.indexAvailable).toBe(true);
    expect(report.packages).toBe(2);
    expect(report.versions).toBe(3);
  });
});

describe('registry alerts and scheduling', () => {
  test('delivers redacted Slack and Telegram alerts through injected fetch', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const result = await sendRegistryAlert('checksum failed', 'critical', {
      slackWebhookUrl: 'https://hooks.example.test/registry',
      telegramBotToken: 'test-token',
      telegramChatTarget: 'ops-room',
      fetcher: async (input, init) => {
        calls.push({ url: String(input), body: String(init?.body ?? '') });
        return new Response(null, { status: 204 });
      },
    });

    expect(result).toEqual({ slack: true, telegram: true });
    expect(calls).toHaveLength(2);
    expect(calls.every(call => call.body.includes('[Registry] checksum failed'))).toBe(true);
  });

  test('registers the in-process cron with schedule, handler, title ordering', () => {
    const calls: Array<{ schedule: string; title?: string }> = [];
    registerRegistryCrons((schedule, _handler, title) => {
      calls.push({ schedule, title });
    });
    expect(calls).toEqual([
      { schedule: REGISTRY_INTEGRITY_SCHEDULE, title: REGISTRY_INTEGRITY_CRON_TITLE },
    ]);
  });
});

describe('registry VM server', () => {
  test('URLPattern fallback captures encoded and multi-segment package names', () => {
    expect(
      RegistryGatewayPatterns.publish.exec(
        'http://registry.test/api/registry/%40factorywager%2Fsdk/versions'
      )?.pathname.groups.package
    ).toBe('%40factorywager%2Fsdk');
    expect(
      RegistryGatewayPatterns.publish.exec(
        'http://registry.test/api/registry/@factorywager/sdk/versions'
      )?.pathname.groups.package
    ).toBe('@factorywager/sdk');
    expect(RegistryGatewayPatterns.publish.test('http://registry.test/api/registry//versions')).toBe(
      false
    );
  });

  test('GET /health returns JSON', async () => {
    const store = createMemoryObjectStore();
    await store.putJson('registry.json', {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: {},
    });

    const client = new RegistryClient({ store });
    const handler = createRegistryFetchHandler(client);
    const res = await handler(new Request('http://registry.test/health'));
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { packages: number; status: string };
    expect(body.status).toBe('ok');
    expect(body.packages).toBe(0);
  });

  test('serves only allowlisted objects and supports HEAD', async () => {
    const store = createMemoryObjectStore();
    await store.putJson('registry.json', { schemaVersion: 1, lastUpdated: '', packages: {} });
    const handler = createRegistryFetchHandler(new RegistryClient({ store }));

    const head = await handler(
      new Request('http://registry.test/api/registry/registry.json', { method: 'HEAD' })
    );
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');

    const rejected = await handler(
      new Request('http://registry.test/api/registry/../secret')
    );
    expect(rejected.status).toBe(404);
  });

  test('publishes only with the configured bearer token', async () => {
    const store = createMemoryObjectStore();
    const client = new RegistryClient({ store });
    const handler = createRegistryFetchHandler(client, { publishToken: 'publish-secret' });
    const publishRequest = (token?: string) => {
      const form = new FormData();
      form.set('version', '1.2.3');
      form.set('tags', 'latest,stable');
      form.set('metadata', JSON.stringify({ type: 'library', description: 'verified' }));
      form.set('file', new File([new Uint8Array([1, 2, 3])], 'package.tgz'));
      return new Request('http://registry.test/api/registry/%40factorywager/sdk/versions', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
    };

    expect((await handler(publishRequest())).status).toBe(401);
    expect((await handler(publishRequest('wrong'))).status).toBe(401);

    const published = await handler(publishRequest('publish-secret'));
    expect(published.status).toBe(201);
    expect((await client.resolve('@factorywager/sdk', 'stable'))?.version).toBe('1.2.3');
  });

  test('fails closed when no publish token is configured', async () => {
    const handler = createRegistryFetchHandler(
      new RegistryClient({ store: createMemoryObjectStore() }),
      { publishToken: '' }
    );
    const form = new FormData();
    form.set('version', '1.0.0');
    form.set('file', new File([new Uint8Array([1])], 'package.tgz'));
    const response = await handler(
      new Request('http://registry.test/api/registry/demo/versions', {
        method: 'POST',
        body: form,
      })
    );
    expect(response.status).toBe(503);
  });
});

describe('registry VM server routes (Bun.serve routes)', () => {
  test('routes match /ready, /health, index, scoped publish, object HEAD', async () => {
    const store = createMemoryObjectStore();
    await store.putJson('registry.json', {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: {},
    });
    const client = new RegistryClient({ store });
    const server = createRegistryServer({
      client,
      port: 0,
      hostname: '127.0.0.1',
      publishToken: 'publish-secret',
    });
    try {
      const base = `http://127.0.0.1:${server.port}`;

      const ready = await fetch(`${base}/ready`);
      expect(ready.status).toBe(200);
      expect((await ready.json()) as { ready: boolean }).toEqual({ ready: true });

      const health = await fetch(`${base}/health`);
      expect(health.ok).toBe(true);

      const index = await fetch(`${base}/api/registry`);
      expect(index.status).toBe(200);

      const form = new FormData();
      form.set('version', '2.0.0');
      form.set('tags', 'latest');
      form.set('file', new File([new Uint8Array([9, 9])], 'package.tgz'));
      const published = await fetch(`${base}/api/registry/@factorywager/routes-test/versions`, {
        method: 'POST',
        headers: { Authorization: 'Bearer publish-secret' },
        body: form,
      });
      expect(published.status).toBe(201);
      expect((await client.resolve('@factorywager/routes-test', 'latest'))?.version).toBe('2.0.0');

      const head = await fetch(`${base}/api/registry/registry.json`, { method: 'HEAD' });
      expect(head.status).toBe(200);
      expect(await head.text()).toBe('');
    } finally {
      await server.stop(true);
    }
  });
});

describe('registry pages health', () => {
  test('returns ok when registry.json exists', async () => {
    const index = {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: { x: { versions: ['1.0.0'], 'dist-tags': { latest: '1.0.0' }, releases: {} } },
    };
    const res = await registryHealthOnRequest({
      request: new Request('https://example.com/api/registry/health'),
      env: {
        REGISTRY_BUCKET: {
          get: async () => ({
            body: new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode(JSON.stringify(index)));
                controller.close();
              },
            }),
          }),
        },
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; packages: number };
    expect(body.status).toBe('ok');
    expect(body.packages).toBe(1);
  });

  test('fails closed for missing binding and malformed index', async () => {
    const missing = await registryHealthOnRequest({
      request: new Request('https://example.com/api/registry/health'),
      env: {},
    });
    expect(missing.status).toBe(503);
    expect(missing.headers.get('Cache-Control')).toBe('no-store');

    const malformed = await registryHealthOnRequest({
      request: new Request('https://example.com/api/registry/health'),
      env: {
        REGISTRY_BUCKET: {
          get: async () => ({
            body: new Response('{"packages":[]}').body,
          }),
        },
      },
    });
    expect(malformed.status).toBe(503);
    expect(await malformed.json()).toEqual({
      status: 'error',
      indexOk: false,
      message: 'Registry index is invalid',
    });
  });

  test('supports bodyless HEAD probes', async () => {
    const response = await registryHealthOnRequest({
      request: new Request('https://example.com/api/registry/health', { method: 'HEAD' }),
      env: {
        REGISTRY_BUCKET: {
          get: async () => ({
            body: new Response(
              JSON.stringify({ schemaVersion: 1, lastUpdated: '', packages: {} })
            ).body,
          }),
        },
      },
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });

  test('applies the configured CORS allowlist to health probes', async () => {
    const response = await registryHealthOnRequest({
      request: new Request('https://example.com/api/registry/health', {
        method: 'OPTIONS',
        headers: { Origin: 'https://app.factory-wager.com' },
      }),
      env: {
        REGISTRY_CORS_ORIGINS: 'https://app.factory-wager.com',
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://app.factory-wager.com'
    );
  });
});
