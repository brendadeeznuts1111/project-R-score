// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --compile
// @see https://bun.com/docs/bundler/executables#embedding-runtime-arguments — --compile-exec-argv
// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
// @see https://bun.com/docs/test/parallel#parallel — --parallel
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
  classifySectionHeading,
  parseBlogSections,
  extractEvidenceRegions,
  isShipEvidence,
  extractTokenCandidates,
  matchCatalogToken,
  matchCatalogTokenWithAliases,
  extractPathAliasMatches,
  configKeyPatterns,
  releaseOverlayIndex,
  loadExistingOverlayMap,
  RELEASE_OVERLAY_PATH,
  type ReleaseOverlayFile,
} from '../tools/bun-docs-releases.ts';
import { RELEASE_OVERLAY_CACHE_ABS } from '../lib/docs/docs-artifact-paths.ts';
import {
  extractNoteFromHtml,
  extractNoteFromMarkdown,
  normalizeNote,
} from '../tools/bun-docs-catalog.ts';

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
    expect(classifySectionHeading('Performance improvements')).toBe('chg');
    expect(classifySectionHeading('Upgraded JavaScriptCore')).toBe('skip');
    expect(classifySectionHeading('Bun APIs')).toBe('attest');
    expect(classifySectionHeading('Bun.sql is now up to 5x faster')).toBe('chg');
  });

  test('parseBlogSections splits on h2', () => {
    const html =
      '<article><h2>Bun.Image</h2><p><code>Bun.Image</code></p><h2>Bugfixes</h2><p><code>--filter</code></p></article>';
    const sections = parseBlogSections(html);
    expect(sections.length).toBe(2);
    expect(sections[0]!.kind).toBe('ship');
    expect(sections[1]!.kind).toBe('fix');
  });

  test('parseBlogSections preserves nested bugfix context', () => {
    const html =
      '<article><h2>Bugfixes</h2><h3>Bun APIs</h3><p>Fixed a crash in <code>Bun.resolveSync()</code>.</p><h2>New APIs</h2><h3>Bun.color</h3><p><code>Bun.color()</code> formats colors.</p></article>';
    const sections = parseBlogSections(html);
    expect(sections.map(section => [section.heading, section.kind])).toEqual([
      ['Bugfixes', 'fix'],
      ['Bun APIs', 'fix'],
      ['New APIs', 'ship'],
      ['Bun.color', 'ship'],
    ]);
  });

  test('extractEvidenceRegions classifies list items instead of broad headings', () => {
    const [section] = parseBlogSections(
      '<article><h2>What\'s new</h2><ul><li>Fixed <code>Bun.file()</code> reads.</li><li>Added <code>Bun.color()</code>.</li><li>Example: <code>Bun.resolveSync()</code>.</li></ul></article>'
    );
    expect(extractEvidenceRegions(section!).map(region => region.kind)).toEqual([
      'attest',
      'fix',
      'ship',
      'attest',
    ]);
  });

  test('isShipEvidence requires token-local introduction evidence', () => {
    expect(
      isShipEvidence(
        'Bun.color',
        'Bun.color',
        'Added Bun.color to format and normalize colors',
        'Added Bun.color'
      )
    ).toBe(true);
    expect(
      isShipEvidence(
        'Bun.resolveSync',
        'Bun.resolveSync',
        'Example: Bun.resolveSync() resolves the fixture',
        'WebAssembly.compileStreaming and WebAssembly.instantiateStreaming'
      )
    ).toBe(false);
    expect(
      isShipEvidence(
        'Bun.color',
        'Bun.color',
        'In a recent release, we introduced Bun.color.',
        'Fixed Bun.color'
      )
    ).toBe(false);
    expect(
      isShipEvidence(
        'Bun.udpSocket',
        'Bun.udpSocket',
        'In the previous release, we introduced Bun.udpSocket.',
        'Fixed Bun.udpSocket'
      )
    ).toBe(false);
    expect(
      isShipEvidence(
        '--compile',
        '--compile',
        'The new --compile-exec-argv flag embeds arguments.',
        'Embed flags with --compile-exec-argv'
      )
    ).toBe(false);
    expect(
      isShipEvidence(
        'Bun.markdown',
        'Bun.markdown',
        'Use the new Bun.markdown.ansi API.',
        'Bun.markdown.ansi'
      )
    ).toBe(false);
    expect(
      isShipEvidence(
        'bun:test',
        'bun:test',
        'This release adds 5 new matchers to bun:test.',
        '5 new bun:test matchers'
      )
    ).toBe(false);
    expect(
      isShipEvidence(
        'Bun.Cookie',
        'Bun.Cookie',
        'Added Bun.Cookie and Bun.CookieMap',
        'New APIs'
      )
    ).toBe(true);
    expect(
      isShipEvidence(
        'Bun.connect',
        'Bun.connect',
        'Non-blocking I/O was a new thing. This also affected Bun.connect.',
        'Fixed a Windows regression'
      )
    ).toBe(false);
    expect(
      isShipEvidence(
        'Bun.Transpiler',
        'Bun.Transpiler',
        'A new replMode option for Bun.Transpiler transforms code.',
        'replMode option for Bun.Transpiler'
      )
    ).toBe(false);
    expect(
      isShipEvidence(
        'Bun.write',
        'Bun.write',
        'Bun.write is a flexible API for writing to disk.',
        'Bun.write()'
      )
    ).toBe(false);
    expect(
      isShipEvidence(
        'bun:sqlite',
        'bun:sqlite',
        'The Statement object in bun:sqlite now has two new properties.',
        'columnTypes in bun:sqlite'
      )
    ).toBe(false);
    expect(
      isShipEvidence(
        'Bun.stringWidth',
        'Bun.stringWidth',
        'Last month, we added Bun.stringWidth.',
        'Executable size regression'
      )
    ).toBe(false);
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

  test('releaseOverlayIndex preserves prior entries for merge', () => {
    const prior: ReleaseOverlayFile = {
      generated: '2026-01-01T00:00:00.000Z',
      postsProcessed: 160,
      tokenCount: 1,
      unmatchedLogged: 0,
      entries: [{ name: 'Bun.Image', hits: [], releasedIn: '1.3.14' }],
    };
    const map = releaseOverlayIndex(prior);
    expect(map.size).toBe(1);
    expect(map.get('bun.image')?.releasedIn).toBe('1.3.14');
  });

  test('matchCatalogTokenWithAliases resolves scrape alias map', () => {
    const index = new Map([['--preload', '--preload']]);
    const aliases = { '--require': '--preload' };
    expect(matchCatalogTokenWithAliases('--require', index, aliases)).toBe('--preload');
  });

  test('loadExistingOverlayMap returns empty when force', async () => {
    const map = await loadExistingOverlayMap(true);
    expect(map.size).toBe(0);
  });

  test('RELEASE_OVERLAY_PATH points at gitignored cache', () => {
    expect(RELEASE_OVERLAY_PATH).toBe(RELEASE_OVERLAY_CACHE_ABS);
    expect(RELEASE_OVERLAY_PATH).toContain('/tools/.cache/bun-release-overlay.json');
  });
});
