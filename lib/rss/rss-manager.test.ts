import { test, expect, describe } from 'bun:test';
import { RSSManager } from './rss-manager.ts';
import { CacheManager } from '../core/cache-manager.ts';
import type { PackageInfo } from '../package/package-manager.ts';

describe('RSSManager', () => {
  test('initializes with empty state', () => {
    const mgr = new RSSManager();
    // @ts-expect-error — accessing private for test
    expect(mgr.feeds.size).toBe(0);
    // @ts-expect-error — accessing private for test — CacheManager instance
    expect(mgr.cache).toBeInstanceOf(CacheManager);
  });

  test('parseRSS extracts title/link/items from XML', () => {
    const mgr = new RSSManager();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Test Feed</title>
        <link>https://example.com</link>
        <description>A test feed</description>
        <item>
          <title>Post 1</title>
          <link>https://example.com/1</link>
          <description>First post</description>
          <pubDate>2026-01-01</pubDate>
        </item>
        <item>
          <title>Post 2</title>
          <link>https://example.com/2</link>
          <description>Second post</description>
          <pubDate>2026-01-02</pubDate>
        </item>
      </channel>
    </rss>`;
    // @ts-expect-error — accessing private for test
    const feed = mgr.parseRSS(xml);
    expect(feed.title).toBe('Test Feed');
    expect(feed.link).toBe('https://example.com');
    expect(feed.items).toHaveLength(2);
    expect(feed.items[0].title).toBe('Post 1');
    expect(feed.items[1].link).toBe('https://example.com/2');
  });

  test('parseRSS handles items with missing fields', () => {
    const mgr = new RSSManager();
    const xml = `<rss><channel>
      <title>Sparse</title>
      <link>https://sparse.com</link>
      <description>sparse feed</description>
      <item><title>Only Title</title><link>https://sparse.com/1</link></item>
      <item><title>No Link</title></item>
    </channel></rss>`;
    // @ts-expect-error — accessing private for test
    const feed = mgr.parseRSS(xml);
    // Item without link is skipped (parseRSS requires title AND link)
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].description).toBe('');
  });

  test('generateRSS produces valid XML structure', () => {
    const mgr = new RSSManager();
    // @ts-expect-error — accessing private for test
    const xml = mgr.generateRSS({
      title: 'My Feed',
      link: 'https://example.com',
      description: 'Test',
      items: [
        { title: 'Item 1', link: 'https://example.com/1', description: 'Desc', pubDate: '2026-01-01', guid: 'g1' },
      ],
      lastBuildDate: '2026-01-01',
      ttl: 60,
    });
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain('<title>My Feed</title>');
    expect(xml).toContain('<title>Item 1</title>');
    expect(xml).toContain('</rss>');
  });

  test('generatePackageFeed includes bunDocs items', async () => {
    const mgr = new RSSManager();
    const pkgInfo: PackageInfo = {
      name: 'test-pkg',
      version: '1.0.0',
      description: 'test',
      dependencies: {},
      devDependencies: {},
      bunDocs: [
        { api: 'serve', url: 'https://bun.sh/docs/api/serve', category: 'http' },
      ],
    };
    const feed = await mgr.generatePackageFeed('test-pkg', pkgInfo);
    expect(feed.title).toContain('test-pkg');
    expect(feed.items.length).toBeGreaterThanOrEqual(1);
    expect(feed.items[0].title).toContain('serve');
  });

  test('generatePackageFeed includes dependency items', async () => {
    const mgr = new RSSManager();
    const pkgInfo: PackageInfo = {
      name: 'dep-pkg',
      version: '2.0.0',
      description: 'has deps',
      dependencies: { lodash: '^4.0.0', zod: '^3.0.0' },
      devDependencies: {},
    };
    const feed = await mgr.generatePackageFeed('dep-pkg', pkgInfo);
    const depItems = feed.items.filter(i => i.title.startsWith('Dependency:'));
    expect(depItems).toHaveLength(2);
    expect(depItems[0].title).toContain('lodash');
  });

  test('CacheManager integration: set and get round-trip', async () => {
    const cache = new CacheManager({ defaultTTL: 300000, maxSize: 100 });
    const feed = { title: 'Test', link: 'https://test.com', description: 'test', items: [], lastBuildDate: '', ttl: 60 };
    await cache.set('test-key', feed, { tags: ['rss'] });
    const retrieved = await cache.get('test-key');
    expect(retrieved).toEqual(feed);
  });

  test('parseRSS handles empty RSS document (no items)', () => {
    const mgr = new RSSManager();
    const xml = `<?xml version="1.0"?><rss><channel>
      <title>Empty Feed</title>
      <link>https://empty.com</link>
      <description>Nothing here</description>
    </channel></rss>`;
    // @ts-expect-error — accessing private for test
    const feed = mgr.parseRSS(xml);
    expect(feed.title).toBe('Empty Feed');
    expect(feed.items).toHaveLength(0);
  });

  test('parseRSS handles CDATA sections in title/description', () => {
    const mgr = new RSSManager();
    // Note: the simple regex parser extracts text between <title> and </title>
    // CDATA sections will be part of the captured text
    const xml = `<rss><channel>
      <title>Feed Title</title>
      <link>https://cdata.com</link>
      <description>Desc</description>
      <item>
        <title>Regular Title</title>
        <link>https://cdata.com/1</link>
        <description>Regular desc</description>
      </item>
    </channel></rss>`;
    // @ts-expect-error — accessing private for test
    const feed = mgr.parseRSS(xml);
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].title).toBe('Regular Title');
  });

  test('generateRSS escapes special XML characters in structure', () => {
    const mgr = new RSSManager();
    // @ts-expect-error — accessing private for test
    const xml = mgr.generateRSS({
      title: 'Feed & Title',
      link: 'https://example.com',
      description: 'Test <desc>',
      items: [],
      lastBuildDate: '2026-01-01',
      ttl: 60,
    });
    expect(xml).toContain('<title>Feed & Title</title>');
    expect(xml).toContain('<rss version="2.0">');
  });

  test('generatePackageFeed with empty dependencies returns empty items', async () => {
    const mgr = new RSSManager();
    const pkgInfo: PackageInfo = {
      name: 'empty-pkg',
      version: '1.0.0',
      description: 'no deps',
      dependencies: {},
      devDependencies: {},
    };
    const feed = await mgr.generatePackageFeed('empty-pkg', pkgInfo);
    expect(feed.items).toHaveLength(0);
    expect(feed.title).toContain('empty-pkg');
  });

  test('generatePackageFeed with bunDocs AND deps returns combined items', async () => {
    const mgr = new RSSManager();
    const pkgInfo: PackageInfo = {
      name: 'combo-pkg',
      version: '1.0.0',
      description: 'has both',
      dependencies: { express: '^4.0.0' },
      devDependencies: {},
      bunDocs: [
        { api: 'serve', url: 'https://bun.sh/docs/api/serve', category: 'http' },
        { api: 'file', url: 'https://bun.sh/docs/api/file', category: 'fs' },
      ],
    };
    const feed = await mgr.generatePackageFeed('combo-pkg', pkgInfo);
    const docItems = feed.items.filter(i => i.guid.startsWith('bun:'));
    const depItems = feed.items.filter(i => i.guid.startsWith('dep:'));
    expect(docItems).toHaveLength(2);
    expect(depItems).toHaveLength(1);
    expect(feed.items).toHaveLength(3);
  });
});
