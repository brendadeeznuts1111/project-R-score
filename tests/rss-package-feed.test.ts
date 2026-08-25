// @see https://www.rssboard.org/rss-specification — optional item/channel dates

import { describe, expect, test } from 'bun:test';
import { RSSManager, generateRSS } from '../lib/rss/rss-manager.ts';
import { buildRssFeed } from '../scripts/search-benchmark-snapshot.ts';
import { parseFirstRssGuid } from '../scripts/search-status-contract-check.ts';

describe('deterministic package RSS generation', () => {
  test('server feed routes use the shared Bun.XML serializer', async () => {
    const source = await Bun.file('server/server-enhanced.ts').text();
    expect(source).toContain("import { generateRSS, type RSSFeed } from '../lib/rss/rss-xml.ts'");
    expect(source).not.toContain('<rss version="2.0"');
    expect(source).not.toContain('<![CDATA[');
  });

  test('search artifacts serialize and parse through the shared Bun.XML boundary', async () => {
    const snapshotSource = await Bun.file('scripts/search-benchmark-snapshot.ts').text();
    const contractSource = await Bun.file('scripts/search-status-contract-check.ts').text();
    expect(snapshotSource).not.toContain('function escapeXml');
    expect(snapshotSource).not.toContain('<rss version="2.0"');
    expect(contractSource).not.toContain('xml.match(');

    const xml = buildRssFeed(
      {
        updatedAt: '2026-08-24T12:00:00Z',
        snapshots: [
          {
            id: 'older<&',
            createdAt: '2026-08-23T12:00:00Z',
            topProfile: 'safe<&',
            topScore: 1,
            localJson: 'older.json',
            localMd: 'older.md',
          },
          {
            id: 'newer',
            createdAt: '2026-08-24T12:00:00Z',
            topProfile: 'fast',
            topScore: 2,
            localJson: 'newer.json',
            localMd: 'newer.md',
          },
        ],
      },
      { prefix: 'bench', publicBase: 'https://example.com/bench' }
    );
    expect(xml).toContain('safe&lt;&amp;');
    expect(parseFirstRssGuid(xml)).toBe('newer');
  });

  test('does not invent npm or GitHub feeds from a package name', async () => {
    let fetchCalls = 0;
    const fetcher = Object.assign(
      async () => {
        fetchCalls++;
        return new Response('unused');
      },
      { preconnect: (_url: string): void => {} }
    ) as typeof fetch;
    const manager = new RSSManager(undefined, { fetcher, enrichImages: false });
    expect(await manager.getPackageFeeds('@scope/pkg')).toEqual([]);
    expect(fetchCalls).toBe(0);
  });

  test('does not use request wall time and sorts normalized source records', async () => {
    const manager = new RSSManager(undefined, { enrichImages: false });
    const info = {
      name: '@scope/pkg',
      version: '1.0.0',
      description: 'Package',
      dependencies: { zebra: '^1', alpha: '^2' },
      devDependencies: {},
      bunDocs: [
        { api: 'write', url: 'https://bun.com/docs/runtime/file-io', category: 'runtime' },
        { api: 'build', url: 'https://bun.com/docs/bundler', category: 'bundler' },
      ],
    };

    const first = generateRSS(await manager.generatePackageFeed(info.name, info));
    await Bun.sleep(2);
    const second = generateRSS(await manager.generatePackageFeed(info.name, info));

    expect(second).toBe(first);
    expect(first).not.toContain('<lastBuildDate>');
    expect(first).not.toContain('<pubDate>');
    expect(first.indexOf('build - @scope/pkg')).toBeLessThan(first.indexOf('write - @scope/pkg'));
    expect(first.indexOf('Dependency: alpha@^2')).toBeLessThan(
      first.indexOf('Dependency: zebra@^1')
    );
    expect(first).toContain('<guid isPermaLink="false">bun:@scope/pkg:build</guid>');
  });
});
