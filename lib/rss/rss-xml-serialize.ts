// @see https://bun.com/reference/bun/XML/stringify — Bun.XML.stringify
// @released Bun.XML.stringify · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
// @see https://bun.com/docs/runtime/xml — Bun.XML.stringify
// @see https://www.rssboard.org/rss-specification — channel image and enclosure
// @see https://www.rssboard.org/media-rss — Media RSS 1.5.1

import type { RSSFeed, RSSFeedItem, RSSMediaContent } from './rss-types.ts';

const ATOM_NAMESPACE = 'http://www.w3.org/2005/Atom';
const MEDIA_NAMESPACE = 'http://search.yahoo.com/mrss/';

function guidValue(item: RSSFeedItem): unknown {
  if (!item.guid) return undefined;
  try {
    const url = new URL(item.guid);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password) {
      return item.guid;
    }
  } catch {
    // Opaque GUIDs are explicitly marked below.
  }
  return { '@isPermaLink': 'false', '#text': item.guid };
}

function thumbnailValue(media: RSSMediaContent): unknown {
  if (!media.thumbnail) return undefined;
  return {
    '@url': media.thumbnail.url,
    '@width': media.thumbnail.width,
    '@height': media.thumbnail.height,
  };
}

function mediaContentValue(media: RSSMediaContent): unknown {
  if (!media.url) return undefined;
  return {
    '@url': media.url,
    '@fileSize': media.fileSize,
    '@type': media.type,
    '@medium': media.medium,
    '@expression': media.expression,
    '@width': media.width,
    '@height': media.height,
    'media:player': media.playerUrl ? { '@url': media.playerUrl } : undefined,
  };
}

function itemValue(item: RSSFeedItem): Record<string, unknown> {
  const media = item.media;
  return {
    title: item.title || undefined,
    link: item.link || undefined,
    description: item.description || undefined,
    pubDate: item.pubDate || undefined,
    guid: guidValue(item),
    author: item.author,
    category: item.category,
    enclosure: item.enclosure
      ? {
          '@url': item.enclosure.url,
          '@length': item.enclosure.length,
          '@type': item.enclosure.type,
        }
      : undefined,
    'media:content': media ? mediaContentValue(media) : undefined,
    'media:player':
      media?.playerUrl && !media.url
        ? { '@url': media.playerUrl, '@width': media.width, '@height': media.height }
        : undefined,
    'media:thumbnail': media ? thumbnailValue(media) : undefined,
    'media:credit': media?.credits?.map(credit => ({
      '@role': credit.role,
      '#text': credit.value,
    })),
  };
}

export function generateRSS(feed: RSSFeed): string {
  const hasMedia = feed.items.some(item => item.media !== undefined);
  const body = Bun.XML.stringify({
    rss: {
      '@version': '2.0',
      '@xmlns:atom': feed.selfUrl ? ATOM_NAMESPACE : undefined,
      '@xmlns:media': hasMedia ? MEDIA_NAMESPACE : undefined,
      channel: {
        title: feed.title,
        link: feed.link,
        description: feed.description,
        'atom:link': feed.selfUrl
          ? { '@href': feed.selfUrl, '@rel': 'self', '@type': 'application/rss+xml' }
          : undefined,
        image: feed.image,
        lastBuildDate: feed.lastBuildDate || undefined,
        ttl: feed.ttl,
        item: feed.items.map(itemValue),
      },
    },
  });
  if (!body) throw new Error('Unable to serialize RSS feed');
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}
