// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  buildDocsCoverageLanes,
  buildDocsCoverageReport,
  checkCanonicalCoverage,
  checkReferenceUrlPresence,
  checkRssIndexFreshness,
  collectCatalogOverlayTokens,
  collectCatalogOverlayTokens,
  collectCatalogReferenceTokens,
  isTokenTracked,
  loadAllowlist,
} from '../lib/docs/docs-coverage-report.ts';
import {
  deriveReferenceModules,
  normalizeReferencePath,
  parseReferenceLinks,
  referenceIndexHasUrl,
  type ReferenceIndexFile,
} from '../tools/bun-docs-reference-index.ts';
import type { ReleaseIndexFile } from '../tools/bun-docs-releases.ts';

const REFERENCE_FIXTURE = `
<nav>
  <a href="/reference/bun/sqlite">SQLite</a>
  <a href="/reference/node/fs">fs</a>
  <a href="/reference/bun">bun</a>
  <a href="/reference/bun/sliceAnsi">sliceAnsi</a>
  <a href="/reference/globals/AbortController">AbortController</a>
</nav>
`;

describe('parseReferenceLinks', () => {
  test('extracts unique /reference/ paths from HTML', () => {
    const pages = parseReferenceLinks(REFERENCE_FIXTURE);
    expect(pages.length).toBe(5);
    expect(pages.map(p => p.path)).toEqual([
      'bun',
      'bun/sliceAnsi',
      'bun/sqlite',
      'globals/AbortController',
      'node/fs',
    ]);
    expect(pages[0]!.url).toContain('/reference/bun');
  });

  test('deriveReferenceModules maps paths to module ids', () => {
    const pages = parseReferenceLinks(REFERENCE_FIXTURE);
    const modules = deriveReferenceModules(pages);
    expect(modules).toContain('bun:sqlite');
    expect(modules).toContain('node:fs');
    expect(modules).toContain('globals/AbortController');
  });

  test('normalizeReferencePath strips leading /reference/', () => {
    expect(normalizeReferencePath('/reference/bun/sqlite/')).toBe('bun/sqlite');
  });
});

describe('referenceIndexHasUrl', () => {
  const pages = parseReferenceLinks(REFERENCE_FIXTURE);
  const urlSet = new Set(pages.map(p => p.url));

  test('exact URL match', () => {
    expect(referenceIndexHasUrl(pages[0]!.url, urlSet, pages)).toBe(true);
  });

  test('deep symbol under module root via prefix', () => {
    const moduleUrl = pages.find(p => p.path === 'bun')!.url;
    const deepUrl = moduleUrl.replace('/reference/bun', '/reference/bun/sliceAnsi');
    expect(referenceIndexHasUrl(deepUrl, urlSet, pages)).toBe(true);
  });

  test('unknown URL returns false', () => {
    expect(referenceIndexHasUrl('https://bun.com/reference/unknown/module', urlSet, pages)).toBe(
      false
    );
  });
});

describe('checkCanonicalCoverage', () => {
  const catalogByName = new Map([
    ['Bun.serve', { name: 'Bun.serve', canonicalPage: 'https://bun.com/reference/bun/serve' }],
    ['orphan.token', { name: 'orphan.token' }],
  ]);

  test('tracks via getCanonicalEntry or catalog canonicalPage', () => {
    const result = checkCanonicalCoverage(['Bun.serve', 'Bun API Reference'], catalogByName);
    expect(result.tracked).toBe(2);
    expect(result.missing).toEqual([]);
  });

  test('reports missing when no canonical or catalog docs', () => {
    const result = checkCanonicalCoverage(['orphan.token'], catalogByName);
    expect(result.tracked).toBe(0);
    expect(result.missing).toEqual(['orphan.token']);
  });

  test('allowlist defers intentional gaps', () => {
    const allow = loadAllowlist({ catalogTokens: ['orphan.token'] });
    const result = checkCanonicalCoverage(['orphan.token'], catalogByName, allow.catalog);
    expect(result.missing).toEqual([]);
    expect(result.tracked).toBe(1);
  });
});

describe('isTokenTracked', () => {
  test('catalog docsUrl fallback without canonical key', () => {
    const catalogByName = new Map([
      ['CustomWidget', { name: 'CustomWidget', docsUrl: 'https://bun.com/docs/runtime/widgets' }],
    ]);
    expect(isTokenTracked('CustomWidget', catalogByName)).toBe(true);
  });
});

