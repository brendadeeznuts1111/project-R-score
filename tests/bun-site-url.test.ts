// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — all URLPatternInit components
// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  BunBlogIndexPattern,
  BunBlogPattern,
  BunComSite,
  BunDocsPattern,
  BunReferencePattern,
  CANONICAL_SOURCES,
  bunBlog,
  bunDocs,
  bunReference,
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

  test('hrefFromInit assigns all URLPatternInit URL components', () => {
    const href = hrefFromInit({
      ...BunComSite,
      username: 'reader',
      password: 'token',
      port: '8443',
      pathname: '/blog/bun-v1.3.4',
      search: 'source=harness',
      hash: 'urlpattern-api',
    });
    const u = new URL(href);
    expect(u.protocol).toBe('https:');
    expect(u.username).toBe('reader');
    expect(u.password).toBe('token');
    expect(u.hostname).toBe('bun.com');
    expect(u.port).toBe('8443');
    expect(u.pathname).toBe('/blog/bun-v1.3.4');
    expect(u.search).toBe('?source=harness');
    expect(u.hash).toBe('#urlpattern-api');
  });

  test('BunDocsPattern / BunBlogPattern match com and sh hosts', () => {
    expect(BunDocsPattern.test(bunDocs('runtime/utils', 'bun-env'))).toBe(true);
    expect(BunDocsPattern.test('https://bun.sh/docs/runtime/utils')).toBe(true);
    expect(BunBlogPattern.test(bunBlog('bun-v1.3.4', 'urlpattern-api'))).toBe(true);
  });

  test('BunDocsPattern rejects spoofed hosts (literal dots in hostname group)', () => {
    expect(BunDocsPattern.test('https://bunXcom/docs/x')).toBe(false);
    expect(BunDocsPattern.test('https://bun-com/docs/x')).toBe(false);
    expect(BunBlogPattern.test('https://bunXcom/blog/x')).toBe(false);
    expect(BunReferencePattern.test('https://bun-com/reference/x')).toBe(false);
  });

  test('bunReference preserves inline # fragments', () => {
    expect(bunReference('runtime/fetch#timeout')).toBe('https://bun.com/reference/runtime/fetch#timeout');
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

  test('CANONICAL_SOURCES.blog is parts-only and matches BunBlogIndexPattern', () => {
    expect(CANONICAL_SOURCES.blog.protocol).toBe('https');
    expect(CANONICAL_SOURCES.blog.hostname).toBe('bun.com');
    expect(CANONICAL_SOURCES.blog.pathname).toBe('/blog');
    const href = hrefFromInit(CANONICAL_SOURCES.blog);
    expect(BunBlogIndexPattern.test(href)).toBe(true);
  });
});
