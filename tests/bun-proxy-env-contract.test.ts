// @see https://bun.com/docs/guides/http/proxy#environment-variables
// @see https://bun.com/blog/bun-v1.3.12#bun-apis
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { BUN_FETCH_PROXY_ENV_REGISTRY } from '../lib/net/proxy.ts';
import docsCatalog from '../tools/bun-docs-catalog.json';
import { createEphemeralServe, type EphemeralServeHandle } from './harness.ts';

const PROXY_ENV_KEYS = [
  'HTTP_PROXY',
  'http_proxy',
  'HTTPS_PROXY',
  'https_proxy',
  'NO_PROXY',
  'no_proxy',
] as const;

type ProxyEnvKey = (typeof PROXY_ENV_KEYS)[number];

describe('Bun fetch proxy environment contract', () => {
  let direct: EphemeralServeHandle;
  let uppercaseProxy: EphemeralServeHandle;
  let lowercaseProxy: EphemeralServeHandle;
  const previous = new Map<ProxyEnvKey, string>();

  beforeAll(() => {
    direct = createEphemeralServe({ fetch: () => new Response('direct') });
    uppercaseProxy = createEphemeralServe({ fetch: () => new Response('uppercase-proxy') });
    lowercaseProxy = createEphemeralServe({ fetch: () => new Response('lowercase-proxy') });
    for (const key of PROXY_ENV_KEYS) previous.set(key, process.env[key] ?? '');
  });

  afterAll(async () => {
    for (const key of PROXY_ENV_KEYS) process.env[key] = previous.get(key) ?? '';
    await Promise.all([
      direct[Symbol.asyncDispose](),
      uppercaseProxy[Symbol.asyncDispose](),
      lowercaseProxy[Symbol.asyncDispose](),
    ]);
  });

  test('registry defines canonical keys, aliases, defaults, and refresh behavior', () => {
    expect(BUN_FETCH_PROXY_ENV_REGISTRY).toEqual([
      expect.objectContaining({
        key: 'HTTP_PROXY',
        alias: 'http_proxy',
        role: 'http-proxy',
        defaultBehavior: 'no-proxy-from-this-key',
        conflictPrecedence: 'lowercase-non-empty-wins',
        refresh: 'next-fetch',
      }),
      expect.objectContaining({
        key: 'HTTPS_PROXY',
        alias: 'https_proxy',
        role: 'https-proxy',
        defaultBehavior: 'no-proxy-from-this-key',
        conflictPrecedence: 'lowercase-non-empty-wins',
        refresh: 'next-fetch',
      }),
      expect.objectContaining({
        key: 'NO_PROXY',
        alias: 'no_proxy',
        role: 'bypass',
        defaultBehavior: 'no-bypass',
        conflictPrecedence: 'lowercase-non-empty-wins',
        refresh: 'next-fetch',
      }),
    ]);
  });

  test('Bun docs catalog exposes the canonical proxy environment family', () => {
    const entries = docsCatalog.entries.filter(entry =>
      BUN_FETCH_PROXY_ENV_REGISTRY.some(contract => contract.key === entry.name)
    );
    expect(entries.map(entry => entry.name).sort()).toEqual([
      'HTTPS_PROXY',
      'HTTP_PROXY',
      'NO_PROXY',
    ]);
    expect(entries.every(entry => entry.type === 'env-var')).toBe(true);
  });

  test('lowercase wins, explicit proxy overrides env, and bypass refreshes next fetch', async () => {
    process.env.HTTPS_PROXY = '';
    process.env.https_proxy = '';
    process.env.NO_PROXY = '';
    process.env.no_proxy = '';
    process.env.HTTP_PROXY = uppercaseProxy.origin;
    process.env.http_proxy = lowercaseProxy.origin;

    const target = `${direct.origin}/proxy-contract`;
    expect(await (await fetch(target)).text()).toBe('lowercase-proxy');

    expect(await (await fetch(target, { proxy: uppercaseProxy.origin })).text()).toBe(
      'uppercase-proxy'
    );

    process.env.no_proxy = '127.0.0.1';
    expect(await (await fetch(target)).text()).toBe('direct');

    process.env.no_proxy = '';
    process.env.NO_PROXY = '*';
    expect(await (await fetch(target)).text()).toBe('direct');
  });
});
