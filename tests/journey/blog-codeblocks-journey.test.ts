/**
 * Journey: CANONICAL_SOURCES.blog → fetchPostHtml → extractCodeBlocks on live v1.3.6 post.
 *
 * @see https://bun.com/blog/bun-v1.3.6
 * @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request
 *
 *   bun test tests/journey/blog-codeblocks-journey.test.ts
 */
import { describe, expect, test } from 'bun:test';
import { dns } from 'bun';
import {
  bunBlog,
  BunBlogPattern,
  BunComSite,
  hrefFromInit,
  CANONICAL_SOURCES,
} from '../../lib/docs/bun-site-url.ts';
import { extractCodeBlocks, filterBlocks } from '../../tools/bun-blog-codeblocks.ts';
import { fetchPostHtml } from '../../tools/bun-docs-releases.ts';

const POST_URL = bunBlog('bun-v1.3.6');

dns.prefetch(BunComSite.hostname);

describe('blog-codeblocks journey', () => {
  test('CANONICAL_SOURCES post URL matches BunBlogPattern', () => {
    const postUrl = hrefFromInit({
      ...CANONICAL_SOURCES.blog,
      pathname: `${CANONICAL_SOURCES.blog.pathname}/bun-v1.3.6`,
    });
    expect(BunBlogPattern.test(postUrl)).toBe(true);
    expect(postUrl).toBe(POST_URL);
  });

  test(
    'fetchPostHtml → extractCodeBlocks yields ≥30 CodeBlock regions',
    async () => {
      const html = await fetchPostHtml(POST_URL);
      expect(html.length).toBeGreaterThan(10_000);

      const { codeBlockCount, codeBlockTabCount } = extractCodeBlocks(html);
      expect(codeBlockCount).toBeGreaterThanOrEqual(30);
      expect(codeBlockTabCount).toBeGreaterThan(0);

      const archive = filterBlocks(extractCodeBlocks(html).blocks, { grep: 'Bun.Archive' });
      expect(archive.length).toBeGreaterThanOrEqual(3);
      expect(archive[0]?.code).toContain('new Bun.Archive({');
    },
    { timeout: 30_000 }
  );
});
