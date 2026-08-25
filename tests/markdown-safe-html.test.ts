// @see https://bun.com/blog/bun-v1.4#bun-markdown — Bun.markdown HTML is unsanitized
import { describe, expect, test } from 'bun:test';
import { renderReadmeHTML } from '../lib/factory/markdown.ts';
import { markdownSafeHtml } from '../lib/markdown/safe-html.ts';

describe('untrusted Bun.markdown HTML boundary', () => {
  test('renders GFM while escaping raw HTML', () => {
    const html = markdownSafeHtml('# Safe\n\n<script>alert(1)</script>\n\n**kept**');
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>kept</strong>');
    expect(html.toLowerCase()).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
  });

  test('removes executable and data URL schemes from links and images', () => {
    const html = markdownSafeHtml(
      '[js](javascript:alert(1)) [encoded](javascript&#58;alert(1)) ' +
        '![data](data:text/html,x) [safe](https://bun.com) [relative](/portal/)'
    );
    expect(html).not.toMatch(/(?:javascript|data):/i);
    expect(html.match(/data-unsafe-url="removed"/g)).toHaveLength(3);
    expect(html).toContain('href="https://bun.com"');
    expect(html).toContain('href="/portal/"');
  });

  test('uses the same safe boundary for fetched README rendering', () => {
    const html = renderReadmeHTML(
      '# Package\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))'
    );
    expect(html.toLowerCase()).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('data-unsafe-url="removed"');
  });
});
