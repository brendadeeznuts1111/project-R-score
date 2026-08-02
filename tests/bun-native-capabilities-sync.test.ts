// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  BUN_NATIVE_MARKDOWN_SYNC_END,
  BUN_NATIVE_MARKDOWN_SYNC_START,
  markdownHeadings,
  replaceMarkdownAdoptionSection,
  renderMarkdownAdoptionSection,
  syncBunNativeCapabilities,
  type MarkdownAdoptionRow,
} from '../lib/docs/bun-native-capabilities-sync.ts';
import { parseMode } from '../tools/bun-native-capabilities-sync.ts';

const BASE = `# Bun native capabilities (platform note)\n\n## API map (homebase)\n\nAuthored.\n\n## Release maps\n\nKeep.\n`;

const ROWS: MarkdownAdoptionRow[] = [
  {
    key: 'bun-markdown-ansi',
    name: 'Bun.markdown.ansi',
    pattern: 'Bun.markdown.ansi($$$)',
    lang: 'ts',
    docsUrl: 'https://bun.com/docs/runtime/markdown',
    sourceFiles: ['lib/console-depth.ts'],
  },
];

describe('Bun native capabilities Markdown sync', () => {
  test('parses the expected document heading through Bun.markdown.render', () => {
    expect(markdownHeadings(BASE)).toContainEqual({
      level: 1,
      text: 'Bun native capabilities (platform note)',
    });
  });

  test('inserts one bounded section without rewriting authored content', () => {
    const generated = renderMarkdownAdoptionSection(ROWS);
    const next = replaceMarkdownAdoptionSection(BASE, generated);
    expect(next).toContain(BUN_NATIVE_MARKDOWN_SYNC_START);
    expect(next).toContain(BUN_NATIVE_MARKDOWN_SYNC_END);
    expect(next).toContain('Authored.');
    expect(next).toContain('## Release maps\n\nKeep.');
  });

  test('replacement is idempotent', () => {
    const generated = renderMarkdownAdoptionSection(ROWS);
    const once = replaceMarkdownAdoptionSection(BASE, generated);
    expect(replaceMarkdownAdoptionSection(once, generated)).toBe(once);
  });

  test('refuses a partial marker block', () => {
    const broken = BASE.replace('## Release maps', `${BUN_NATIVE_MARKDOWN_SYNC_START}\n## Release maps`);
    expect(() => replaceMarkdownAdoptionSection(broken, renderMarkdownAdoptionSection(ROWS))).toThrow(
      'partial Bun native Markdown sync block',
    );
  });

  test('collects structural files through the injected ast-grep boundary', async () => {
    const result = await syncBunNativeCapabilities(BASE, async pattern => [
      `proof/${pattern.key}.ts`,
    ]);
    expect(result.changed).toBeTrue();
    expect(result.rows).toHaveLength(4);
    expect(result.next).toContain('proof/bun-markdown-react.ts');
  });

  test('CLI defaults to check and rejects conflicting modes', () => {
    expect(parseMode([])).toBe('check');
    expect(parseMode(['--write'])).toBe('write');
    expect(parseMode(['--preview'])).toBe('preview');
    expect(() => parseMode(['--check', '--write'])).toThrow('Choose one mode');
  });
});
