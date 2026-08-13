// @see https://bun.com/reference/bun/markdown — Bun.markdown type surface
import { afterAll, beforeAll, describe, expect, expectTypeOf, test } from 'bun:test';
import { runMarkdownCheck } from '../scripts/check-docs.ts';

const FIXTURES = {
  valid: 'scratch/markdown-contract-valid.md',
  emptyLink: 'scratch/markdown-contract-empty-link.md',
  malformedTable: 'scratch/markdown-contract-malformed-table.md',
  missingAnchor: 'scratch/markdown-contract-missing-anchor.md',
} as const;

beforeAll(async () => {
  await Promise.all([
    Bun.write(
      FIXTURES.valid,
      '# Valid contract fixture\n\nSee [Details](#details).\n\n## Details\n\n| Rule | State |\n| --- | --- |\n| links | valid |\n'
    ),
    Bun.write(FIXTURES.emptyLink, '# Empty link fixture\n\n[unfinished]()\n'),
    Bun.write(
      FIXTURES.malformedTable,
      '# Malformed table fixture\n\n| Rule | State |\n| --- |\n| links | invalid |\n'
    ),
    Bun.write(
      FIXTURES.missingAnchor,
      '# Missing anchor fixture\n\n[Missing](markdown-contract-valid.md#absent)\n'
    ),
  ]);
});

afterAll(async () => {
  await Promise.all(Object.values(FIXTURES).map(file => Bun.file(file).delete()));
});

describe('Bun.markdown documented surface', () => {
  test('exposes all four synchronous projections', () => {
    expectTypeOf(Bun.markdown.html).toBeFunction();
    expectTypeOf(Bun.markdown.render).toBeFunction();
    expectTypeOf(Bun.markdown.react).toBeFunction();
    expectTypeOf(Bun.markdown.ansi).toBeFunction();
    expect(Bun.markdown.ansi('# Heading', { colors: false })).not.toContain('\x1b[');
  });

  test('accepts pinned parser, callback, and ANSI option types', () => {
    const options = {
      tables: true,
      autolinks: { url: true, www: false, email: false },
      headings: { ids: true, autolink: false },
    } satisfies Bun.markdown.Options;
    const callbacks = {
      listItem: (children, meta) => `${meta.index}:${children}`,
      link: (children, meta) => `${children}:${meta.href}`,
    } satisfies Bun.markdown.RenderCallbacks;
    const theme = {
      colors: false,
      hyperlinks: false,
      columns: 0,
      kittyGraphics: false,
      light: false,
    } satisfies Bun.markdown.AnsiTheme;

    expect(Bun.markdown.render('[x](https://example.com)', callbacks, options)).toContain(
      'https://example.com'
    );
    expect(Bun.markdown.ansi('text', theme)).toContain('text');
  });
});

describe('Markdown repository validator', () => {
  test('accepts valid headings, fragments, and tables', async () => {
    expect(await runMarkdownCheck([FIXTURES.valid])).toEqual([]);
  });

  test('rejects empty destinations', async () => {
    const issues = await runMarkdownCheck([FIXTURES.emptyLink]);
    expect(issues.map(issue => issue.kind)).toContain('empty-link');
  });

  test('rejects malformed tables', async () => {
    const issues = await runMarkdownCheck([FIXTURES.malformedTable]);
    expect(issues.map(issue => issue.kind)).toContain('malformed-table');
  });

  test('rejects broken local fragments', async () => {
    const issues = await runMarkdownCheck([FIXTURES.missingAnchor]);
    expect(issues.map(issue => issue.kind)).toContain('missing-anchor');
  });
});
