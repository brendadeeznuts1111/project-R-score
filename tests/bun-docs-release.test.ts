/**
 * Phase 0/1/2b helpers: RSS parsing, NOTE extraction, release scrape classification.
 */
import { describe, expect, test } from 'bun:test';
import {
  parseReleaseEntries,
  buildReleaseMap,
  lookupBlogUrl,
  isReleasePost,
  normalizeReleaseVersion,
} from '../tools/bun-docs-release-index.ts';
import {
  extractNoteFromHtml,
  extractNoteFromMarkdown,
  normalizeNote,
} from '../tools/bun-docs-page-notes.ts';
import {
  classifySectionHeading,
  parseBlogSections,
  extractTokenCandidates,
  matchCatalogToken,
  extractPathAliasMatches,
  configKeyPatterns,
} from '../tools/bun-docs-release-scrape.ts';

const SAMPLE_RSS = `<?xml version="1.0"?><rss><channel>
<item><title>Bun v1.3.14</title><link>https://bun.com/blog/bun-v1.3.14</link><guid>g1</guid><pubDate>Wed, 13 May 2026 03:19:35 GMT</pubDate></item>
<item><title>Rewriting Bun in Rust</title><link>https://bun.com/blog/bun-in-rust</link><guid>g2</guid><pubDate>Wed, 08 Jul 2026 16:00:00 GMT</pubDate></item>
<item><title>Bun 1.3</title><link>https://bun.com/blog/bun-v1.3</link><guid>g3</guid><pubDate>Fri, 21 Nov 2025 10:11:00 GMT</pubDate></item>
</channel></rss>`;

describe('bun-docs-release-index', () => {
  test('isReleasePost filters non-release posts', () => {
    expect(isReleasePost('Bun v1.3.14', 'https://bun.com/blog/bun-v1.3.14')).toBe(true);
    expect(isReleasePost('Rewriting Bun in Rust', 'https://bun.com/blog/bun-in-rust')).toBe(false);
  });

  test('normalizeReleaseVersion expands minor and prefers URL', () => {
    expect(normalizeReleaseVersion('Bun 1.3', 'https://bun.com/blog/bun-v1.3')).toBe('1.3.0');
    expect(normalizeReleaseVersion('Bun v0.5', 'https://bun.com/blog/bun-v0.5.0')).toBe('0.5.0');
  });

  test('parseReleaseEntries returns sorted releases', () => {
    const entries = parseReleaseEntries(SAMPLE_RSS);
    expect(entries.length).toBe(2);
    expect(entries[0]!.version).toBe('1.3.0');
    expect(entries[1]!.version).toBe('1.3.14');
  });

  test('lookupBlogUrl exact and minor fallback', () => {
    const map = buildReleaseMap(parseReleaseEntries(SAMPLE_RSS));
    expect(lookupBlogUrl('1.3.14', map)).toBe('https://bun.com/blog/bun-v1.3.14');
    expect(lookupBlogUrl('1.3.99', map)).toBe('https://bun.com/blog/bun-v1.3');
    expect(lookupBlogUrl('1.4.0', map)).toBeUndefined();
  });
});

describe('bun-docs-page-notes', () => {
  test('extractNoteFromHtml prefers paragraph after h1', () => {
    const html =
      '<h1>WebView</h1><p>Control a headless browser</p><meta name="description" content="meta"/>';
    expect(extractNoteFromHtml(html)).toBe('Control a headless browser');
  });

  test('extractNoteFromMarkdown reads first paragraph after title', () => {
    const md = '# WebView\n\nControl a headless browser from Bun.\n\n## API';
    expect(extractNoteFromMarkdown(md)).toBe('Control a headless browser from Bun.');
  });

  test('normalizeNote strips single-word trailing period', () => {
    expect(normalizeNote('Experimental.')).toBe('Experimental');
  });
});

describe('bun-docs-release-scrape', () => {
  test('classifySectionHeading maps bugfixes and features', () => {
    expect(classifySectionHeading('Bugfixes')).toBe('fix');
    expect(classifySectionHeading('Bug Fixes')).toBe('fix');
    expect(classifySectionHeading('Bun.Image — Built-in Image Processing')).toBe('ship');
    expect(classifySectionHeading('Improvements')).toBe('chg');
    expect(classifySectionHeading('Changes')).toBe('chg');
    expect(classifySectionHeading('Performance improvements')).toBe('skip');
    expect(classifySectionHeading('Upgraded JavaScriptCore')).toBe('skip');
  });

  test('parseBlogSections splits on h2', () => {
    const html =
      '<article><h2>Bun.Image</h2><p><code>Bun.Image</code></p><h2>Bugfixes</h2><p><code>--filter</code></p></article>';
    const sections = parseBlogSections(html);
    expect(sections.length).toBe(2);
    expect(sections[0]!.kind).toBe('ship');
    expect(sections[1]!.kind).toBe('fix');
  });

  test('extractTokenCandidates finds Bun APIs and flags', () => {
    const tokens = extractTokenCandidates('Added Bun.cron and --parallel support');
    expect(tokens).toContain('Bun.cron');
    expect(tokens).toContain('--parallel');
  });

  test('matchCatalogToken exact lookup', () => {
    const index = new Map([['bun.image', 'Bun.Image']]);
    expect(matchCatalogToken('Bun.Image', index)).toBe('Bun.Image');
    expect(matchCatalogToken('Bun.Missing', index)).toBeUndefined();
  });

  test('configKeyPatterns match bunfig paths', () => {
    const text = 'Added [install].linker option and install.prefer support';
    const rows = [
      { name: 'install.linker', type: 'config-key' },
      { name: 'install.prefer', type: 'config-key' },
    ];
    const hits = extractPathAliasMatches(text, rows);
    expect(hits).toContain('install.linker');
    expect(hits).toContain('install.prefer');
  });

  test('extractPathAliasMatches package.json keys', () => {
    const hits = extractPathAliasMatches('trustedDependencies now hoisted by default', [
      { name: 'trustedDependencies', type: 'package-json-key' },
    ]);
    expect(hits).toContain('trustedDependencies');
  });
});
