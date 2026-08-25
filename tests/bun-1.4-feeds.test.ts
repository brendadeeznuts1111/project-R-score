// @see https://www.rssboard.org/rss-specification — RSS 2.0
// @see https://www.rssboard.org/media-rss — Media RSS 1.5.1

import { describe, expect, test } from 'bun:test';
import { parseRSSFeed } from '../lib/rss/rss-xml.ts';
import {
  capabilitiesByAsset,
  readCapabilityRegistry,
} from '../tools/bun-blog-assets/capabilities.ts';
import { buildBun14AssetFeeds } from '../tools/bun-blog-assets/feed.ts';
import { buildMediaRights, parseRightsApprovalEvidence } from '../tools/bun-blog-assets/rights.ts';
import { readManifest } from '../tools/bun-blog-assets/storage.ts';

type XmlRecord = Record<string, unknown>;

function records(value: unknown): XmlRecord[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]) as XmlRecord[];
}

function text(value: unknown): string {
  if (typeof value === 'string') return value;
  return typeof value === 'object' && value !== null
    ? String((value as XmlRecord)['#text'] ?? '')
    : '';
}

describe('Bun 1.4 versioned media feeds', () => {
  test('fans all 26 assets into four single-channel RSS documents', async () => {
    const manifest = await readManifest('public/registry/bun-1.4-assets.json');
    const capabilities = await readCapabilityRegistry(manifest);
    const documents = buildBun14AssetFeeds(manifest, capabilities);
    expect(documents.map(document => new URL(document.endpoint).pathname)).toEqual([
      '/feeds/v1/all.xml',
      '/feeds/v1/embeds.xml',
      '/feeds/v1/images.xml',
      '/feeds/v1/videos.xml',
    ]);

    const expectedCounts = new Map([
      ['all.xml', 26],
      ['embeds.xml', 1],
      ['images.xml', 21],
      ['videos.xml', 4],
    ]);
    for (const document of documents) {
      const path = new URL(document.endpoint).pathname;
      const name = path.split('/').at(-1)!;
      const parsed = parseRSSFeed(new TextEncoder().encode(document.xml));
      expect(parsed.items).toHaveLength(expectedCounts.get(name)!);
      expect(parsed.lastBuildDate).toBe('Thu, 20 Aug 2026 00:53:44 GMT');
      expect(parsed.selfUrl).toBe(document.endpoint);
      expect(parsed.image).toEqual(
        expect.objectContaining({
          url: 'https://bun.com/og/blog/bun-v1.4.png',
          width: 144,
          height: 76,
        })
      );

      const root = (Bun.XML.parse(document.xml) as { rss: XmlRecord }).rss;
      expect(root['@version']).toBe('2.0');
      expect(root['@xmlns:atom']).toBe('http://www.w3.org/2005/Atom');
      expect(root['@xmlns:media']).toBe('http://search.yahoo.com/mrss/');
      expect(root.channel).not.toBeArray();
      const channel = root.channel as XmlRecord;
      expect((channel['atom:link'] as XmlRecord)['@href']).toBe(document.endpoint);
      expect((channel['atom:link'] as XmlRecord)['@rel']).toBe('self');
      expect(document.schemaVersion).toBe(1);
      expect(document.etag).toMatch(/^"[a-f0-9]{64}"$/);
    }
  });

  test('prunes a retired manifest item from every active channel projection', async () => {
    const manifest = await readManifest('public/registry/bun-1.4-assets.json');
    const capabilities = await readCapabilityRegistry(manifest);
    const retiredAssetId = 'bun-1.4-bun-audit-fix';
    const nextManifest = structuredClone(manifest);
    nextManifest.assets = nextManifest.assets.filter(asset => asset.id !== retiredAssetId);
    nextManifest.counts.total -= 1;
    nextManifest.counts.video -= 1;

    const documents = buildBun14AssetFeeds(nextManifest, capabilities);
    const itemIdsByFeed = new Map(
      documents.map(document => [
        new URL(document.endpoint).pathname,
        parseRSSFeed(new TextEncoder().encode(document.xml)).items.map(item => item.guid),
      ])
    );
    const retiredGuid = `bun-1.4:asset:${retiredAssetId}`;

    expect(itemIdsByFeed.get('/feeds/v1/all.xml')).toHaveLength(25);
    expect(itemIdsByFeed.get('/feeds/v1/videos.xml')).toHaveLength(3);
    expect(itemIdsByFeed.get('/feeds/v1/images.xml')).toHaveLength(21);
    expect(itemIdsByFeed.get('/feeds/v1/embeds.xml')).toHaveLength(1);
    for (const itemIds of itemIdsByFeed.values()) expect(itemIds).not.toContain(retiredGuid);
  });

  test('keeps GUIDs stable and emits attributed direct media shapes', async () => {
    const manifest = await readManifest('public/registry/bun-1.4-assets.json');
    const capabilities = await readCapabilityRegistry(manifest);
    const documents = buildBun14AssetFeeds(manifest, capabilities);
    const byName = new Map(
      documents.map(document => [new URL(document.endpoint).pathname.split('/').at(-1), document])
    );
    const xmlItems = (name: string) => {
      const xml = byName.get(name)!.xml;
      const root = (Bun.XML.parse(xml) as { rss: { channel: XmlRecord } }).rss;
      return records(root.channel.item);
    };
    const guids = (name: string) => xmlItems(name).map(item => text(item.guid));
    const allGuids = new Set(guids('all.xml'));
    for (const name of ['images.xml', 'videos.xml', 'embeds.xml']) {
      for (const guid of guids(name)) expect(allGuids.has(guid)).toBe(true);
    }

    const relationIndex = capabilitiesByAsset(capabilities);
    for (const item of xmlItems('all.xml')) {
      const assetId = text(item.guid).replace('bun-1.4:asset:', '');
      const actual = records(item.category)
        .map(text)
        .filter(category => category.startsWith('bun:capability:'))
        .sort();
      const expected = (relationIndex.get(assetId) ?? [])
        .map(capability => `bun:capability:${capability.id}`)
        .sort();
      expect(actual).toEqual(expected);
    }

    for (const item of xmlItems('videos.xml')) {
      const enclosure = item.enclosure as XmlRecord;
      const content = item['media:content'] as XmlRecord;
      const thumbnail = item['media:thumbnail'] as XmlRecord;
      const credit = item['media:credit'] as XmlRecord;
      expect(enclosure['@type']).toBe('video/mp4');
      expect(enclosure['@length']).toMatch(/^\d+$/);
      expect(content['@url']).toBe(enclosure['@url']);
      expect(content['@medium']).toBe('video');
      expect(String(thumbnail['@url'])).toContain('-poster.jpg');
      expect(credit).toEqual(expect.objectContaining({ '@role': 'publisher', '#text': 'Bun' }));
    }

    const embed = xmlItems('embeds.xml')[0]!;
    expect(embed.enclosure).toBeUndefined();
    expect(embed['media:content']).toBeUndefined();
    expect((embed['media:player'] as XmlRecord)['@url']).toStartWith('https://');

    const auditItem = xmlItems('videos.xml').find(item =>
      text(item.guid).endsWith('bun-1.4-bun-audit-fix')
    )!;
    expect(records(auditItem.category).map(text)).toContain('bun:capability:bun-audit-fix');
    expect(records(auditItem.category).map(text)).toContain('bun:chapter:bun-install');
    const timingItem = xmlItems('images.xml').find(item =>
      text(item.guid).endsWith('bun-1.4-test-timings')
    )!;
    expect(records(timingItem.category).map(text)).toContain('bun:chapter:bun-test');
    const cgroupItem = xmlItems('videos.xml').find(item =>
      text(item.guid).endsWith('bun-1.4-spawn-cgroup')
    )!;
    expect(records(cgroupItem.category).map(text)).toContain('bun:capability:bun-spawn-cgroup');
  });

  test('committed feed bytes are exactly reproducible from the manifest', async () => {
    const manifest = await readManifest('public/registry/bun-1.4-assets.json');
    const capabilities = await readCapabilityRegistry(manifest);
    for (const document of buildBun14AssetFeeds(manifest, capabilities)) {
      const path = `public${new URL(document.endpoint).pathname}`;
      expect(await Bun.file(path).text()).toBe(document.xml);
    }
    const pagesHeaders = await Bun.file('public/_headers').text();
    const localServer = await Bun.file('scripts/serve-public.ts').text();
    expect(pagesHeaders).toContain('/feeds/v1/*.xml');
    expect(pagesHeaders).toContain('Content-Type: application/rss+xml; charset=utf-8');
    expect(localServer).toContain("path.startsWith('/feeds/v1/')");
  });

  test('resolves approved local media to absolute feed URLs', async () => {
    const manifest = await readManifest('public/registry/bun-1.4-assets.json');
    const capabilities = await readCapabilityRegistry(manifest);
    const approved = structuredClone(manifest);
    approved.rightsStatus = 'approved';
    approved.rights = buildMediaRights(
      'approved',
      parseRightsApprovalEvidence({
        schemaVersion: 1,
        scope: 'bun-1.4-release-blog-media',
        status: 'approved',
        approvalId: 'feed-fixture',
        approvedBy: 'Test fixture',
        approvedAt: '2026-08-25T00:00:00.000Z',
        evidenceUrl: 'https://example.com/evidence/feed-fixture',
        sourcePage: 'https://bun.com/blog/bun-v1.4',
      })
    );
    for (const asset of approved.assets) {
      if (asset.kind === 'embed') continue;
      asset.localUrl = `/portal/bun-1.4/media/${asset.id}`;
      asset.publicUrl = asset.localUrl;
    }
    const document = buildBun14AssetFeeds(approved, capabilities)[0]!;
    const root = (Bun.XML.parse(document.xml) as { rss: { channel: XmlRecord } }).rss;
    const image = root.channel.image as XmlRecord;
    const firstItem = records(root.channel.item)[0]!;
    expect(image.url).toStartWith('https://score.factory-wager.com/');
    expect((firstItem.enclosure as XmlRecord)['@url']).toStartWith(
      'https://score.factory-wager.com/'
    );
  });
});
