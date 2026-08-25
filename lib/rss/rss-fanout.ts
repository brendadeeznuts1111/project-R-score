// @see https://bun.com/docs/runtime/xml — serialization is owned by rss-xml.ts
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — exact-byte SHA-256

import type { FeedId } from '../types/branded.ts';
import { generateRSS, type RSSChannelImage, type RSSFeed, type RSSFeedItem } from './rss-xml.ts';

export interface RSSChannelContract {
  key: FeedId;
  schemaVersion: number;
  endpoint: URL;
  title: string;
  site: URL;
  description: string;
  ttl?: number;
  image?: RSSChannelImage;
}

export interface VersionedRSSItem extends Omit<RSSFeedItem, 'guid'> {
  guid: FeedId;
  channelKeys: readonly FeedId[];
  revisionDate: string;
}

export interface RSSChannelDocument {
  key: FeedId;
  schemaVersion: number;
  endpoint: string;
  xml: string;
  etag: string;
  lastModified: string;
  byteLength: number;
}

type DatedItem = { item: VersionedRSSItem; publishedMs: number; revisedMs: number };

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function parseDate(value: string, field: string, guid: FeedId): number {
  const normalized = value.trim();
  if (!/(?:Z|GMT|[+-]\d{2}:?\d{2})$/i.test(normalized)) {
    throw new Error(`${field} requires an absolute timestamp for RSS item ${guid}`);
  }
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) throw new Error(`${field} is invalid for RSS item ${guid}`);
  return timestamp;
}

function validateChannels(channels: readonly RSSChannelContract[]): RSSChannelContract[] {
  const keys = new Set<FeedId>();
  const endpoints = new Set<string>();
  for (const channel of channels) {
    if (keys.has(channel.key)) throw new Error(`Duplicate RSS channel key: ${channel.key}`);
    if (endpoints.has(channel.endpoint.href)) {
      throw new Error(`Duplicate RSS channel endpoint: ${channel.endpoint.href}`);
    }
    if (!Number.isSafeInteger(channel.schemaVersion) || channel.schemaVersion < 1) {
      throw new Error(`RSS channel ${channel.key} requires a positive schema version`);
    }
    if (channel.ttl !== undefined && (!Number.isSafeInteger(channel.ttl) || channel.ttl < 1)) {
      throw new Error(`RSS channel ${channel.key} requires a positive ttl`);
    }
    keys.add(channel.key);
    endpoints.add(channel.endpoint.href);
  }
  return [...channels].sort((left, right) => compareText(left.endpoint.href, right.endpoint.href));
}

function normalizeItems(
  items: readonly VersionedRSSItem[],
  channelKeys: ReadonlySet<FeedId>
): DatedItem[] {
  const guids = new Set<FeedId>();
  return items.map(item => {
    if (guids.has(item.guid)) throw new Error(`Duplicate RSS item GUID: ${item.guid}`);
    for (const key of item.channelKeys) {
      if (!channelKeys.has(key))
        throw new Error(`Unknown RSS channel ${key} for item ${item.guid}`);
    }
    guids.add(item.guid);
    return {
      item,
      publishedMs: parseDate(item.pubDate, 'pubDate', item.guid),
      revisedMs: parseDate(item.revisionDate, 'revisionDate', item.guid),
    };
  });
}

function toFeed(channel: RSSChannelContract, datedItems: readonly DatedItem[]): RSSFeed {
  const selected = datedItems
    .filter(({ item }) => item.channelKeys.includes(channel.key))
    .sort(
      (left, right) =>
        right.publishedMs - left.publishedMs || compareText(left.item.guid, right.item.guid)
    );
  const latestRevision = selected.reduce(
    (latest, candidate) => Math.max(latest, candidate.revisedMs),
    Number.NEGATIVE_INFINITY
  );
  const rssItems: RSSFeedItem[] = selected.map(({ item, publishedMs }) => ({
    title: item.title,
    link: item.link,
    description: item.description,
    pubDate: new Date(publishedMs).toUTCString(),
    author: item.author,
    category: item.category ? [...item.category].sort(compareText) : undefined,
    guid: item.guid,
    enclosure: item.enclosure,
    media: item.media,
  }));
  return {
    title: channel.title,
    link: channel.site.href,
    description: channel.description,
    items: rssItems,
    lastBuildDate:
      latestRevision === Number.NEGATIVE_INFINITY ? '' : new Date(latestRevision).toUTCString(),
    ttl: channel.ttl ?? 60,
    selfUrl: channel.endpoint.href,
    image: channel.image,
  };
}

export function strongRSSDocumentETag(xml: string): string {
  const bytes = new TextEncoder().encode(xml);
  const digest = new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
  return `"${digest}"`;
}

export function buildRSSFanout(
  channels: readonly RSSChannelContract[],
  items: readonly VersionedRSSItem[]
): RSSChannelDocument[] {
  const orderedChannels = validateChannels(channels);
  const datedItems = normalizeItems(items, new Set(orderedChannels.map(channel => channel.key)));
  return orderedChannels.map(channel => {
    const feed = toFeed(channel, datedItems);
    const xml = generateRSS(feed);
    return {
      key: channel.key,
      schemaVersion: channel.schemaVersion,
      endpoint: channel.endpoint.href,
      xml,
      etag: strongRSSDocumentETag(xml),
      lastModified: feed.lastBuildDate,
      byteLength: new TextEncoder().encode(xml).byteLength,
    };
  });
}
