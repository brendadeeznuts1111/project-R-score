// @see https://bun.com/reference/bun/XML/parse — Bun.XML.parse
// @released Bun.XML.parse · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
// @see https://bun.com/docs/runtime/xml — Bun.XML.parse compact shape
// @see https://bun.com/rss.xml — Bun release / changelog RSS 2.0 (not HTML blog)
/**
 * Shared Bun.com RSS channel item extraction (RSS operate plane).
 *
 * Parse strictly with Bun.XML. Callers map fields into release-index /
 * contracts / MCP shapes — do not duplicate channel walks.
 * Do not treat this feed as the HTML blog index (`CANONICAL_SOURCES.blog`).
 */
import { parseXmlElementList, parseXmlText } from './bun-blog-url.ts';

export type RssChannelItem = {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  description: string;
};

function requiredText(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (Array.isArray(value)) throw new Error(`${context} <${key}> must not repeat`);
  const text = parseXmlText(value);
  if (!text) throw new Error(`${context} requires a non-empty <${key}>`);
  return text;
}

function itemFromXmlRecord(item: Record<string, unknown>, index: number): RssChannelItem {
  const context = `RSS channel item ${index + 1}`;
  return {
    title: requiredText(item, 'title', context),
    link: requiredText(item, 'link', context),
    guid: requiredText(item, 'guid', context),
    pubDate: requiredText(item, 'pubDate', context),
    description: requiredText(item, 'description', context),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** RSS 2.0 channel `<item>` rows from a strict Bun.XML compact document. */
export function parseRssChannelItems(xml: string): RssChannelItem[] {
  // Live-feed policy is intentionally narrower than Bun.XML's native support.
  // Bun does not fetch external entities, but a DTD can still alter the compact
  // value through internal entities/default attributes. Bun.com does not emit one.
  if (xml.includes('<!DOCTYPE')) throw new Error('RSS live feeds must not contain a DOCTYPE');
  const doc: unknown = Bun.XML.parse(xml);
  if (!isRecord(doc)) throw new Error('RSS document must parse to one root object');
  const root = doc as Record<string, unknown>;
  if (!isRecord(root.rss)) throw new Error('RSS document must have one <rss> root');
  const rss = root.rss;
  if (rss['@version'] !== '2.0') throw new Error('RSS root version must be 2.0');
  if (!isRecord(rss.channel)) throw new Error('RSS document must have exactly one <channel>');
  const channel = rss.channel;
  requiredText(channel, 'title', 'RSS channel');
  requiredText(channel, 'link', 'RSS channel');
  requiredText(channel, 'description', 'RSS channel');
  const rawItems = channel.item;
  if (rawItems !== undefined && !isRecord(rawItems) && !Array.isArray(rawItems)) {
    throw new Error('RSS <item> must be one or more element objects');
  }
  if (Array.isArray(rawItems) && rawItems.some(item => !isRecord(item))) {
    throw new Error('RSS <item> must be one or more element objects');
  }
  const items = parseXmlElementList(rawItems);
  return items.map(itemFromXmlRecord);
}
