import { describe, expect, test } from 'bun:test';
import { MARKDOWN_PRESET_PORTAL, markdownHtml } from '../lib/markdown/options.ts';
import { renderPortalMarkdownPage } from '../lib/http/portal-markdown.ts';

describe('portal markdown parser (GFM extras)', () => {
  test('MARKDOWN_PRESET_PORTAL enables headings + wikiLinks + latexMath', () => {
    expect(MARKDOWN_PRESET_PORTAL).toMatchObject({
      tables: true,
      strikethrough: true,
      tasklists: true,
      tagFilter: true,
      autolinks: true,
      headings: true,
      wikiLinks: true,
      latexMath: true,
    });
  });

  test('renderPortalMarkdownPage uses the shared parser (heading ids present)', () => {
    const html = renderPortalMarkdownPage('ops');
    // "# Ops" → <h1 id="ops"><a href="#ops"> (headings: true from the preset)
    expect(html).toContain('id="ops"');
    expect(html).toMatch(/<a href="#ops">/);
  });

  test('wikiLinks render through markdownHtml with the portal preset', () => {
    const html = markdownHtml('# A [[Target]] page', MARKDOWN_PRESET_PORTAL);
    expect(html).toContain('x-wikilink');
    expect(html).toContain('data-target="Target"');
  });
});
