/**
 * Journey: CANONICAL_SOURCES.blog → URLPattern → fetchPage → SocialMetadata (+ article).
 *
 * Boundaries prove each primitive offline; this closes the ingestion loop on a live page.
 *
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 * @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api
 *
 *   bun test tests/journey/blog-extraction.test.ts
 */
import { describe, expect, test } from 'bun:test';
import {
  extractArticleText,
  extractSocialMetadata,
  stripUrlFragment,
} from '../../lib/docs/blog-extract.ts';
import { fetchPage } from '../../lib/docs/fetch-page.ts';
import {
  BunBlogIndexPattern,
  BunBlogPattern,
  CANONICAL_SOURCES,
  hrefFromInit,
} from '../../lib/docs/bun-site-url.ts';

/** Known ship post with stable OG + article markup. */
const SAMPLE_SLUG = 'bun-v1.3.4';

describe('blog-extraction journey', () => {
  test('URLPattern validates blog index + post derived from CANONICAL_SOURCES', () => {
    const indexUrl = hrefFromInit(CANONICAL_SOURCES.blog);
    expect(BunBlogIndexPattern.test(indexUrl)).toBe(true);
    expect(BunBlogPattern.test(indexUrl)).toBe(false);

    const postUrl = hrefFromInit({
      ...CANONICAL_SOURCES.blog,
      pathname: `${CANONICAL_SOURCES.blog.pathname}/${SAMPLE_SLUG}`,
    });
    expect(BunBlogPattern.test(postUrl)).toBe(true);
    expect(BunBlogPattern.test(`${postUrl}#urlpattern-api`)).toBe(true);
  });

  test(
    'fetch + extractSocialMetadata yields title, description, image',
    async () => {
      const postUrl = hrefFromInit({
        ...CANONICAL_SOURCES.blog,
        pathname: `${CANONICAL_SOURCES.blog.pathname}/${SAMPLE_SLUG}`,
        hash: 'urlpattern-api',
      });
      const cleaned = stripUrlFragment(postUrl);
      expect(cleaned).not.toContain('#');
      expect(BunBlogPattern.test(cleaned)).toBe(true);

      const meta = await extractSocialMetadata(postUrl);
      expect(meta.title?.length).toBeGreaterThan(0);
      expect(meta.description?.length).toBeGreaterThan(0);
      expect(meta.image?.startsWith('http')).toBe(true);
    },
    { timeout: 20_000 }
  );

  test(
    'article text excludes site nav/footer chrome',
    async () => {
      const postUrl = hrefFromInit({
        ...CANONICAL_SOURCES.blog,
        pathname: `${CANONICAL_SOURCES.blog.pathname}/${SAMPLE_SLUG}`,
      });
      const res = await fetchPage(postUrl);
      const html = await res.text();
      const text = await extractArticleText(html);

      expect(text.length).toBeGreaterThan(40);
      // Chrome that lives outside <article> on bun.com blog
      expect(text.toLowerCase()).not.toContain('copyright ©');
      expect(text).not.toMatch(/^\s*Docs\s*Blog\s*Discord/i);
    },
    { timeout: 20_000 }
  );
});
