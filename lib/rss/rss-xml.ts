// @see https://bun.com/reference/bun/XML/parse — Bun.XML.parse
// @released Bun.XML.parse · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
// @see https://bun.com/docs/runtime/xml — Bun.XML.parse / Bun.XML.stringify
// @see https://www.rssboard.org/rss-specification — RSS 2.0
// @see https://www.rssboard.org/media-rss — Media RSS 1.5.1

import { assertNoRssDoctype, type RSSXmlInput } from './rss-xml-input.ts';
import { parseAtomSelfUrl } from './rss-atom.ts';
import { itemImageCandidate } from './rss-media-validation.ts';
import type { RSSChannelImage, RSSFeed, RSSFeedItem } from './rss-types.ts';
import {
  absoluteHttpUrl,
  assertRssDate,
  assertSingletons,
  isXmlRecord,
  parseXmlElements,
  parseXmlInteger,
  parseXmlText,
  requiredText,
  type XmlRecord,
} from './rss-xml-validation.ts';

const CHANNEL_SINGLETONS = [
  'title',
  'link',
  'description',
  'language',
  'copyright',
  'managingEditor',
  'webMaster',
  'pubDate',
  'lastBuildDate',
  'generator',
  'docs',
  'cloud',
  'ttl',
  'image',
  'rating',
  'textInput',
  'skipHours',
  'skipDays',
] as const;
const ITEM_SINGLETONS = [
  'title',
  'link',
  'description',
  'source',
  'enclosure',
  'guid',
  'pubDate',
  'author',
  'comments',
] as const;

export type { RSSXmlInput } from './rss-xml-input.ts';
export type {
  RSSChannelImage,
  RSSEnclosure,
  RSSFeed,
  RSSFeedItem,
  RSSMediaContent,
  RSSMediaCredit,
  RSSMediaThumbnail,
} from './rss-types.ts';
export { generateRSS } from './rss-xml-serialize.ts';

function optionalDate(record: XmlRecord, field: string, context: string): string {
  const value = parseXmlText(record[field]);
  if (value) assertRssDate(value, `${context} <${field}>`);
  return value;
}

function itemGuid(item: XmlRecord, link: string, context: string): string {
  if (item.guid === undefined) return link;
  const guid = requiredText(item, 'guid', context);
  const flag = isXmlRecord(item.guid) ? item.guid['@isPermaLink'] : undefined;
  if (flag !== undefined && flag !== 'true' && flag !== 'false') {
    throw new Error(`${context} guid@isPermaLink must be true or false`);
  }
  if (flag !== 'false') absoluteHttpUrl(guid, `${context} permalink GUID`);
  return guid;
}

function categories(item: XmlRecord): string[] | undefined {
  const values =
    item.category === undefined
      ? []
      : Array.isArray(item.category)
        ? item.category
        : [item.category];
  const normalized = values.map(parseXmlText).filter(Boolean);
  return normalized.length ? normalized : undefined;
}

function parseItem(
  item: XmlRecord,
  index: number,
  root: XmlRecord,
  channel: XmlRecord
): RSSFeedItem {
  const context = `RSS item ${index + 1}`;
  assertSingletons(item, ITEM_SINGLETONS, context);
  const title = parseXmlText(item.title);
  const description = parseXmlText(item.description);
  if (!title && !description) throw new Error(`${context} requires <title> or <description>`);
  const link = parseXmlText(item.link);
  if (link) absoluteHttpUrl(link, `${context} <link>`);
  const pubDate = optionalDate(item, 'pubDate', context);
  const candidate = itemImageCandidate(item, [root, channel], context);
  return {
    title,
    link,
    description,
    pubDate,
    author: parseXmlText(item.author) || undefined,
    category: categories(item),
    guid: itemGuid(item, link, context),
    imageUrl: candidate?.url,
    imageSource: candidate?.source,
  };
}

function channelImage(channel: XmlRecord): RSSChannelImage | undefined {
  if (channel.image === undefined) return undefined;
  if (!isXmlRecord(channel.image)) throw new Error('RSS channel <image> must contain elements');
  const image = channel.image;
  assertSingletons(
    image,
    ['url', 'title', 'link', 'width', 'height', 'description'],
    'RSS channel image'
  );
  const url = requiredText(image, 'url', 'RSS channel image');
  const link = requiredText(image, 'link', 'RSS channel image');
  absoluteHttpUrl(url, 'RSS channel image <url>');
  absoluteHttpUrl(link, 'RSS channel image <link>');
  const width =
    image.width === undefined
      ? undefined
      : parseXmlInteger(image.width, 'RSS channel image <width>', { min: 1 });
  const height =
    image.height === undefined
      ? undefined
      : parseXmlInteger(image.height, 'RSS channel image <height>', { min: 1 });
  if (width !== undefined && width > 144) {
    throw new Error('RSS channel image <width> must be <= 144');
  }
  if (height !== undefined && height > 400) {
    throw new Error('RSS channel image <height> must be <= 400');
  }
  return {
    url,
    title: requiredText(image, 'title', 'RSS channel image'),
    link,
    width,
    height,
    description: parseXmlText(image.description) || undefined,
  };
}

export function parseRSSFeed(input: RSSXmlInput): RSSFeed {
  assertNoRssDoctype(input);
  const document: unknown = Bun.XML.parse(input);
  if (!isXmlRecord(document) || !isXmlRecord(document.rss)) {
    throw new Error('Expected one RSS root');
  }
  const root = document.rss;
  if (root['@version'] !== '2.0') throw new Error('RSS version must be 2.0');
  if (!isXmlRecord(root.channel)) throw new Error('RSS requires exactly one channel');
  const channel = root.channel;
  assertSingletons(channel, CHANNEL_SINGLETONS, 'RSS channel');
  const title = requiredText(channel, 'title', 'RSS channel');
  const link = requiredText(channel, 'link', 'RSS channel');
  absoluteHttpUrl(link, 'RSS channel <link>');
  const description = requiredText(channel, 'description', 'RSS channel');
  const pubDate = optionalDate(channel, 'pubDate', 'RSS channel');
  const lastBuildDate = optionalDate(channel, 'lastBuildDate', 'RSS channel') || pubDate;
  const ttl = parseXmlInteger(channel.ttl, 'RSS channel <ttl>', { min: 1, fallback: 60 });
  return {
    title,
    link,
    description,
    items: parseXmlElements(channel.item, 'channel item').map((item, index) =>
      parseItem(item, index, root, channel)
    ),
    lastBuildDate,
    ttl,
    selfUrl: parseAtomSelfUrl(root, channel),
    image: channelImage(channel),
  };
}
