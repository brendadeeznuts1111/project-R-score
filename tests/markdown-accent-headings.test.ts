// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
import { describe, expect, test } from 'bun:test';
import { createTrustedAccentHeadingCallback } from '../lib/markdown/accent-headings.ts';

describe('trusted Markdown accent headings', () => {
  test('derives heading level and cycles a canonical Bun.color palette', () => {
    const html = Bun.markdown.render(
      '# One\n\n### Three\n\n###### Six',
      { heading: createTrustedAccentHeadingCallback(['#ff1f8f', '#1f8fff']) },
      { headings: { ids: true } }
    );
    expect(html).toContain('<h1 id="one" style="color:rgb(255 31 143)');
    expect(html).toContain('<h3 id="three" style="color:rgb(255 31 143)');
    expect(html).toContain('<h6 id="six" style="color:rgb(31 143 255)');
  });

  test('escapes heading ids while preserving composed trusted children', () => {
    const heading = createTrustedAccentHeadingCallback(['rgb(88 166 255)']);
    expect(heading('<strong>safe</strong>', { level: 2, id: 'x" onmouseover="bad' })).toBe(
      '<h2 id="x&quot; onmouseover=&quot;bad" style="color:rgb(88 166 255);border-block-end:2px solid rgb(88 166 255)"><strong>safe</strong></h2>'
    );
  });

  test('rejects empty, invalid, and CSS-injection palettes', () => {
    expect(() => createTrustedAccentHeadingCallback([])).toThrow(/must not be empty/);
    expect(() => createTrustedAccentHeadingCallback(['not-a-color'])).toThrow(/Invalid accent/);
    expect(() => createTrustedAccentHeadingCallback(['red;display:none'])).toThrow(/Invalid accent/);
  });
});
