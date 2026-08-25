import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseBunChannelConfig,
  runBunChannelDoctor,
  type BunChannelConfig,
} from '../lib/verification/bun-channel-doctor.ts';

const config: BunChannelConfig = {
  schema_version: 1,
  policy: { runtime_channel: 'stable', mutation: 'never', promotion: 'reviewed' },
  types: {
    wrapper_package: '@types/bun',
    wrapper_channel: 'latest',
    definitions_package: 'bun-types',
    definitions_channel: 'canary',
  },
  monitor: {
    os_schedule: '17 6 * * *',
    os_timezone: 'system',
    in_process_timezone: 'UTC',
    title: 'bun-channel-doctor',
    artifact: 'public/registry/bun-channel-status.json',
    fetch_timeout_ms: 1_000,
  },
  sources: {
    stable_api: 'https://fixture.test/stable',
    stable_api_fallback: 'https://fixture.test/stable-fallback',
    canary_api: 'https://fixture.test/canary',
    tip_api: 'https://fixture.test/tip',
    blog: 'https://fixture.test/blog',
    rss: 'https://fixture.test/rss',
    atom: 'https://fixture.test/atom',
    npm_registry: 'https://fixture.test/npm',
  },
};

function fixtureFetch(overrides: Record<string, Response> = {}): typeof fetch {
  const fixtures: Record<string, Response> = {
    'https://fixture.test/stable': Response.json({
      tag_name: 'bun-v1.3.14',
      published_at: '2026-08-01T00:00:00Z',
    }),
    'https://fixture.test/canary': Response.json({
      name: 'Canary (abcdef0123456789deadbeef)',
      published_at: '2026-08-05T00:00:00Z',
    }),
    'https://fixture.test/tip': Response.json({
      sha: 'fedcba9876543210deadbeef',
      commit: { committer: { date: '2026-08-05T01:00:00Z' } },
    }),
    'https://fixture.test/blog': new Response(
      '<html><body><a href="/blog">Bun blog</a></body></html>'
    ),
    'https://fixture.test/rss': new Response(
      '<rss version="2.0"><channel><title>Bun</title><link>https://bun.com</link><description>Releases</description><item><title>Bun v1.3.14</title><link>https://bun.com/blog/bun-v1.3.14</link><guid>https://bun.com/blog/bun-v1.3.14</guid><pubDate>Wed, 13 May 2026 03:19:35 GMT</pubDate><description>Bun v1.3.14</description></item></channel></rss>'
    ),
    'https://fixture.test/atom': new Response('<feed><title>Bun v1.3.14</title></feed>'),
    'https://fixture.test/npm/%40types%2Fbun': Response.json({
      'dist-tags': { latest: '1.3.14' },
    }),
    'https://fixture.test/npm/bun-types': Response.json({
      'dist-tags': { canary: '1.4.0-canary.20260519T150915' },
    }),
    ...overrides,
  };
  return (async input => {
    const response = fixtures[String(input)];
    if (!response) return new Response('missing fixture', { status: 404 });
    return response.clone();
  }) as typeof fetch;
}