describe('checkReferenceUrlPresence', () => {
  test('flags catalog URLs absent from reference index', () => {
    const refIndex: ReferenceIndexFile = {
      generated: '2026-01-01T00:00:00.000Z',
      source: 'https://bun.com/reference',
      count: 1,
      moduleCount: 1,
      modules: ['bun:sqlite'],
      pages: [{ url: 'https://bun.com/reference/bun/sqlite', path: 'bun/sqlite' }],
    };
    const { missingFromIndex } = checkReferenceUrlPresence(
      ['https://bun.com/reference/bun/sqlite', 'https://bun.com/reference/missing/page'],
      refIndex
    );
    expect(missingFromIndex).toEqual(['https://bun.com/reference/missing/page']);
  });
});

describe('checkRssIndexFreshness', () => {
  const localIndex: ReleaseIndexFile = {
    generated: '2026-01-01T00:00:00.000Z',
    source: 'https://bun.com/rss.xml',
    count: 2,
    entries: [
      { version: '1.2.0', pubDate: '2026-01-15T00:00:00.000Z', title: 'v1.2.0', link: '' },
      { version: '1.1.0', pubDate: '2025-12-01T00:00:00.000Z', title: 'v1.1.0', link: '' },
    ],
  };

  test('not stale when live head matches committed index', () => {
    const fresh = checkRssIndexFreshness(localIndex, '1.2.0');
    expect(fresh.indexStale).toBe(false);
    expect(fresh.newestVersion).toBe('1.2.0');
  });

  test('stale when live RSS head differs from index', () => {
    const stale = checkRssIndexFreshness(localIndex, '1.3.0');
    expect(stale.indexStale).toBe(true);
  });

  test('not stale when live version omitted (CI default)', () => {
    const offline = checkRssIndexFreshness(localIndex);
    expect(offline.indexStale).toBe(false);
  });
});

describe('buildDocsCoverageReport', () => {
  test('summary ok false when catalog reference token lacks coverage', () => {
    const report = buildDocsCoverageReport({
      releaseIndex: {
        generated: '2026-01-01T00:00:00.000Z',
        source: 'https://bun.com/rss.xml',
        count: 0,
        entries: [],
      },
      referenceIndex: {
        generated: '2026-01-01T00:00:00.000Z',
        source: 'https://bun.com/reference',
        count: 0,
        moduleCount: 0,
        modules: [],
        pages: [],
      },
      catalogEntries: [
        {
          name: 'gap.token',
          locusStatus: 'reference',
        },
      ],
      overlay: { entries: [] },
      reviewRows: [],
      allowlist: {},
    });
    expect(report.summary.ok).toBe(false);
    expect(report.summary.missingCanonicalCount).toBeGreaterThan(0);
    expect(report.canonical.catalogMissing).toContain('gap.token');
    expect(report.subsystem).toBe('other');
    expect(report.lanes?.length).toBe(5);
    expect(report.lanes?.every(l => l.subsystem === 'other')).toBe(true);
    expect(report._links?.report).toBe('/registry/docs-coverage-proof.json');
  });

  test('buildDocsCoverageLanes marks catalog lane failed when gaps exist', () => {
    const lanes = buildDocsCoverageLanes({
      rssStale: false,
      newestVersion: '1.3.14',
      referencePageCount: 57,
      referenceModuleCount: 44,
      catalogCheck: { total: 2, tracked: 1, missing: ['gap'] },
      overlayCheck: { total: 1, tracked: 1, missing: [] },
      reviewCheck: { total: 1, tracked: 1, missing: [] },
    });
    const catalog = lanes.find(l => l.name === 'docs-coverage:catalog');
    expect(catalog?.passed).toBe(false);
  });

  test('collectCatalogOverlayTokens uses embedded releaseHits', () => {
    const tokens = collectCatalogOverlayTokens([
      { name: 'a', releaseHits: [{ version: '1.0.0' }] },
      { name: 'b' },
    ]);
    expect(tokens).toEqual(['a']);
  });

  test('collectCatalogReferenceTokens includes reference locus and /reference/ pages', () => {
    const tokens = collectCatalogReferenceTokens([
      { name: 'a', locusStatus: 'reference' },
      { name: 'b', canonicalPage: 'https://bun.com/reference/bun/foo' },
      { name: 'c', canonicalPage: 'https://bun.com/docs/runtime/foo' },
    ]);
    expect(tokens).toEqual(['a', 'b']);
  });
});
