// @see https://bun.com/docs/runtime/xml — Bun.XML

import { describe, expect, test } from 'bun:test';
import { generateRSS, parseRSSFeed, type RSSFeed } from '../lib/rss/rss-xml.ts';

const BASE = `<rss version="2.0"><channel>
  <title>Updates</title><link>https://example.com</link><description>News</description>
  <item><title>One</title><link>https://example.com/one</link><description>Text</description>
  <guid>https://example.com/one</guid><pubDate>Mon, 24 Aug 2026 20:42:00 GMT</pubDate></item>
</channel></rss>`;

describe('native RSS XML boundary', () => {
  test('parses through Bun.XML and keeps missing optional dates deterministic', () => {
    const parsed = parseRSSFeed(BASE);
    expect(parsed.title).toBe('Updates');
    expect(parsed.link).toBe('https://example.com');
    expect(parsed.description).toBe('News');
    expect(parsed.lastBuildDate).toBe('');
    expect(parsed.ttl).toBe(60);
    expect(parsed.items[0]?.pubDate).toBe('Mon, 24 Aug 2026 20:42:00 GMT');
  });

  test('fails closed on malformed XML, DTDs, and invalid RSS structure', () => {
    expect(() => parseRSSFeed('<rss><channel></rss>')).toThrow(SyntaxError);
    expect(() => parseRSSFeed('<feed/>')).toThrow('one RSS root');
    expect(() => parseRSSFeed('<rss version="1.0"><channel/></rss>')).toThrow(
      'version must be 2.0'
    );
    expect(() => parseRSSFeed(`<!DOCTYPE rss><rss version="2.0"><channel/></rss>`)).toThrow(
      'must not contain a DOCTYPE'
    );
  });

  test('requires the exact Media RSS namespace before interpreting media keys', () => {
    const item = `<item><title>One</title><link>https://example.com/one</link>
      <media:thumbnail url="https://cdn.example.com/a.png" /></item>`;
    const channel = `<channel><title>Updates</title><link>https://example.com</link>
      <description>News</description>${item}</channel>`;
    expect(() => parseRSSFeed(`<rss version="2.0">${channel}</rss>`)).toThrow(
      'require the Media RSS'
    );
    expect(() =>
      parseRSSFeed(
        `<rss version="2.0" xmlns:media="https://attacker.test/media">${channel}</rss>`
      )
    ).toThrow('require the Media RSS');
    const feed = parseRSSFeed(
      `<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">${channel}</rss>`
    );
    expect(feed.items[0]?.imageUrl).toBe('https://cdn.example.com/a.png');
  });

  test('serializes with Bun.XML escaping and one category element per value', () => {
    const feed: RSSFeed = {
      title: 'A & B',
      link: 'https://example.com/',
      description: '<updates>',
      lastBuildDate: 'Mon, 24 Aug 2026 20:42:00 GMT',
      ttl: 60,
      items: [
        {
          title: 'One < Two',
          link: 'https://example.com/one?a=1&b=2',
          description: 'Safe & escaped',
          pubDate: 'Mon, 24 Aug 2026 20:42:00 GMT',
          guid: 'urn:example:item:one',
          category: ['runtime', 'images'],
        },
      ],
    };
    const xml = generateRSS(feed);
    expect(xml).toStartWith('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('A &amp; B');
    expect(xml).toContain('One &lt; Two');
    expect(xml).toContain('<guid isPermaLink="false">urn:example:item:one</guid>');
    expect(xml.match(/<category>/g)).toHaveLength(2);
    expect(parseRSSFeed(xml).items[0]?.category).toEqual(['runtime', 'images']);
    expect(generateRSS(feed)).toBe(xml);
  });
});
