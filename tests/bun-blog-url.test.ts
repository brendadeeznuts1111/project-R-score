// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  blogUrlForReleaseVersion,
  canonicalizeBunBlogUrl,
  expandBunMinorVersion,
  parseRssPubDateToIso,
  parseXmlElementList,
  parseXmlText,
  requireCanonicalBunBlogUrl,
  versionFromBunBlogUrl,
} from '../lib/docs/bun-blog-url.ts';

describe('bun-blog-url', () => {
  test('expands minor versions and maps RSS + sitemap locs', () => {
    expect(expandBunMinorVersion('1.4')).toBe('1.4.0');
    expect(versionFromBunBlogUrl('https://bun.com/blog/bun-v1.4')).toBe('1.4.0');
    expect(versionFromBunBlogUrl('https://bun.com/blog/bun-v1.3.14')).toBe('1.3.14');
    expect(versionFromBunBlogUrl('https://bun.com/blog/release-notes/bun-v1.4.0')).toBe('1.4.0');
    expect(versionFromBunBlogUrl('https://bun.sh/blog/release-notes/bun-v1.3.14')).toBe('1.3.14');
    expect(versionFromBunBlogUrl('https://bun.com/blog/bun-in-rust')).toBeNull();
  });

  test('canonicalizes to marketing/RSS blog URLs', () => {
    expect(blogUrlForReleaseVersion('1.4.0')).toBe('https://bun.com/blog/bun-v1.4');
    expect(blogUrlForReleaseVersion('0.6.0')).toBe('https://bun.com/blog/bun-v0.6.0');
    expect(canonicalizeBunBlogUrl('https://bun.com/blog/release-notes/bun-v1.4.0')).toBe(
      'https://bun.com/blog/bun-v1.4'
    );
    expect(canonicalizeBunBlogUrl('https://bun.sh/blog/bun-v1.3.14')).toBe(
      'https://bun.com/blog/bun-v1.3.14'
    );
    expect(requireCanonicalBunBlogUrl('https://bun.com/blog/release-notes/bun-v1.4.0', '1.4.0')).toBe(
      'https://bun.com/blog/bun-v1.4'
    );
    expect(requireCanonicalBunBlogUrl('https://bun.com/blog/bun-v1.4.0', '1.4.0')).toBe(
      'https://bun.com/blog/bun-v1.4'
    );
    expect(() =>
      requireCanonicalBunBlogUrl('https://bun.com/blog/bun-v1.3.14', '1.4.0')
    ).toThrow('official Bun release post');
  });

  test('normalizes Bun.XML list/scalar and RSS pubDate to ISO', () => {
    expect(parseXmlElementList(null)).toEqual([]);
    expect(parseXmlElementList({ loc: 'a' })).toEqual([{ loc: 'a' }]);
    expect(parseXmlElementList([{ loc: 'a' }, { loc: 'b' }])).toHaveLength(2);
    expect(parseXmlText(' hi ')).toBe('hi');
    expect(parseXmlText({ '#text': 'x' })).toBe('x');
    expect(parseRssPubDateToIso('Thu, 20 Aug 2026 00:53:44 GMT')).toBe('2026-08-20T00:53:44.000Z');
    expect(parseRssPubDateToIso('not-a-date')).toBeNull();
  });
});
