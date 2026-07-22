// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPatternInit protocol/hostname
import { describe, expect, test } from 'bun:test';
import {
  BunBlogPattern,
  BunComSite,
  BunDocsPattern,
  bunBlog,
  bunDocs,
  guideKeyFromUrl,
  hrefFromInit,
  mdnWebApi,
  parseBunSiteUrl,
} from '../lib/docs/bun-site-url.ts';

describe('bun-site-url (URLPatternInit components)', () => {
  test('BunComSite exposes protocol + hostname fragments', () => {
    expect(BunComSite.protocol).toBe('https');
    expect(BunComSite.hostname).toBe('bun.com');
  });

  test('hrefFromInit sets protocol/hostname/pathname/hash on URL', () => {
    const href = hrefFromInit({
      ...BunComSite,
      pathname: '/blog/bun-v1.3.4',
      hash: 'urlpattern-api',
    });
    expect(href).toBe(bunBlog('bun-v1.3.4', 'urlpattern-api'));
    const u = new URL(href);
    expect(u.protocol).toBe('https:');
    expect(u.hostname).toBe('bun.com');
    expect(u.pathname).toBe('/blog/bun-v1.3.4');
    expect(u.hash).toBe('#urlpattern-api');
  });

  test('BunDocsPattern / BunBlogPattern match com and sh hosts', () => {
    expect(BunDocsPattern.test(bunDocs('runtime/utils', 'bun-env'))).toBe(true);
    expect(BunDocsPattern.test('https://bun.sh/docs/runtime/utils')).toBe(true);
    expect(BunBlogPattern.test(bunBlog('bun-v1.3.4', 'urlpattern-api'))).toBe(true);
  });

  test('parseBunSiteUrl returns pathname groups + hash', () => {
    const docs = parseBunSiteUrl(bunDocs('guides/runtime/set-env'));
    expect(docs?.kind).toBe('docs');
    expect(docs?.path).toBe('guides/runtime/set-env');

    const blog = parseBunSiteUrl(bunBlog('bun-v1.3.4', 'urlpattern-api'));
    expect(blog?.kind).toBe('blog');
    expect(blog?.path).toBe('blog/bun-v1.3.4#urlpattern-api');
    expect(blog?.hash).toBe('urlpattern-api');
  });

  test('guideKeyFromUrl keeps blog hash keys for GUIDE_EXAMPLES', () => {
    expect(guideKeyFromUrl(bunBlog('bun-v1.3.4', 'urlpattern-api'), { keepHash: true })).toBe(
      'blog/bun-v1.3.4#urlpattern-api'
    );
    expect(guideKeyFromUrl(bunDocs('runtime#transpilation-language-features'), { keepHash: true })).toBe(
      'runtime#transpilation-language-features'
    );
  });

  test('mdnWebApi builds from MdnSite components', () => {
    expect(mdnWebApi('URLPattern')).toContain('developer.mozilla.org');
    expect(mdnWebApi('URLPattern')).toContain('/Web/API/URLPattern');
  });
});
