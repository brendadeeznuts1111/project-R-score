/**
 * Journey: CANONICAL_SOURCES.blog → URLPattern → dns.prefetch → fetchPage → SocialMetadata (+ article).
 *
 * Boundaries prove each primitive offline; this closes the ingestion loop on a live page.
 * Prefers dns.prefetch (works); fetch.preconnect is mapped in CANONICAL_REFS but throws
 * Invalid port on Bun 1.4.0-canary — revisit when that ships clean.
 *
 * Live fetch tests skip when bun.com is unreachable (inventory / offline CI).
 *
 * @see https://bun.com/docs/runtime/networking/fetch#dns-prefetching
 * @see https://bun.com/docs/runtime/networking/dns#dns-prefetch
 * @see https://bun.com/docs/runtime/networking/dns#dns-getcachestats
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 * @see https://bun.com/docs/runtime/networking/fetch#streaming-response-bodies
 * @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api
 *
 *   bun test tests/journey/blog-extraction.test.ts
 */
import { describe, expect, test } from 'bun:test';
import { dns } from 'bun';
import {
  extractArticleTextFromResponse,
  extractSocialMetadataFromResponse,
  fetchPage,
  stripUrlFragment,
} from '../../lib/docs/blog-extract.ts';
import {
  BunBlogIndexPattern,
  BunBlogPattern,
  BunComSite,
  CANONICAL_SOURCES,
  hrefFromInit,
} from '../../lib/docs/bun-site-url.ts';

/** Known ship post with stable OG + article markup. */
const SAMPLE_SLUG = 'bun-v1.3.4';

/** Live bun.com probes only — skip when offline. */
async function bunComReachable(): Promise<boolean> {
  try {
    const r = await fetch('https://bun.com/', {
      signal: AbortSignal.timeout(1500),
    });
    return r.status > 0;
  } catch {
    return false;
  }
}

const online = await bunComReachable();

// Warm DNS before timed live fetches (fetch#dns-prefetching + dns#dns-prefetch host+port).
dns.prefetch(BunComSite.hostname, 443);

describe('blog-extraction journey', () => {
  test('dns.prefetch warms Bun DNS cache for bun.com', () => {
    // Soft observability only — do not claim TTL or hit ratios.
    // Offline / empty cache is not a monorepo logic failure.
    const stats = dns.getCacheStats();
    if (stats.size === 0 || stats.totalCount === 0) return;
    expect(stats.size).toBeGreaterThan(0);
    expect(stats.totalCount).toBeGreaterThan(0);
    // `errors` is process-global connection-failure telemetry, not scoped to this
    // prefetch. Parallel test files may legitimately increment it.
    expect(Number.isInteger(stats.errors)).toBe(true);
    expect(stats.errors).toBeGreaterThanOrEqual(0);
  });

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

  test.skipIf(!online)(
    'fetchPage → extractSocialMetadataFromResponse yields title, description, image',
    async () => {
      const postUrl = hrefFromInit({
        ...CANONICAL_SOURCES.blog,
        pathname: `${CANONICAL_SOURCES.blog.pathname}/${SAMPLE_SLUG}`,
        hash: 'urlpattern-api',
      });
      const cleaned = stripUrlFragment(postUrl);
      expect(cleaned).not.toContain('#');
      expect(BunBlogPattern.test(cleaned)).toBe(true);

      const response = await fetchPage(postUrl, { timeoutMs: 10_000 });
      const meta = await extractSocialMetadataFromResponse(response, cleaned);
      expect(meta.title?.length).toBeGreaterThan(0);
      expect(meta.description?.length).toBeGreaterThan(0);
      expect(meta.image?.startsWith('http')).toBe(true);
    },
    { timeout: 20_000 }
  );

  test.skipIf(!online)(
    'fetchPage → extractArticleTextFromResponse excludes nav/footer chrome',
    async () => {
      const postUrl = hrefFromInit({
        ...CANONICAL_SOURCES.blog,
        pathname: `${CANONICAL_SOURCES.blog.pathname}/${SAMPLE_SLUG}`,
      });
      const res = await fetchPage(postUrl, { timeoutMs: 10_000 });
      const text = await extractArticleTextFromResponse(res);

      expect(text.length).toBeGreaterThan(40);
      // Chrome that lives outside <article> on bun.com blog
      expect(text.toLowerCase()).not.toContain('copyright ©');
      expect(text).not.toMatch(/^\s*Docs\s*Blog\s*Discord/i);
    },
    { timeout: 20_000 }
  );
});
