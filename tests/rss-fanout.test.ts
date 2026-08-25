import { describe, expect, test } from 'bun:test';
import {
  buildRSSFanout,
  strongRSSDocumentETag,
  type RSSChannelContract,
  type VersionedRSSItem,
} from '../lib/rss/rss-fanout.ts';
import { parseRSSFeed } from '../lib/rss/rss-xml.ts';
import { asFeedId } from '../lib/types/branded.ts';

const all = asFeedId('all');
const runtime = asFeedId('runtime');
const shared = asFeedId('release-1');

const channels: RSSChannelContract[] = [
  {
    key: runtime,
    schemaVersion: 3,
    endpoint: new URL('https://example.test/feeds/v3/runtime.xml'),
    title: 'Runtime',
    site: new URL('https://example.test/runtime'),
    description: 'Runtime updates',
  },
  {
    key: all,
    schemaVersion: 3,
    endpoint: new URL('https://example.test/feeds/v3/all.xml'),
    title: 'All updates',
    site: new URL('https://example.test/'),
    description: 'Every update',
  },
];

const items: VersionedRSSItem[] = [
  {
    guid: asFeedId('release-2'),
    channelKeys: [all],
    title: 'Second',
    link: 'https://example.test/releases/2',
    description: 'Second release',
    pubDate: '2026-08-24T11:00:00Z',
    revisionDate: '2026-08-24T13:00:00Z',
  },
  {
    guid: shared,
    channelKeys: [runtime, all],
    title: 'First',
    link: 'https://example.test/releases/1',
    description: 'First release',
    pubDate: '2026-08-24T11:00:00Z',
    revisionDate: '2026-08-24T12:00:00Z',
    category: ['zeta', 'alpha'],
  },
];

describe('versioned RSS fan-out', () => {
  test('emits one deterministic RSS 2.0 document per versioned endpoint', () => {
    const first = buildRSSFanout(channels, items);
    const reordered = buildRSSFanout([...channels].reverse(), [...items].reverse());

    expect(first).toEqual(reordered);
    expect(first.map(document => document.endpoint)).toEqual([
      'https://example.test/feeds/v3/all.xml',
      'https://example.test/feeds/v3/runtime.xml',
    ]);
    for (const document of first) {
      const compact = Bun.XML.parse(document.xml) as { rss: Record<string, unknown> };
      expect(compact.rss['@version']).toBe('2.0');
      expect(compact.rss.channel).not.toBeArray();
      expect(document.schemaVersion).toBe(3);
    }
  });

  test('keeps GUIDs stable and orders by pubDate desc then GUID asc', () => {
    const [aggregate, topic] = buildRSSFanout(channels, items);
    expect(aggregate).toBeDefined();
    expect(topic).toBeDefined();

    const aggregateFeed = parseRSSFeed(aggregate!.xml);
    const topicFeed = parseRSSFeed(topic!.xml);
    expect(aggregateFeed.items.map(item => item.guid)).toEqual(['release-1', 'release-2']);
    expect(topicFeed.items.map(item => item.guid)).toEqual(['release-1']);
    expect(aggregateFeed.items[0]?.guid).toBe(topicFeed.items[0]?.guid);
    expect(aggregateFeed.items[0]?.category).toEqual(['alpha', 'zeta']);
  });

  test('derives dates and a full strong SHA-256 ETag from emitted bytes', () => {
    const [aggregate, topic] = buildRSSFanout(channels, items);
    expect(aggregate?.lastModified).toBe('Mon, 24 Aug 2026 13:00:00 GMT');
    expect(topic?.lastModified).toBe('Mon, 24 Aug 2026 12:00:00 GMT');
    expect(parseRSSFeed(aggregate!.xml).lastBuildDate).toBe(aggregate?.lastModified);
    expect(aggregate?.etag).toMatch(/^"[0-9a-f]{64}"$/);
    expect(aggregate?.etag).toBe(strongRSSDocumentETag(aggregate!.xml));
    const digest = new Bun.CryptoHasher('sha256')
      .update(new TextEncoder().encode(aggregate!.xml))
      .digest('hex');
    expect(aggregate?.etag).toBe(`"${digest}"`);
    expect(aggregate?.byteLength).toBe(new TextEncoder().encode(aggregate!.xml).byteLength);
  });

  test('rejects ambiguous channel identity and item revisions', () => {
    expect(() => buildRSSFanout([channels[0]!, channels[0]!], items)).toThrow('Duplicate');
    expect(() =>
      buildRSSFanout(channels, [{ ...items[0]!, revisionDate: 'not-a-date' }])
    ).toThrow('revisionDate requires an absolute timestamp');
    expect(() =>
      buildRSSFanout(channels, [{ ...items[0]!, pubDate: '2026-08-24T11:00:00' }])
    ).toThrow('pubDate requires an absolute timestamp');
    expect(() =>
      buildRSSFanout(channels, [{ ...items[0]!, channelKeys: [asFeedId('missing')] }])
    ).toThrow('Unknown RSS channel');
  });
});
