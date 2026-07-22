/**
 * MCP blog ingestion uses extract-metadata SSOT (name= and property= og tags).
 *
 * @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api
 */
import { describe, expect, test } from 'bun:test';
import {
  BUN_BLOG_BASE,
  BUN_DOCS_BASE,
  buildBlogUrl,
  buildDocUrl,
  parseBlogPostFromHtml,
} from '../tools/bun-docs-mcp-lib.ts';
import { BunComSite, CANONICAL_SOURCES, hrefFromInit, bunBlog, bunDocs } from '../lib/docs/bun-site-url.ts';

describe('bun-docs-mcp blog SSOT', () => {
  test('roots and builders come from CANONICAL_SOURCES parts', () => {
    expect(BUN_DOCS_BASE).toBe(hrefFromInit(CANONICAL_SOURCES.docs).replace(/\/$/, ''));
    expect(BUN_BLOG_BASE).toBe(hrefFromInit(CANONICAL_SOURCES.blog).replace(/\/$/, ''));
    expect(buildDocUrl('runtime/html-rewriter')).toBe(bunDocs('runtime/html-rewriter'));
    expect(buildBlogUrl('bun-v1.3.4')).toBe(bunBlog('bun-v1.3.4'));
  });

  test('parseBlogPostFromHtml reads name="og:*" (bun.com shape)', async () => {
    const url = bunBlog('bun-v1.3.4');
    const image = hrefFromInit({ ...BunComSite, pathname: '/og/blog/bun-v1.3.4.png' });
    const html = `<!DOCTYPE html>
<html><head>
  <meta name="og:title" content="Bun v1.3.4" />
  <meta name="og:description" content="URLPattern API and more" />
  <meta name="og:image" content="${image}" />
</head>
<body>
  <nav>Navigation</nav>
  <article><h1>Bun v1.3.4</h1><p>URLPattern landed.</p></article>
  <footer>Copyright</footer>
</body></html>`;

    const post = await parseBlogPostFromHtml(html, 'bun-v1.3.4', `${url}#section`);
    expect(post.title).toBe('Bun v1.3.4');
    expect(post.description).toBe('URLPattern API and more');
    expect(post.image).toBe(image);
    expect(post.url).toBe(url);
    expect(post.content).toContain('URLPattern landed');
    expect(post.content).not.toContain('Navigation');
  });
});
