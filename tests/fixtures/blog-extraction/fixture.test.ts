/**
 * @see https://bun.com/docs/runtime/html-rewriter
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api
 *
 * Blog extraction: strip anchors, exclude header/footer from article body.
 * Social metadata is ratcheted by social-metadata-boundaries.
 */
import { describe, expect, test } from 'bun:test';
import { extractArticleText, stripUrlFragment } from '../../../lib/docs/blog-extract.ts';
import { bunBlog } from '../../../lib/docs/bun-site-url.ts';

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Bun v1.3.14</title>
</head>
<body>
  <nav>Header nav links</nav>
  <main>
    <article>
      <h1>Bun v1.3.14</h1>
      <p>WebView is now built-in.</p>
    </article>
  </main>
  <footer>Copyright Bun</footer>
</body>
</html>`;

describe('blog-extraction-boundaries', () => {
  test('extractArticleText excludes nav and footer', async () => {
    const text = await extractArticleText(SAMPLE_HTML);
    expect(text).not.toContain('Header nav links');
    expect(text).not.toContain('Copyright Bun');
    expect(text).toContain('WebView is now built-in.');
  });

  test('stripUrlFragment drops # before fetch', () => {
    const withHash = bunBlog('bun-v1.3.14', 'comments');
    const cleaned = stripUrlFragment(withHash);
    expect(cleaned).toBe(bunBlog('bun-v1.3.14'));
    expect(cleaned).not.toContain('#');
  });

  test('fragment strip is idempotent for article text base', async () => {
    const a = await extractArticleText(SAMPLE_HTML);
    const b = await extractArticleText(SAMPLE_HTML);
    expect(stripUrlFragment(bunBlog('bun-v1.3.14', 'section'))).toBe(bunBlog('bun-v1.3.14'));
    expect(a).toBe(b);
  });
});
