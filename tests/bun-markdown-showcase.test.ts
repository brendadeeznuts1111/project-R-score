/**
 * Smoke coverage for tools/bun-markdown-showcase.ts — docs catalog runners.
 * @see https://bun.com/docs/runtime/markdown
 * @see https://bun.com/blog/bun-v1.3.11
 * @see https://bun.com/blog/bun-v1.3.12#render-markdown-in-the-terminal-with-bun-file-md
 */
import { describe, expect, test } from 'bun:test';
import {
  ANSI_THEME_CATALOG,
  LIST_ITEM_META_BREAKING,
  LIST_ITEM_META_CATALOG,
  LIST_META_CATALOG,
  MARKDOWN_DOC_EXAMPLES,
  buildShowcaseHtml,
  filterExamples,
  parseShowcaseArgs,
  runAllExamples,
  runExample,
  serializeReactLike,
} from '../tools/bun-markdown-showcase.ts';

describe('bun-markdown-showcase catalog', () => {
  test('exports the planned example ids', () => {
    const ids = MARKDOWN_DOC_EXAMPLES.map(e => e.id);
    expect(ids).toContain('html-basic');
    expect(ids).toContain('html-gfm');
    expect(ids).toContain('html-options');
    expect(ids).toContain('html-autolinks-all');
    expect(ids).toContain('html-autolinks-granular');
    expect(ids).toContain('html-headings-true');
    expect(ids).toContain('html-headings-ids');
    expect(ids).toContain('html-wiki-math');
    expect(ids).toContain('html-parser-flags');
    expect(ids).toContain('render-custom');
    expect(ids).toContain('render-classes');
    expect(ids).toContain('render-plaintext');
    expect(ids).toContain('render-omit-images');
    expect(ids).toContain('render-ansi-callbacks');
    expect(ids).toContain('render-nested-lists');
    expect(ids).toContain('render-nested-lists-roman');
    expect(ids).toContain('render-listitem-meta');
    expect(ids).toContain('render-code-lang');
    expect(ids).toContain('render-parser-options');
    expect(ids).toContain('react-inspect');
    expect(ids).toContain('react-to-string');
    expect(ids).toContain('react-overrides');
    expect(ids).toContain('react-version-18');
    expect(ids).toContain('react-parser-options');
    expect(ids).toContain('ansi-default');
    expect(ids).toContain('ansi-plain');
    expect(ids).toContain('ansi-light');
    expect(ids).toContain('ansi-hyperlinks');
    expect(ids).toContain('ansi-columns');
    expect(ids).toContain('ansi-kitty');
    expect(ids).toContain('ansi-file-md');
    expect(ids).toContain('ansi-slice');
    expect(ids).toContain('preset-portal');
    expect(ids).toContain('preset-readme');
    expect(ids).toContain('preset-secure');
    expect(ids).toContain('preset-design');
    expect(ids.length).toBe(36);
  });

  test('listItem / list meta catalogs match blog shape', () => {
    expect(LIST_ITEM_META_CATALOG.map(r => r.property)).toEqual([
      'index',
      'depth',
      'ordered',
      'start',
      'checked',
    ]);
    expect(LIST_META_CATALOG.map(r => r.property)).toEqual(['ordered', 'depth', 'start']);
    expect(LIST_ITEM_META_BREAKING).toContain('always receives meta');
  });

  test('AnsiTheme catalog covers blog knobs', () => {
    expect(ANSI_THEME_CATALOG.map(r => r.property)).toEqual([
      'colors',
      'hyperlinks',
      'columns',
      'kittyGraphics',
      'light',
    ]);
  });

  test('every example runs without throw', async () => {
    for (const ex of MARKDOWN_DOC_EXAMPLES) {
      const result = await runExample(ex);
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.kind).toBeTruthy();
    }
  });

  test('core html docs samples match expected substrings', async () => {
    const byId = Object.fromEntries(
      (await runAllExamples()).map(({ example, result }) => [example.id, result])
    );

    expect(byId['html-basic']!.html).toContain('<h1>Hello <strong>world</strong></h1>');
    expect(byId['html-gfm']!.html).toContain('<table>');
    expect(byId['html-gfm']!.html).toContain('<del>done</del>');
    expect(byId['html-gfm']!.html).toContain('task-list-item');
    expect(byId['html-headings-ids']!.html).toContain('id="hello-world"');
    expect(byId['html-headings-true']!.html).toContain('href="#hello-world"');
    expect(byId['html-options']!.html).toContain('&lt;script>');
    expect(byId['html-options']!.html).toContain('https://example.com');
  });

  test('nested lists blog example uses a. markers', async () => {
    const result = await runExample(
      MARKDOWN_DOC_EXAMPLES.find(e => e.id === 'render-nested-lists')!
    );
    expect(result.text).toContain('1. first');
    expect(result.text).toContain('a. sub-a');
    expect(result.text).toContain('b. sub-b');
    expect(result.text).toContain('2. second');
  });

  test('listitem meta probe includes ordered and checked rows', async () => {
    const result = await runExample(
      MARKDOWN_DOC_EXAMPLES.find(e => e.id === 'render-listitem-meta')!
    );
    expect(result.text).toContain('"ordered":true');
    expect(result.text).toContain('"checked":true');
    expect(result.text).toContain('"checked":false');
    expect(result.text).toContain('list ');
    expect(result.html).toContain('<table>');
    expect(result.html).toContain('index');
  });

  test('ansi theme blog samples', async () => {
    const byId = Object.fromEntries(
      (await runAllExamples()).map(({ example, result }) => [example.id, result])
    );
    expect(byId['ansi-plain']!.text).toContain('hasEsc=false');
    expect(byId['ansi-plain']!.text).toContain('Hello');
    expect(byId['ansi-light']!.text).toContain('Hello');
    expect(byId['ansi-hyperlinks']!.text).toContain('docs');
    expect(byId['ansi-columns']!.text).toContain('lines=');
    expect(byId['ansi-kitty']!.text).toContain('bytes=');
    expect(byId['ansi-file-md']!.text).toContain('cli=bun ./AGENTS.md');
    expect(byId['html-wiki-math']!.html).toContain('x-wikilink');
    expect(byId['html-parser-flags']!.html).toContain('<h1>NoSpace</h1>');
    expect(byId['html-parser-flags']!.html).toContain('&lt;b&gt;');
    expect(byId['html-parser-flags']!.html).not.toContain('<pre>');
  });

  test('ansi-slice reports visual width and ellipsis', async () => {
    const result = await runExample(MARKDOWN_DOC_EXAMPLES.find(e => e.id === 'ansi-slice')!);
    expect(result.text).toContain('slice(0,28');
    expect(result.text).toContain('…');
    expect(result.text).toContain('stripANSI=');
  });

  test('buildShowcaseHtml includes AnsiTheme reference', async () => {
    const page = buildShowcaseHtml(await runAllExamples());
    expect(page).toContain('AnsiTheme');
    expect(page).toContain('kittyGraphics');
    expect(page).toContain('bun ./file.md');
  });

  test('render omit-images drops img.png', async () => {
    const result = await runExample(
      MARKDOWN_DOC_EXAMPLES.find(e => e.id === 'render-omit-images')!
    );
    expect(result.text).not.toContain('img.png');
    expect(result.text).toContain('Title');
    expect(result.text).toContain('Hello');
  });

  test('serializeReactLike walks Bun.markdown.react trees', () => {
    const el = Bun.markdown.react('# Hello **world**');
    const html = serializeReactLike(el);
    expect(html).toContain('<h1>');
    expect(html).toContain('<strong>world</strong>');
  });

  test('buildShowcaseHtml includes meta ref and every example id', async () => {
    const rows = await runAllExamples();
    const page = buildShowcaseHtml(rows);
    expect(page).toContain('<!DOCTYPE html>');
    expect(page).toContain('id="listitem-meta-ref"');
    expect(page).toContain('always receives meta');
    for (const { example } of rows) {
      expect(page).toContain(`id="${example.id}"`);
    }
  });

  test('parseShowcaseArgs', () => {
    expect(parseShowcaseArgs(['--cli-only'])).toEqual({
      cliOnly: true,
      htmlOnly: false,
      open: false,
      list: false,
      ids: [],
    });
    expect(parseShowcaseArgs(['--html-only', '--open', '--id=ansi-light'])).toEqual({
      cliOnly: false,
      htmlOnly: true,
      open: true,
      list: false,
      ids: ['ansi-light'],
    });
    expect(parseShowcaseArgs(['--list', '--id', 'html-basic']).list).toBe(true);
    expect(parseShowcaseArgs(['--id', 'html-basic']).ids).toEqual(['html-basic']);
  });

  test('filterExamples selects by id', () => {
    const hit = filterExamples(['ansi-plain', 'html-basic']);
    expect(hit.map(e => e.id)).toEqual(['html-basic', 'ansi-plain']);
    expect(() => filterExamples(['nope'])).toThrow(/No examples match/);
  });
});
