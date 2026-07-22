/**
 * @see https://bun.com/docs/runtime/html-rewriter
 *
 * Blog extraction: exclude header/footer from article body.
 * Fragment strip + page fetch: fetch-page-boundaries.
 * Social metadata: social-metadata-boundaries.
 */
import { describe, expect, test } from 'bun:test';
import { extractArticleText } from '../../../lib/docs/blog-extract.ts';

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

  test('extractArticleText is deterministic for same HTML', async () => {
    const a = await extractArticleText(SAMPLE_HTML);
    const b = await extractArticleText(SAMPLE_HTML);
    expect(a).toBe(b);
  });
});