describe('Bun channel doctor', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'bun-channel-doctor-'));
    await Promise.all([
      mkdir(join(root, 'node_modules/@types/bun'), { recursive: true }),
      mkdir(join(root, 'node_modules/bun-types'), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(root, '.bun-version'), '1.3.14\n'),
      writeFile(
        join(root, 'package.json'),
        JSON.stringify({
          packageManager: 'bun@1.3.14',
          engines: { bun: '>=1.3.14' },
          catalog: {
            '@types/bun': '1.3.14',
            'bun-types': '1.4.0-canary.20260519T150915',
          },
        })
      ),
      writeFile(
        join(root, 'bun.lock'),
        JSON.stringify({
          catalog: {
            '@types/bun': '1.3.14',
            'bun-types': '1.4.0-canary.20260519T150915',
          },
          packages: {
            '@types/bun': ['@types/bun@1.3.14'],
            'bun-types': ['bun-types@1.4.0-canary.20260519T150915'],
          },
        })
      ),
      writeFile(
        join(root, 'node_modules/@types/bun/package.json'),
        JSON.stringify({
          version: '1.3.14',
          dependencies: { 'bun-types': '1.3.14' },
        })
      ),
      writeFile(
        join(root, 'node_modules/@types/bun/index.d.ts'),
        '/// <reference types="bun-types" />\n'
      ),
      writeFile(
        join(root, 'node_modules/bun-types/package.json'),
        JSON.stringify({ version: '1.4.0-canary.20260519T150915' })
      ),
      writeFile(
        join(root, 'node_modules/bun-types/bun.d.ts'),
        'declare namespace Bun { const cron: { /** interpreted in **UTC** */ (schedule: string, handler: () => unknown): unknown; }; }\n'
      ),
    ]);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test('loads the strict stable/latest/forward-declarations TOML contract', () => {
    const parsed = parseBunChannelConfig(`
      schema_version = 1
      [policy]
      runtime_channel = "stable"
      mutation = "never"
      promotion = "reviewed"
      [types]
      wrapper_package = "@types/bun"
      wrapper_channel = "latest"
      definitions_package = "bun-types"
      definitions_channel = "canary"
      [monitor]
      os_schedule = "17 6 * * *"
      os_timezone = "system"
      in_process_timezone = "UTC"
      title = "bun-channel-doctor"
      artifact = "public/registry/bun-channel-status.json"
      fetch_timeout_ms = 1000
      [sources]
      stable_api = "https://fixture.test/stable"
      stable_api_fallback = "https://fixture.test/fallback"
      canary_api = "https://fixture.test/canary"
      tip_api = "https://fixture.test/tip"
      blog = "https://fixture.test/blog"
      rss = "https://fixture.test/rss"
      atom = "https://fixture.test/atom"
      npm_registry = "https://fixture.test/npm"
    `);
    expect(parsed.policy.mutation).toBe('never');
    expect(parsed.types.definitions_channel).toBe('canary');
    expect(parsed.monitor.os_timezone).toBe('system');

    const tip = parseBunChannelConfig(`
      schema_version = 1
      [policy]
      runtime_channel = "stable"
      mutation = "never"
      promotion = "reviewed"
      [types]
      wrapper_package = "@types/bun"
      wrapper_channel = "latest"
      definitions_package = "bun-types"
      definitions_channel = "pinned-tip"
      [monitor]
      os_schedule = "17 6 * * *"
      os_timezone = "system"
      in_process_timezone = "UTC"
      title = "bun-channel-doctor"
      artifact = "public/registry/bun-channel-status.json"
      fetch_timeout_ms = 1000
      [sources]
      stable_api = "https://fixture.test/stable"
      stable_api_fallback = "https://fixture.test/fallback"
      canary_api = "https://fixture.test/canary"
      tip_api = "https://fixture.test/tip"
      blog = "https://fixture.test/blog"
      rss = "https://fixture.test/rss"
      atom = "https://fixture.test/atom"
      npm_registry = "https://fixture.test/npm"
    `);
    expect(tip.types.definitions_channel).toBe('pinned-tip');
  });

  test('proves a vendored tip across manifest, lockfile, install, and upstream revision', async () => {
    const tipConfig: BunChannelConfig = {
      ...config,
      types: { ...config.types, definitions_channel: 'pinned-tip' },
    };
    const version = '1.4.0-tip.fedcba98';
    const pin = `file:tools/vendor/bun-types/bun-types-${version}.tgz`;
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        packageManager: 'bun@1.3.14',
        engines: { bun: '>=1.3.14' },
        catalog: { '@types/bun': '1.3.14', 'bun-types': pin },
      })
    );
    await writeFile(
      join(root, 'bun.lock'),
      JSON.stringify({
        catalog: { '@types/bun': '1.3.14', 'bun-types': pin },
        packages: {
          '@types/bun': ['@types/bun@1.3.14'],
          'bun-types': [`bun-types@tools/vendor/bun-types/bun-types-${version}.tgz`],
        },
      })
    );
    await writeFile(join(root, 'node_modules/bun-types/package.json'), JSON.stringify({ version }));

    const report = await runBunChannelDoctor({
      root,
      config: tipConfig,
      fetchImpl: fixtureFetch(),
      runtime: { version: '1.3.14', revision: '0d9b296af' },
    });

    expect(report.summary.status).toBe('healthy');
    expect(report.drift.filter(item => item.kind === 'actionable')).toEqual([]);
    expect(report.policy.definitions_channel).toBe('pinned-tip');
  });

  test('reports a healthy, read-only intentional type-channel split', async () => {
    const report = await runBunChannelDoctor({
      root,
      config,
      fetchImpl: fixtureFetch(),
      now: () => new Date('2026-08-05T12:00:00Z'),
      runtime: { version: '1.3.14', revision: '0d9b296af' },
    });

    expect(report.summary).toEqual({
      status: 'healthy',
      exitCode: 0,
      intentional: 1,
      informational: 1,
      actionable: 0,
      sourceErrors: 0,
      reason: 'All actionable pins and release sources agree.',
    });
    expect(report.local.installedRevision).toBe('0d9b296af');
    expect(report.local.wrapperReferenceUsesSelectedDefinitions).toBe(true);
    expect(report.capabilities.cron).toEqual(
      expect.objectContaining({
        localContract: 'in-process-utc/no-tz-options',
        tipRevision: 'fedcba9876543210deadbeef',
        tipCapability: 'not-probed-by-commit-endpoint',
        authority: 'informational',
      })
    );
    expect(report.drift[0]?.kind).toBe('intentional');
    expect(report.observations.map(item => item.source)).toEqual([
      'local-manifest',
      'local-lockfile',
      'resolved-types',
      'installed-runtime',
      'github-stable',
      'github-canary',
      'github-tip',
      'bun-blog',
      'bun-rss',
      'github-atom',
      'npm-@types/bun',
      'npm-bun-types',
    ]);
  });

  test('classifies stale local declarations as actionable without changing files', async () => {
    await writeFile(join(root, '.bun-version'), '1.3.13\n');
    const before = await Bun.file(join(root, '.bun-version')).text();
    const report = await runBunChannelDoctor({
      root,
      config,
      fetchImpl: fixtureFetch(),
      runtime: { version: '1.3.13', revision: 'oldrev' },
    });

    expect(report.summary.status).toBe('action-required');
    expect(report.summary.exitCode).toBe(1);
    expect(report.drift.map(item => item.code)).toContain('bun-version-file-stale');
    expect(report.drift.map(item => item.code)).toContain('installed-runtime-stale');
    expect(await Bun.file(join(root, '.bun-version')).text()).toBe(before);
  });

  test('normalizes Bun minor launch posts as patch-zero stable corroboration', async () => {
    const report = await runBunChannelDoctor({
      root,
      config,
      fetchImpl: fixtureFetch({
        'https://fixture.test/stable': Response.json({
          tag_name: 'bun-v1.4.0',
          published_at: '2026-08-20T00:53:44Z',
        }),
        'https://fixture.test/rss': new Response(
          '<rss version="2.0"><channel><title>bun.com</title><link>https://bun.com</link><description>Bun posts</description><item><title>Bun 1.4</title><link>https://bun.com/blog/bun-v1.4</link><guid>https://bun.com/blog/bun-v1.4</guid><pubDate>Thu, 20 Aug 2026 00:53:44 GMT</pubDate><description>Bun 1.4</description></item></channel></rss>'
        ),
      }),
      runtime: { version: '1.4.0', revision: '34cbb9a40' },
    });

    expect(report.observations.find(row => row.source === 'bun-rss')?.versions).toContain(
      '1.4.0'
    );
    expect(report.drift.some(row => row.code === 'stable-missing-from:bun-rss')).toBe(false);
  });

  test('uses exit code 2 when an official source is unavailable', async () => {
    const report = await runBunChannelDoctor({
      root,
      config,
      fetchImpl: fixtureFetch({
        'https://fixture.test/rss': new Response('unavailable', { status: 503 }),
      }),
      runtime: { version: '1.3.14', revision: '0d9b296af' },
    });

    expect(report.summary.status).toBe('degraded');
    expect(report.summary.exitCode).toBe(2);
    expect(report.drift).toContainEqual(
      expect.objectContaining({ code: 'source-unavailable:bun-rss', kind: 'source-error' })
    );
  });

  test('uses the official oven-sh fallback when the updater release is unavailable', async () => {
    const report = await runBunChannelDoctor({
      root,
      config,
      fetchImpl: fixtureFetch({
        'https://fixture.test/stable': new Response('unavailable', { status: 503 }),
        'https://fixture.test/stable-fallback': Response.json({ tag_name: 'bun-v1.3.14' }),
      }),
      runtime: { version: '1.3.14', revision: '0d9b296af' },
    });

    expect(report.summary.status).toBe('healthy');
    expect(report.observations.find(item => item.source === 'github-stable')?.url).toBe(
      'https://fixture.test/stable-fallback'
    );
  });

  test('makes resolved lockfile and node_modules drift actionable', async () => {
    await writeFile(
      join(root, 'node_modules/bun-types/package.json'),
      JSON.stringify({ version: '1.3.14' })
    );
    await writeFile(
      join(root, 'bun.lock'),
      JSON.stringify({
        catalog: {
          '@types/bun': '1.3.14',
          'bun-types': '1.4.0-canary.20260519T150915',
        },
        packages: {
          '@types/bun': ['@types/bun@1.3.14'],
          'bun-types': ['bun-types@1.3.14'],
        },
      })
    );
    await mkdir(join(root, 'node_modules/@types/bun/node_modules/bun-types'), {
      recursive: true,
    });
    await writeFile(
      join(root, 'node_modules/@types/bun/node_modules/bun-types/package.json'),
      JSON.stringify({ version: '1.3.14' })
    );
    const report = await runBunChannelDoctor({
      root,
      config,
      fetchImpl: fixtureFetch(),
      runtime: { version: '1.3.14', revision: '0d9b296af' },
    });

    expect(report.summary.status).toBe('action-required');
    expect(report.drift).toContainEqual(
      expect.objectContaining({
        code: 'installed-definitions-resolution-drift',
        kind: 'actionable',
      })
    );
    expect(report.drift).toContainEqual(
      expect.objectContaining({
        code: 'lock-definitions-resolution-drift',
        kind: 'actionable',
      })
    );
    expect(report.drift).toContainEqual(
      expect.objectContaining({ code: 'wrapper-reference-resolution-drift', kind: 'actionable' })
    );
    expect(report.local.wrapperReferenceUsesSelectedDefinitions).toBe(false);
  });

  test('keeps an unavailable tip informational and non-blocking', async () => {
    const report = await runBunChannelDoctor({
      root,
      config,
      fetchImpl: fixtureFetch({
        'https://fixture.test/tip': new Response('unavailable', { status: 503 }),
      }),
      runtime: { version: '1.3.14', revision: '0d9b296af' },
    });

    expect(report.summary.status).toBe('healthy');
    expect(report.summary.exitCode).toBe(0);
    expect(report.drift).toContainEqual(
      expect.objectContaining({ code: 'tip-unavailable', kind: 'informational' })
    );
  });

  test('keeps an unavailable marketing blog informational and non-blocking', async () => {
    const report = await runBunChannelDoctor({
      root,
      config,
      fetchImpl: fixtureFetch({
        'https://fixture.test/blog': new Response('unavailable', { status: 503 }),
      }),
      runtime: { version: '1.3.14', revision: '0d9b296af' },
    });

    expect(report.summary.status).toBe('healthy');
    expect(report.summary.exitCode).toBe(0);
    expect(report.drift).toContainEqual(
      expect.objectContaining({ code: 'blog-unavailable', kind: 'informational' })
    );
  });

  test('keeps upstream tip availability informational for a reviewed pinned-tip', async () => {
    const version = '1.4.0-tip.fedcba98';
    const pin = `file:tools/vendor/bun-types/bun-types-${version}.tgz`;
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        packageManager: 'bun@1.3.14',
        engines: { bun: '>=1.3.14' },
        catalog: { '@types/bun': '1.3.14', 'bun-types': pin },
      })
    );
    await writeFile(
      join(root, 'bun.lock'),
      JSON.stringify({
        catalog: { '@types/bun': '1.3.14', 'bun-types': pin },
        packages: {
          '@types/bun': ['@types/bun@1.3.14'],
          'bun-types': [`bun-types@tools/vendor/bun-types/bun-types-${version}.tgz`],
        },
      })
    );
    await writeFile(join(root, 'node_modules/bun-types/package.json'), JSON.stringify({ version }));
    const report = await runBunChannelDoctor({
      root,
      config: {
        ...config,
        types: { ...config.types, definitions_channel: 'pinned-tip' },
      },
      fetchImpl: fixtureFetch({
        'https://fixture.test/tip': new Response('unavailable', { status: 503 }),
      }),
      runtime: { version: '1.3.14', revision: '0d9b296af' },
    });

    expect(report.summary.status).toBe('healthy');
    expect(report.drift).toContainEqual(
      expect.objectContaining({ code: 'tip-unavailable', kind: 'informational' })
    );
  });
});
