// @see https://bun.com/docs/runtime/markdown#options
// @see https://bun.com/docs/runtime/markdown#heading-ids
// @see https://bun.com/docs/runtime/markdown#autolinks
import { describe, expect, test } from 'bun:test';
import {
  MARKDOWN_OPTION_CATALOG,
  MARKDOWN_OPTIONS_DEFAULTS,
  MARKDOWN_PRESET_DESIGN,
  MARKDOWN_PRESET_PORTAL,
  MARKDOWN_PRESET_README,
  MARKDOWN_PRESET_SECURE,
  markdownHtml,
  mergeMarkdownOptions,
} from '../lib/markdown/options.ts';
import { PORTAL_MARKDOWN_PARSER } from '../lib/http/portal-skill-detail.ts';
import { renderReadmeHTML } from '../lib/factory/markdown.ts';

describe('MARKDOWN_OPTION_CATALOG', () => {
  test('lists all 15 documented options with defaults', () => {
    expect(MARKDOWN_OPTION_CATALOG).toHaveLength(15);
    expect(MARKDOWN_OPTION_CATALOG.map(r => r.option)).toEqual([
      'tables',
      'strikethrough',
      'tasklists',
      'autolinks',
      'headings',
      'hardSoftBreaks',
      'wikiLinks',
      'underline',
      'latexMath',
      'collapseWhitespace',
      'permissiveAtxHeaders',
      'noIndentedCodeBlocks',
      'noHtmlBlocks',
      'noHtmlSpans',
      'tagFilter',
    ]);
    const gfmOn = MARKDOWN_OPTION_CATALOG.filter(r => r.default === true).map(r => r.option);
    expect(gfmOn).toEqual(['tables', 'strikethrough', 'tasklists']);
  });

  test('MARKDOWN_OPTIONS_DEFAULTS matches catalog defaults for booleans', () => {
    expect(MARKDOWN_OPTIONS_DEFAULTS.tables).toBe(true);
    expect(MARKDOWN_OPTIONS_DEFAULTS.strikethrough).toBe(true);
    expect(MARKDOWN_OPTIONS_DEFAULTS.tasklists).toBe(true);
    expect(MARKDOWN_OPTIONS_DEFAULTS.tagFilter).toBe(false);
    expect(MARKDOWN_OPTIONS_DEFAULTS.wikiLinks).toBe(false);
    expect(MARKDOWN_OPTIONS_DEFAULTS.latexMath).toBe(false);
    expect(MARKDOWN_OPTIONS_DEFAULTS.headings).toBe(false);
    expect(MARKDOWN_OPTIONS_DEFAULTS.autolinks).toBe(false);
  });
});

describe('Bun.markdown.Options live contract (docs table)', () => {
  test('headings: true → id + nested autolink anchor', () => {
    const html = markdownHtml('## Hello World', { headings: true });
    expect(html).toContain('id="hello-world"');
    expect(html).toContain('href="#hello-world"');
  });

  test('headings: { ids: true } → id only, no nested a', () => {
    const html = markdownHtml('## Hello World', { headings: { ids: true } });
    expect(html).toContain('<h2 id="hello-world">Hello World</h2>');
    expect(html).not.toContain('<a href="#hello-world">');
  });

  test('autolinks: true turns bare URL into anchor', () => {
    const html = markdownHtml('Visit https://example.com', { autolinks: true });
    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
  });

  test('autolinks object can enable www only style url', () => {
    const html = markdownHtml('Visit https://example.com', {
      autolinks: { url: true, www: false, email: false },
    });
    expect(html).toContain('href="https://example.com"');
  });

  test('wikiLinks: true emits x-wikilink', () => {
    const html = markdownHtml('See [[Some Page]]', { wikiLinks: true });
    expect(html).toContain('x-wikilink');
    expect(html).toContain('data-target="Some Page"');
  });

  test('wikiLinks: false leaves brackets', () => {
    const html = markdownHtml('See [[Some Page]]', { wikiLinks: false });
    expect(html).toContain('[[Some Page]]');
  });

  test('GFM defaults: tables · strikethrough · tasklists without opts', () => {
    const md = `| a | b |\n| --- | --- |\n| 1 | ~~x~~ |\n\n- [x] done`;
    const html = markdownHtml(md, {});
    expect(html).toContain('<table');
    expect(html).toMatch(/<del>|~~/); // strikethrough
    expect(html.toLowerCase()).toMatch(/checkbox|task|checked|\[x\]|<li/i);
  });

  test('tagFilter escapes disallowed tags when enabled', () => {
    const html = markdownHtml('<script>alert(1)</script>\n\nHi', { tagFilter: true });
    // GFM tag filter typically entity-escapes or neutralizes script
    expect(html.toLowerCase()).not.toMatch(/<script>/);
  });

  test('blog-era headingIds is a no-op (regression lock)', () => {
    const dead = Bun.markdown.html('## Hello World', {
      // @ts-expect-error intentional obsolete blog alias
      headingIds: true,
    });
    expect(dead).not.toContain('id="hello-world"');
    const live = markdownHtml('## Hello World', { headings: { ids: true } });
    expect(live).toContain('id="hello-world"');
  });
});

describe('presets', () => {
  test('PORTAL_MARKDOWN_PARSER is MARKDOWN_PRESET_PORTAL', () => {
    expect(PORTAL_MARKDOWN_PARSER).toEqual(MARKDOWN_PRESET_PORTAL);
  });

  test('MARKDOWN_PRESET_PORTAL yields heading id + autolink URL', () => {
    const html = markdownHtml('## Title\n\nhttps://bun.com', MARKDOWN_PRESET_PORTAL);
    expect(html).toContain('id="title"');
    expect(html).toContain('href="https://bun.com"');
  });

  test('MARKDOWN_PRESET_README matches renderReadmeHTML', () => {
    const md = '## Hi\n\nhttps://example.com';
    expect(renderReadmeHTML(md)).toBe(markdownHtml(md, MARKDOWN_PRESET_README));
  });

  test('MARKDOWN_PRESET_SECURE has ids without nested heading link', () => {
    const html = markdownHtml('## Sec\n\n<script>x</script>', MARKDOWN_PRESET_SECURE);
    expect(html).toContain('id="sec"');
    expect(html).not.toContain('<a href="#sec">');
  });

  test('MARKDOWN_PRESET_DESIGN enables wikiLinks', () => {
    const html = markdownHtml('[[Doc]]', MARKDOWN_PRESET_DESIGN);
    expect(html).toContain('x-wikilink');
  });

  test('mergeMarkdownOptions overrides shallowly', () => {
    const merged = mergeMarkdownOptions(MARKDOWN_PRESET_README, {
      headings: { ids: true },
    });
    expect(merged.headings).toEqual({ ids: true });
    expect(merged.tagFilter).toBe(true);
  });
});
