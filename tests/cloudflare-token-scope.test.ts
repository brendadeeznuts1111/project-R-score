// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/guides/test/mock-functions — mock.module / mock fn
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CLOUDFLARE_DEFAULTS,
  CLOUDFLARE_TOKEN_PERMISSIONS,
} from '../config/r2-env.ts';
import {
  assertCloudflareTokenScope,
  auditMcpCatalogParity,
  buildCloudflareTokenScopeProof,
  classifyTokenTier,
} from '../lib/verification/cloudflare-token-scope.ts';

const ROOT = join(import.meta.dir, '..');

function mockFetch(handlers: Record<string, (url: string) => Response | Promise<Response>>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    for (const [prefix, fn] of Object.entries(handlers)) {
      if (url.includes(prefix)) return fn(url);
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

const goodPolicies = [
  {
    effect: 'allow',
    resources: {
      [`com.cloudflare.api.account.${CLOUDFLARE_DEFAULTS.accountId}`]: '*',
      [`com.cloudflare.api.account.zone.${CLOUDFLARE_DEFAULTS.zones.factoryWager.id}`]: '*',
    },
    permission_groups: [
      { name: 'Cloudflare Pages Read' },
      { name: 'Cloudflare Pages Edit' },
      { name: 'Zone Read' },
      { name: 'DNS Edit' },
    ],
  },
];

describe('CLOUDFLARE_TOKEN_PERMISSIONS SSOT', () => {
  test('minimal tier lists four required permissions', () => {
    expect(CLOUDFLARE_TOKEN_PERMISSIONS.accountId).toBe(CLOUDFLARE_DEFAULTS.accountId);
    expect(CLOUDFLARE_TOKEN_PERMISSIONS.pagesProject).toBe('project-r-score');
    expect(CLOUDFLARE_TOKEN_PERMISSIONS.zoneName).toBe('factory-wager.com');
    expect(CLOUDFLARE_TOKEN_PERMISSIONS.minimal.length).toBe(4);
    expect(CLOUDFLARE_TOKEN_PERMISSIONS.minimal.map(m => m.permission)).toContain(
      'Cloudflare Pages:Edit'
    );
  });
});

describe('assertCloudflareTokenScope', () => {
  let restoreFetch: (() => void) | undefined;
  const prevToken = process.env.CLOUDFLARE_API_TOKEN;

  beforeEach(() => {
    process.env.CLOUDFLARE_API_TOKEN = 'test-token-scope-probe';
  });

  afterEach(() => {
    restoreFetch?.();
    restoreFetch = undefined;
    if (prevToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = prevToken;
  });

  test('passes with minimal permissions and successful probes', async () => {
    restoreFetch = mockFetch({
      '/tokens/verify': () =>
        new Response(
          JSON.stringify({
            success: true,
            result: { id: 'tok_1', status: 'active', policies: goodPolicies },
          })
        ),
      '/pages/projects/': () =>
        new Response(JSON.stringify({ success: true, result: { name: 'project-r-score' } })),
      '/zones/': () =>
        new Response(
          JSON.stringify({
            success: true,
            result: { name: CLOUDFLARE_DEFAULTS.zones.factoryWager.name },
          })
        ),
    });

    const report = await assertCloudflareTokenScope();
    expect(report.ok).toBe(true);
    expect(report.tokenKind).toBe('user');
    expect(report.probes.pages.ok).toBe(true);
    expect(report.probes.zone.ok).toBe(true);
    expect(report.tier).toBe('minimal');
    expect(report.pins.accountPinned).toBe(true);
  });

  test('account token (cfat_) uses account verify and probe-only scope', async () => {
    process.env.CLOUDFLARE_API_TOKEN = 'cfat_test_account_token_probe';
    restoreFetch = mockFetch({
      '/tokens/verify': () =>
        new Response(
          JSON.stringify({
            success: true,
            result: { id: 'cfat_1', status: 'active' },
          })
        ),
      '/pages/projects/': () =>
        new Response(JSON.stringify({ success: true, result: { name: 'project-r-score' } })),
      '/zones/': () =>
        new Response(
          JSON.stringify({
            success: true,
            result: { name: CLOUDFLARE_DEFAULTS.zones.factoryWager.name },
          })
        ),
    });

    const report = await assertCloudflareTokenScope();
    expect(report.tokenKind).toBe('account');
    expect(report.ok).toBe(true);
    expect(report.tier).toBe('minimal');
  });

  test('fails when minimal permission missing', async () => {
    restoreFetch = mockFetch({
      '/tokens/verify': () =>
        new Response(
          JSON.stringify({
            success: true,
            result: {
              id: 'tok_2',
              status: 'active',
              policies: [
                {
                  permission_groups: [{ name: 'Zone Read' }],
                  resources: {},
                },
              ],
            },
          })
        ),
      '/pages/projects/': () => new Response(JSON.stringify({ success: true, result: {} })),
      '/zones/': () =>
        new Response(
          JSON.stringify({
            success: true,
            result: { name: CLOUDFLARE_DEFAULTS.zones.factoryWager.name },
          })
        ),
    });

    await expect(assertCloudflareTokenScope()).rejects.toThrow(/Missing minimal permission/);
  });

  test('strict mode fails on over-broad warnings', async () => {
    restoreFetch = mockFetch({
      '/tokens/verify': () =>
        new Response(
          JSON.stringify({
            success: true,
            result: {
              id: 'tok_3',
              status: 'active',
              policies: [
                {
                  permission_groups: [
                    { name: 'Cloudflare Pages Read' },
                    { name: 'Cloudflare Pages Edit' },
                    { name: 'Zone Read' },
                    { name: 'DNS Edit' },
                    { name: 'Account Firewall Access Read' },
                  ],
                  resources: {
                    'com.cloudflare.api.account.zone.*': '*',
                  },
                },
              ],
            },
          })
        ),
      '/pages/projects/': () => new Response(JSON.stringify({ success: true, result: {} })),
      '/zones/': () =>
        new Response(
          JSON.stringify({
            success: true,
            result: { name: CLOUDFLARE_DEFAULTS.zones.factoryWager.name },
          })
        ),
    });

    const loose = await assertCloudflareTokenScope();
    expect(loose.warnings.length).toBeGreaterThan(0);

    await expect(assertCloudflareTokenScope({ strict: true })).rejects.toThrow(/strict/);
  });

  test('fails when Pages probe returns 403', async () => {
    restoreFetch = mockFetch({
      '/tokens/verify': () =>
        new Response(
          JSON.stringify({
            success: true,
            result: { id: 'tok_4', status: 'active', policies: goodPolicies },
          })
        ),
      '/pages/projects/': () => new Response('forbidden', { status: 403 }),
      '/zones/': () =>
        new Response(
          JSON.stringify({
            success: true,
            result: { name: CLOUDFLARE_DEFAULTS.zones.factoryWager.name },
          })
        ),
    });

    await expect(assertCloudflareTokenScope()).rejects.toThrow(/Pages probe failed/);
  });
});

describe('auditMcpCatalogParity + proof builder', () => {
  test('repo .mcp.json matches well-known manifest', async () => {
    const { ok, rows } = await auditMcpCatalogParity(ROOT);
    expect(ok).toBe(true);
    expect(rows.length).toBe(4);
  });

  test('buildCloudflareTokenScopeProof static path passes without token', async () => {
    const proof = await buildCloudflareTokenScopeProof({ rootDir: ROOT, live: false });
    expect(proof.type).toBe('CloudflareTokenScopeProof');
    expect(proof.summary.staticOk).toBe(true);
    expect(proof.summary.status).toBe('pass');
    expect(proof.mcpCatalog.ok).toBe(true);
    expect(proof.liveProbe.available).toBe(false);
  });

  test('classifyTokenTier detects mcp-full vs over-broad', () => {
    expect(
      classifyTokenTier(
        ['Cloudflare Pages Read', 'Cloudflare Pages Edit', 'Zone Read', 'DNS Edit'],
        [],
        CLOUDFLARE_TOKEN_PERMISSIONS.minimal
      )
    ).toBe('minimal');
    expect(
      classifyTokenTier(
        [
          'Cloudflare Pages Read',
          'Cloudflare Pages Edit',
          'Zone Read',
          'DNS Edit',
          'Workers Scripts Edit',
        ],
        [],
        CLOUDFLARE_TOKEN_PERMISSIONS.minimal
      )
    ).toBe('mcp-full');
    expect(
      classifyTokenTier(
        ['Cloudflare Pages Read', 'Cloudflare Pages Edit', 'Zone Read', 'DNS Edit'],
        ['Unexpected permission group: Super Admin'],
        CLOUDFLARE_TOKEN_PERMISSIONS.minimal
      )
    ).toBe('over-broad');
  });
});

describe('public/.well-known/mcp.json', () => {
  test('URLs match .mcp.json Cloudflare HTTP servers', () => {
    const wellKnown = JSON.parse(
      readFileSync(join(ROOT, 'public/.well-known/mcp.json'), 'utf8')
    ) as { servers: Array<{ name: string; url: string }> };
    const mcpCatalog = JSON.parse(readFileSync(join(ROOT, '.mcp.json'), 'utf8')) as {
      mcpServers: Record<string, { url?: string }>;
    };

    const cloudflareNames = Object.keys(mcpCatalog.mcpServers).filter(k => k.startsWith('cloudflare'));
    expect(wellKnown.servers.length).toBe(cloudflareNames.length);

    for (const name of cloudflareNames) {
      const catalogUrl = mcpCatalog.mcpServers[name]?.url;
      const wellKnownEntry = wellKnown.servers.find(s => s.name === name);
      expect(wellKnownEntry?.url).toBe(catalogUrl);
    }
  });
});
