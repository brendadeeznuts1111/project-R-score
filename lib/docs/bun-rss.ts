// @see https://bun.com/docs/runtime/xml — Bun.XML.parse compact shape
// @see https://bun.com/rss.xml — Bun release / changelog RSS 2.0 (not HTML blog)
/**
 * Shared Bun.com RSS channel item extraction (RSS operate plane).
 *
 * Prefer Bun.XML; regex fallback for odd fixtures. Callers map fields into
 * release-index / contracts / MCP shapes — do not duplicate channel walks.
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

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

/** Decode RSS/XML text entities + strip CDATA wrappers. */
export function decodeRssXmlText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, 16))
    )
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number.parseInt(digits, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? entity)
    .trim();
}

function regexItemField(block: string, tag: string): string {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
  return decodeRssXmlText(match?.[1] ?? '');
}

function itemFromXmlRecord(item: Record<string, unknown>): RssChannelItem {
  return {
    title: parseXmlText(item.title),
    link: parseXmlText(item.link),
    guid: parseXmlText(item.guid),
    pubDate: parseXmlText(item.pubDate),
    description: parseXmlText(item.description),
  };
}

function parseRssChannelItemsViaBunXml(xml: string): RssChannelItem[] | null {
  let doc: unknown;
  try {
    doc = Bun.XML.parse(xml);
  } catch {
    return null;
  }
  if (!doc || typeof doc !== 'object') return null;
  const root = doc as Record<string, unknown>;
  const rss = (root.rss ?? root) as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  if (!channel) return null;
  const items = parseXmlElementList(channel.item);
  if (items.length === 0) return null;
  return items.map(itemFromXmlRecord);
}

function parseRssChannelItemsViaRegex(xml: string): RssChannelItem[] {
  const out: RssChannelItem[] = [];
  for (const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const block = match[1]!;
    out.push({
      title: regexItemField(block, 'title'),
      link: regexItemField(block, 'link'),
      guid: regexItemField(block, 'guid'),
      pubDate: regexItemField(block, 'pubDate'),
      description: regexItemField(block, 'description'),
    });
  }
  return out;
}

/**
 * RSS 2.0 channel `<item>` rows from bun.com/rss.xml (or fixtures).
 * Bun.XML first; regex fallback when the DOM path yields nothing.
 */
export function parseRssChannelItems(xml: string): RssChannelItem[] {
  return parseRssChannelItemsViaBunXml(xml) ?? parseRssChannelItemsViaRegex(xml);
}
