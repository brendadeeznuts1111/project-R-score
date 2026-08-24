/**
 * Catalog helpers: dedup scoring + canonical page preference + version pin URLs.
 * Changelog overlay: token → releasedIn / fixedIn / changeNote.
 */
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/console#object-inspection-depth — --console-depth
// @see https://bun.com/docs/bundler/executables#embedding-runtime-arguments — --compile-exec-argv
// @see https://bun.com/blog/bun-v1.3.14#no-orphans-exit-when-the-parent-process-dies — --no-orphans
import { describe, expect, test } from 'bun:test';
import {
  normalizeName,
  pageBase,
  pageAnchor,
  scoreCanonicalPage,
  pickCanonicalPage,
  sectionFromUrl,
  inferType,
  inferStability,
  compareSemver,
  releaseUrlFor,
  blogUrlFor,
  docsUrlFor,
  curatedPageUrl,
  parseVersionFlag,
  normalizeBunVersion,
  applyChangelogOverlay,
  applyReleaseOverlay,
  preserveReleaseProvenance,
  stampVersionProvenance,
  catalogReleaseProvenanceFindings,
  parseCatalogFileMeta,
  listCells,
  shortType,
  shortStability,
  shortSection,
  shortUrl,
  buildListColumns,
  formatListTable,
  bunApiFamilyRoot,
  seedPageRelations,
  applyCuratedRelatedTokens,
  type DocCatalogEntry,
} from '../tools/bun-docs-catalog.ts';
import {
  changelogFor,
  changelogKey,
  commitUrlFor,
  allChangelogEvents,
} from '../tools/bun-docs-changelog.ts';
import { CURATED_ENTRIES } from '../tools/bun-docs-curated.ts';
import { GUIDE_EXAMPLES, TOKEN_GUIDE_PATH } from '../tools/bun-docs-guide-examples.ts';

describe('bun-docs-catalog helpers', () => {
  test('catalog rebuild preserves committed release provenance when scrape cache is absent', () => {
    const current = {
      name: 'Bun.Image.resize',
      type: 'api',
      stability: 'stable',
      canonicalPage: 'https://bun.com/docs/runtime/image',
      allPages: ['https://bun.com/docs/runtime/image'],
      section: 'runtime',
    } satisfies DocCatalogEntry;
    const previous = {
      ...current,
      releasedIn: '1.3.14',
      releasedAt: '2026-05-13T03:19:35.000Z',
      releasedUrl: 'https://bun.com/blog/bun-v1.3.14',
      releaseHits: [
        {
          version: '1.3.14',
          url: 'https://bun.com/blog/bun-v1.3.14',
          publishedAt: '2026-05-13T03:19:35.000Z',
          section: 'Bun.Image',
          evidence: 'Built-in image processing',
          kind: 'ship',
        },
      ],
    } satisfies DocCatalogEntry;

    preserveReleaseProvenance([current], [previous]);
    expect(current).toMatchObject({
      releasedIn: '1.3.14',
      releasedAt: '2026-05-13T03:19:35.000Z',
      releasedUrl: 'https://bun.com/blog/bun-v1.3.14',
      releaseHits: [{ section: 'Bun.Image', kind: 'ship' }],
    });
  });

  test('parseCatalogFileMeta rejects synthesized metadata and duplicate entries', () => {
    const entry = {
      name: 'Bun.example',
      type: 'api',
      stability: 'stable',
      canonicalPage: 'https://bun.com/reference/bun/example',
      allPages: ['https://bun.com/reference/bun/example'],
      section: 'reference',
    } satisfies DocCatalogEntry;
    const file = {
      generated: '2026-08-13T00:00:00.000Z',
      bunVersion: '1.3.14',
      releaseUrl: 'https://github.com/oven-sh/bun/releases/tag/bun-v1.3.14',
      blogUrl: 'https://bun.com/blog/bun-v1.3.14',
      docsRoot: 'https://bun.com/docs',
      versionPinned: false,
      count: 1,
      entries: [entry],
    };
    expect(parseCatalogFileMeta(file).entries).toHaveLength(1);
    expect(() => parseCatalogFileMeta({ ...file, bunVersion: undefined })).toThrow(
      'bunVersion is missing or invalid'
    );
    expect(() =>
      parseCatalogFileMeta({ ...file, count: 2, entries: [entry, { ...entry }] })
    ).toThrow('duplicate entry Bun.example');
  });

  test('normalizeName collapses bun. prefix case', () => {
    expect(normalizeName('Bun.WebView')).toBe('bun.webview');
    expect(normalizeName('bun.webview')).toBe('bun.webview');
    expect(normalizeName('Bun.Image.metadata')).toBe('bun.image.metadata');
    expect(normalizeName('Bun.Image.Metadata')).toBe('bun.image.Metadata');
  });

  test('pageBase strips md and fragment', () => {
    expect(pageBase('https://bun.com/docs/runtime/utils.md#bun-inspect')).toBe(
      'https://bun.com/docs/runtime/utils'
    );
    expect(pageAnchor('https://bun.com/docs/runtime/utils#bun-inspect')).toBe('bun-inspect');
  });

  test('scoreCanonicalPage prefers /reference/ over /guides/', () => {
    const ref = scoreCanonicalPage('https://bun.com/reference/bun/sliceAnsi', 'Bun.sliceAnsi');
    const guide = scoreCanonicalPage('https://bun.com/docs/guides/http/fetch', 'Bun.sliceAnsi');
    const runtime = scoreCanonicalPage('https://bun.com/docs/runtime/utils', 'Bun.sliceAnsi');
    expect(ref).toBeGreaterThan(guide);
    expect(ref).toBeGreaterThan(runtime);
  });

  test('pickCanonicalPage chooses reference first', () => {
    const picked = pickCanonicalPage(
      [
        'https://bun.com/docs/guides/http/fetch',
        'https://bun.com/docs/runtime/utils',
        'https://bun.com/reference/bun/sliceAnsi',
      ],
      'Bun.sliceAnsi'
    );
    expect(picked).toContain('/reference/');
  });

  test('sectionFromUrl classifies runtime bundler test guides', () => {
    expect(sectionFromUrl('https://bun.com/docs/runtime/cron')).toBe('runtime');
    expect(sectionFromUrl('https://bun.com/docs/bundler')).toBe('bundler');
    expect(sectionFromUrl('https://bun.com/docs/test/mocks')).toBe('test');
    expect(sectionFromUrl('https://bun.com/docs/guides/http/fetch')).toBe('guides');
  });

  test('inferType classifies api flag config concept', () => {
    expect(inferType('Bun.cron', 'https://bun.com/docs/runtime/cron')).toBe('api');
    expect(inferType('--console-depth', 'https://bun.com/docs/runtime/console')).toBe('cli-flag');
    expect(inferType('bun test --parallel', 'https://bun.com/blog/bun-v1.3.13')).toBe('cli-flag');
    expect(inferType('bun run --parallel', 'https://bun.com/docs/pm/filter')).toBe('cli-flag');
    expect(inferType('JEST_WORKER_ID', 'https://bun.com/blog/bun-v1.3.13')).toBe('env-var');
    expect(inferType('bunfig.toml', 'https://bun.com/docs/runtime/bunfig')).toBe('config-key');
    expect(inferType('Code coverage', 'https://bun.com/docs/test/code-coverage')).toBe('concept');
  });

  test('compareSemver orders release versions', () => {
    expect(compareSemver('1.3.14', '1.4.0')).toBeLessThan(0);
    expect(compareSemver('1.4.0', '1.3.14')).toBeGreaterThan(0);
    expect(compareSemver('1.4.0', '1.4.0')).toBe(0);
  });

  test('normalizeBunVersion strips bun-v / v prefixes', () => {
    expect(normalizeBunVersion('bun-v1.3.12')).toBe('1.3.12');
    expect(normalizeBunVersion('v1.3.12')).toBe('1.3.12');
    expect(normalizeBunVersion('1.3.12')).toBe('1.3.12');
  });

  test('releaseUrlFor builds GitHub tag URLs', () => {
    expect(releaseUrlFor('1.3.14')).toBe(
      'https://github.com/oven-sh/bun/releases/tag/bun-v1.3.14'
    );
    expect(releaseUrlFor('v1.3.14')).toBe(
      'https://github.com/oven-sh/bun/releases/tag/bun-v1.3.14'
    );
    expect(releaseUrlFor('bun-v1.3.14')).toBe(
      'https://github.com/oven-sh/bun/releases/tag/bun-v1.3.14'
    );
  });

  test('blogUrlFor builds bun.com/blog release post URLs', () => {
    expect(blogUrlFor('1.3.12')).toBe('https://bun.com/blog/bun-v1.3.12');
    expect(blogUrlFor('bun-v1.3.12')).toBe('https://bun.com/blog/bun-v1.3.12');
    expect(blogUrlFor('1.4.0')).toBe('https://bun.com/blog/bun-v1.4');
    expect(blogUrlFor('bun-v1.4')).toBe('https://bun.com/blog/bun-v1.4');
  });

  test('docsUrlFor joins page + optional anchor (unversioned)', () => {
    expect(docsUrlFor('https://bun.com/docs/runtime/http/server.md')).toBe(
      'https://bun.com/docs/runtime/http/server'
    );
    expect(docsUrlFor('https://bun.com/docs/runtime/utils', 'bun-version')).toBe(
      'https://bun.com/docs/runtime/utils#bun-version'
    );
  });

  test('curatedPageUrl maps blog/reference at site root; else /docs/', () => {
    expect(curatedPageUrl('blog/bun-v1.3.13#bun-test-changed')).toBe(
      'https://bun.com/blog/bun-v1.3.13'
    );
    expect(curatedPageUrl('reference/bun/BunInspectOptions')).toBe(
      'https://bun.com/reference/bun/BunInspectOptions'
    );
    expect(curatedPageUrl('runtime/workers#worker-ref')).toBe(
      'https://bun.com/docs/runtime/workers'
    );
  });

  test('parseVersionFlag reads --version= and --version N', () => {
    expect(parseVersionFlag(['list', '--version=1.3.14'])).toBe('1.3.14');
    expect(parseVersionFlag(['build', '--version', 'v1.4.0'])).toBe('1.4.0');
    expect(parseVersionFlag(['build', '--version=bun-v1.3.12'])).toBe('1.3.12');
    expect(parseVersionFlag(['list'])).toBe(Bun.version);
  });
});

describe('bun-docs-release overlay embed', () => {
  test('applyReleaseOverlay sets releaseHits on entry', () => {
    const entry: DocCatalogEntry = {
      name: 'Bun.WebView',
      type: 'api',
      stability: 'stable',
      canonicalPage: 'https://bun.com/docs/runtime/webview',
      allPages: ['https://bun.com/docs/runtime/webview'],
      section: 'runtime',
    };
    applyReleaseOverlay(entry, new Map([
      [
        'bun.webview',
        {
          name: 'Bun.WebView',
          releasedIn: '1.4.0',
          hits: [
            {
              version: '1.4.0',
              url: 'https://bun.com/blog/bun-v1.4.0',
              section: 'WebView',
              kind: 'ship',
            },
          ],
        },
      ],
    ]));
    expect(entry.releasedIn).toBe('1.4.0');
    expect(entry.releaseHits?.length).toBe(1);
    expect(entry.releaseHits?.[0]?.kind).toBe('ship');
  });

  test('applyReleaseOverlay treats later recap claims as changes', () => {
    const entry: DocCatalogEntry = {
      name: 'Bun.CSRF',
      type: 'api',
      stability: 'stable',
      canonicalPage: 'https://bun.com/docs/runtime/csrf',
      allPages: ['https://bun.com/docs/runtime/csrf'],
      section: 'runtime',
      releasedIn: '1.2.5',
    };
    applyReleaseOverlay(
      entry,
      new Map([
        [
          'bun.csrf',
          {
            name: 'Bun.CSRF',
            releasedIn: '1.3.0',
            hits: [
              {
                version: '1.3.0',
                url: 'https://bun.com/blog/bun-v1.3',
                section: 'CSRF Protection',
                evidence: 'Bun 1.3 adds Bun.CSRF.',
                kind: 'ship',
              },
            ],
          },
        ],
      ])
    );
    expect(entry.releasedIn).toBe('1.2.5');
    expect(entry.releaseHits?.[0]?.kind).toBe('chg');
  });
});

describe('release provenance', () => {
  test('joins recorded versions to official RSS dates and release references', () => {
    const entry = {
      name: 'Bun.example',
      type: 'api',
      stability: 'stable',
      canonicalPage: 'https://bun.com/docs/reference/bun/example',
      allPages: ['https://bun.com/docs/reference/bun/example'],
      section: 'reference',
      releasedIn: '1.3.13',
      fixedIn: '1.3.14',
    } satisfies DocCatalogEntry;
    const releases = new Map([
      [
        '1.3.13',
        {
          version: '1.3.13',
          title: 'Bun v1.3.13',
          url: 'https://bun.com/blog/bun-v1.3.13',
          guid: 'https://bun.com/blog/bun-v1.3.13',
          pubDate: '2026-04-20T07:33:26.000Z',
        },
      ],
      [
        '1.3.14',
        {
          version: '1.3.14',
          title: 'Bun v1.3.14',
          url: 'https://bun.com/blog/bun-v1.3.14',
          guid: 'https://bun.com/blog/bun-v1.3.14',
          pubDate: '2026-05-13T03:19:35.000Z',
        },
      ],
    ]);

    stampVersionProvenance(entry, releases);

    expect(entry.releasedAt).toBe('2026-04-20T07:33:26.000Z');
    expect(entry.releasedUrl).toBe('https://bun.com/blog/bun-v1.3.13');
    expect(entry.fixedAt).toBe('2026-05-13T03:19:35.000Z');
    expect(entry.fixedUrl).toBe('https://bun.com/blog/bun-v1.3.14');
  });

  test('does not borrow a minor release post for an unknown patch release', () => {
    const entry = {
      name: 'Bun.future',
      type: 'api',
      stability: 'stable',
      canonicalPage: 'https://bun.com/docs/reference/bun/future',
      allPages: ['https://bun.com/docs/reference/bun/future'],
      section: 'reference',
      releasedIn: '1.3.99',
    } satisfies DocCatalogEntry;
    const releases = new Map([
      [
        '1.3.0',
        {
          version: '1.3.0',
          title: 'Bun v1.3',
          url: 'https://bun.com/blog/bun-v1.3',
          guid: 'https://bun.com/blog/bun-v1.3',
          pubDate: '2025-11-21T10:11:00.000Z',
        },
      ],
    ]);

    stampVersionProvenance(entry, releases);

    expect(entry.releasedAt).toBeUndefined();
    expect(entry.releasedUrl).toBe('https://github.com/oven-sh/bun/releases/tag/bun-v1.3.99');
    expect(catalogReleaseProvenanceFindings([entry], releases)).toEqual([
      expect.objectContaining({
        token: 'Bun.future',
        locus: 'released',
        version: '1.3.99',
        issue: 'release-missing',
      }),
    ]);
  });

  test('reports exact official date and URL mismatches for scalar and hit evidence', () => {
    const releases = new Map([
      [
        '1.3.14',
        {
          version: '1.3.14',
          title: 'Bun v1.3.14',
          url: 'https://bun.com/blog/bun-v1.3.14',
          guid: 'https://bun.com/blog/bun-v1.3.14',
          pubDate: '2026-05-13T03:19:35.000Z',
        },
      ],
    ]);
    const entry = {
      name: 'Bun.example',
      type: 'api',
      stability: 'stable',
      canonicalPage: 'https://bun.com/reference/bun/example',
      allPages: ['https://bun.com/reference/bun/example'],
      section: 'reference',
      changedIn: '1.3.14',
      changedAt: '2026-05-12T00:00:00.000Z',
      changedUrl: 'https://bun.com/blog/bun-v1.3.13',
      releaseHits: [
        {
          version: '1.3.14',
          url: 'https://bun.com/blog/bun-v1.3.14',
          publishedAt: '2026-05-12T00:00:00.000Z',
          section: 'Changes',
          kind: 'chg',
        },
      ],
    } satisfies DocCatalogEntry;

    expect(catalogReleaseProvenanceFindings([entry], releases).map(row => row.issue)).toEqual([
      'date-mismatch',
      'url-mismatch',
      'date-mismatch',
    ]);
  });
});

describe('bun-docs-changelog overlay', () => {
  test('changelogKey normalizes Bun. prefix case', () => {
    expect(changelogKey('Bun.WebView')).toBe(changelogKey('bun.webview'));
  });

  test('changelogFor process.env surfaces fixedIn + blog anchor', () => {
    const cl = changelogFor('process.env');
    expect(cl.fixedIn).toBe('1.3.12');
    expect(cl.changeNote).toMatch(/process\.env/i);
    expect(cl.blogVersion).toBe('1.3.12');
    expect(cl.blogAnchor).toBe('bugfixes');
  });

  test('changelogFor Bun.WebView has releasedIn 1.3.12', () => {
    const cl = changelogFor('Bun.WebView');
    expect(cl.releasedIn).toBe('1.3.12');
    expect(cl.events.some(e => e.kind === 'feature')).toBe(true);
  });

  test('recent release overlay preserves the 1.3.12 and 1.3.14 behavior boundary', () => {
    expect(changelogFor('Bun.cron').releasedIn).toBe('1.3.12');
    expect(changelogFor('Bun.markdown.ansi').releasedIn).toBe('1.3.12');
    for (const token of ['FormData', 'Blob', 'ReadableStream', 'WebSocket']) {
      expect(changelogFor(token).fixedIn).toBe('1.3.14');
    }
  });

  test('changelogFor Bun.Terminal releasedIn 1.3.5 with PTY blog anchor', () => {
    // https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support
    const cl = changelogFor('Bun.Terminal');
    expect(cl.releasedIn).toBe('1.3.5');
    expect(cl.changedIn).toBe('1.3.14'); // Windows ConPTY follow-up
    expect(cl.blogVersion).toBe('1.3.5');
    expect(cl.blogAnchor).toBe('bun-terminal-api-for-pseudo-terminal-pty-support');
  });

  test('Observability profiling flags carry versioned blog anchors', () => {
    const cpu = changelogFor('--cpu-prof');
    expect(cpu.releasedIn).toBe('1.3.2');
    expect(cpu.blogAnchor).toBe('cpu-profiling-with-cpu-prof');

    const cpuMd = changelogFor('--cpu-prof-md');
    expect(cpuMd.releasedIn).toBe('1.4.0');
    expect(cpuMd.blogVersion).toBe('1.4.0');
    expect(cpuMd.blogAnchor).toBe('cpu-prof-md');

    const heap = changelogFor('--heap-prof');
    expect(heap.releasedIn).toBe('1.4.0');
    expect(heap.blogAnchor).toBe('heap-prof');

    const heapMd = changelogFor('--heap-prof-md');
    expect(heapMd.releasedIn).toBe('1.4.0');
    expect(heapMd.blogAnchor).toBe('heap-prof-md');
  });

  test('alias --no-orphans maps to noOrphans feature', () => {
    const cl = changelogFor('--no-orphans');
    expect(cl.releasedIn).toBe('1.3.14');
  });

  test('commitUrlFor builds github commit links', () => {
    expect(commitUrlFor('a227ad991b62')).toBe(
      'https://github.com/oven-sh/bun/commit/a227ad991b62'
    );
  });

  test('allChangelogEvents includes curated minVersion features', () => {
    const names = allChangelogEvents().map(e => changelogKey(e.name));
    expect(names).toContain(changelogKey('Bun.cron'));
  });

  test('applyChangelogOverlay stamps entry fields', () => {
    const e: DocCatalogEntry = {
      name: 'process.env',
      type: 'api',
      stability: 'stable',
      canonicalPage: 'https://bun.com/docs/runtime',
      allPages: ['https://bun.com/docs/runtime'],
      section: 'runtime',
    };
    applyChangelogOverlay(e);
    expect(e.fixedIn).toBe('1.3.12');
    expect(e.changeNote).toBeTruthy();
    expect(e.blogUrl).toBe('https://bun.com/blog/bun-v1.3.12#bugfixes');
  });
});

describe('catalog list table cells', () => {
  test('short labels compress type stability section', () => {
    expect(shortType('cli-flag')).toBe('flag');
    expect(shortType('config-key')).toBe('cfg');
    expect(shortStability('experimental')).toBe('exp');
    expect(shortStability('stable')).toBe('ok');
    expect(shortSection('bundler')).toBe('bundle');
    expect(shortSection('reference')).toBe('ref');
  });

  test('shortUrl strips docs and release prefixes', () => {
    expect(shortUrl('https://bun.com/docs/runtime/child-process#terminal-pty-support')).toBe(
      'runtime/child-process#terminal-pty-support',
    );
    expect(shortUrl('https://github.com/oven-sh/bun/releases/tag/bun-v1.3.5')).toBe('tag/bun-v1.3.5');
    expect(shortUrl('https://bun.com/blog/bun-v1.3.5#pty')).toBe('blog/bun-v1.3.5#pty');
  });

  test('listCells fills PIN and release/blog defaults when missing', () => {
    const e: DocCatalogEntry = {
      name: 'Bun.spawn',
      type: 'api',
      stability: 'stable',
      canonicalPage: 'https://bun.com/docs/runtime/child-process',
      allPages: ['https://bun.com/docs/runtime/child-process'],
      section: 'runtime',
    };
    const cells = listCells(e, { bunVersion: '1.4.0' });
    expect(cells.pin).toBe('1.4.0');
    expect(cells.ship).toBe('—');
    expect(cells.fix).toBe('—');
    expect(cells.ver).toBe('1.4.0');
    expect(cells.release).toBe('tag/bun-v1.4.0');
    expect(cells.blog).toBe('');
    expect(cells.doc).toBe('runtime/child-process');
    expect(cells.stab).toBe('ok');
  });

  test('listCells prefers ship version for VER over pin', () => {
    const e: DocCatalogEntry = {
      name: 'Bun.Terminal',
      type: 'api',
      stability: 'stable',
      releasedIn: '1.3.5',
      fixedIn: undefined,
      changedIn: '1.3.14',
      verifiedOn: '1.4.0',
      canonicalPage: 'https://bun.com/docs/runtime/child-process',
      allPages: ['https://bun.com/docs/runtime/child-process'],
      section: 'runtime',
      releaseUrl: 'https://github.com/oven-sh/bun/releases/tag/bun-v1.3.5',
      blogUrl: 'https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support',
    };
    const cells = listCells(e, { bunVersion: '1.4.0' });
    expect(cells.ship).toBe('1.3.5');
    expect(cells.chg).toBe('1.3.14');
    expect(cells.pin).toBe('1.4.0');
    expect(cells.ver).toBe('1.3.5');
    expect(cells.blog).toContain('blog/bun-v1.3.5');
  });

  test('buildListColumns default includes SHIP FIX CHG PIN', () => {
    const keys = buildListColumns({}).map(c => c.key);
    expect(keys).toContain('ship');
    expect(keys).toContain('fix');
    expect(keys).toContain('chg');
    expect(keys).toContain('pin');
    expect(keys).toContain('doc');
  });

  test('formatListTable renders header and a row', () => {
    const e: DocCatalogEntry = {
      name: 'Bun.Terminal',
      type: 'api',
      stability: 'stable',
      releasedIn: '1.3.5',
      verifiedOn: '1.4.0',
      canonicalPage: 'https://bun.com/docs/runtime/child-process',
      allPages: ['https://bun.com/docs/runtime/child-process'],
      section: 'runtime',
    };
    const lines = formatListTable([e], { bunVersion: '1.4.0' }, buildListColumns({}));
    expect(lines[0]).toContain('NAME');
    expect(lines[0]).toContain('SHIP');
    expect(lines[2]).toContain('Bun.Terminal');
    expect(lines[2]).toContain('1.3.5');
  });
});

describe('frozen guide examples', () => {
  test('read-env / set-env / timezone / util guides carry lang+code', async () => {
    const { GUIDE_EXAMPLES, TOKEN_GUIDE_PATH, guideExamplesForPage, guideExamplesForToken } =
      await import('../tools/bun-docs-guide-examples.ts');
    expect(GUIDE_EXAMPLES['guides/runtime/timezone']?.some(e => e.lang === 'ts')).toBe(true);
    expect(guideExamplesForPage('https://bun.com/docs/guides/runtime/set-env').some(e => e.lang === 'ini')).toBe(
      true
    );
    expect(guideExamplesForPage('https://bun.com/docs/guides/runtime/read-env.md').length).toBeGreaterThan(0);
    expect(guideExamplesForToken('Bun.which')[0]?.body).toContain('Bun.which');
    expect(guideExamplesForToken('Bun.pathToFileURL')[0]?.body).toContain('Bun.pathToFileURL');
    expect(guideExamplesForToken('Bun.fileURLToPath')[0]?.body).toContain('Bun.fileURLToPath');
    expect(guideExamplesForToken('fileURLToPath')[0]?.body).toContain('node:url');
    expect(guideExamplesForToken('pathToFileURL')[0]?.body).toContain('node:url');
    expect(guideExamplesForToken('import.meta.dir')[0]?.body).toContain('import.meta.dir');
    expect(guideExamplesForToken('process.env')[0]?.body).toContain('process.env');
    expect(guideExamplesForToken('--define')[0]?.body).toContain('--define');
    expect(
      guideExamplesForPage('https://bun.com/docs/runtime#transpilation-language-features').length
    ).toBeGreaterThan(0);
    expect(guideExamplesForToken('bun run -')[0]?.body).toContain('bun run -');
    expect(guideExamplesForToken('URLPattern')[0]?.body).toContain('/users/:id');
    expect(guideExamplesForToken('server.port')[0]?.body).toContain('port: 8080');
    expect(guideExamplesForToken('port: 0')?.some(e => e.body.includes('port: 0'))).toBe(true);
    expect(guideExamplesForToken('BUN_PORT')?.some(e => e.body.includes('BUN_PORT=4002'))).toBe(
      true
    );
    expect(guideExamplesForToken('Bun.serve')[0]?.body).toContain('routes');
    expect(guideExamplesForToken('server.stop')[0]?.body).toContain('server.stop');
    expect(guideExamplesForToken('http3')[0]?.body).toContain('http3: true');
    expect(guideExamplesForToken('idleTimeout')[0]?.body).toContain('idleTimeout: 30');
    expect(guideExamplesForToken('Server')[0]?.body).toContain('interface Server');
    expect(guideExamplesForToken('Bun.inspect')[0]?.body).toContain('Bun.inspect(obj)');
    expect(guideExamplesForToken('Bun.inspect()')[0]?.body).toContain('Uint8Array');
    expect(guideExamplesForToken('Bun.inspect.custom')[0]?.body).toContain('[Bun.inspect.custom]');
    expect(guideExamplesForToken('Bun.markdown.html')[0]?.body).toContain('Bun.markdown.html(');
    // Intentional ansi split: TOKEN_GUIDE_PATH → #bun-markdown-ansi fence; docsUrl stays #ansi-terminal-output
    expect(TOKEN_GUIDE_PATH['Bun.markdown.ansi']).toBe('runtime/markdown#bun-markdown-ansi');
    expect(guideExamplesForToken('Bun.markdown.ansi')[0]?.body).toContain('Bun.markdown.ansi(');
    expect(TOKEN_GUIDE_PATH['Bun.markdown.Options']).toBe('runtime/markdown#options');
    expect(guideExamplesForToken('Bun.markdown.Options')[0]?.body).toContain('tables: true');
    expect(TOKEN_GUIDE_PATH['Bun.markdown.AnsiTheme']).toBe('runtime/markdown#bun-markdown-ansi');
    expect(guideExamplesForToken('Bun.markdown.AnsiTheme')[0]?.body).toContain('Bun.markdown.ansi(');
    expect(TOKEN_GUIDE_PATH['ansi-terminal-output']).toBe('runtime/markdown#ansi-terminal-output');
    expect(guideExamplesForToken('ansi-terminal-output')[0]?.body).toContain(
      'Bun.markdown.render('
    );
    expect(guideExamplesForToken('Bun.markdown.render')[0]?.body).toContain('Bun.markdown.render(');
    expect(guideExamplesForToken('Bun.markdown.react')[0]?.body).toContain('Bun.markdown.react(text)');
    expect(guideExamplesForToken('component-overrides')[0]?.body).toContain('pre: Code');
    expect(guideExamplesForToken('available-overrides')[0]?.body).toContain('Bun.markdown.react(');
    expect(guideExamplesForToken('options')[0]?.body).toContain('tables: true');
    expect(guideExamplesForToken('options')[1]?.body).toContain('latexMath: false');
    expect(guideExamplesForToken('autolinks')[0]?.body).toContain('autolinks: { url: true, www: true }');
    expect(guideExamplesForToken('heading-ids')[0]?.body).toContain('headings: { ids: true }');
    expect(guideExamplesForToken('callback-signature')[0]?.body).toContain('null/undefined');
    expect(guideExamplesForToken('block-callbacks')[0]?.body).toContain('blockquote:');
    expect(guideExamplesForToken('list-item-meta')[0]?.body).toContain('checked');
    expect(guideExamplesForToken('inline-callbacks')[0]?.body).toContain('strikethrough:');
    expect(guideExamplesForToken('examples')[0]?.body).toContain('class="heading heading-');
    expect(guideExamplesForToken('custom-html-with-classes')[0]?.body).toContain(
      'class="heading heading-'
    );
    expect(guideExamplesForToken('stripping-all-formatting')[0]?.body).toContain(
      'heading: children => children'
    );
    expect(guideExamplesForToken('code-block-syntax-highlighting')[0]?.body).toContain(
      'meta?.language'
    );
    expect(guideExamplesForToken('nested-list-numbering')[0]?.body).toContain('listItem:');
    expect(guideExamplesForToken('server-side-rendering')[0]?.body).toContain('renderToString');
    expect(guideExamplesForToken('parser-options')[0]?.body).toContain('autolinks: true');
    expect(guideExamplesForToken('parser-options-2')[0]?.body).toContain('headings: { ids: true }');
    expect(guideExamplesForToken('react-18-and-older')[0]?.body).toContain('reactVersion: 18');
    expect(guideExamplesForToken('react-18-and-older')[0]?.body).toContain('transitional');
    expect(guideExamplesForToken('BUN_OPTIONS')[0]?.body).toContain('BUN_OPTIONS="--cpu-prof"');
    expect(guideExamplesForToken('runtime-arguments-via-bun-options')[0]?.body).toContain(
      '--smol --cpu-prof-md'
    );
    expect(guideExamplesForToken('embedding-runtime-arguments')[0]?.body).toContain(
      '--compile-exec-argv='
    );
    expect(guideExamplesForToken('file-uploads')[0]?.body).toContain('await req.formData()');
    expect(guideExamplesForToken('req.formData')[0]?.body).toContain('Bun.write(');
    expect(
      guideExamplesForToken('Upload files via HTTP using FormData')[0]?.body
    ).toContain('profilePicture');
    expect(guideExamplesForToken('Worker')[0]?.body).toContain('new Worker');
    expect(guideExamplesForToken('worker.ref')[0]?.body).toContain('worker.ref()');
    expect(guideExamplesForToken('worker.unref')[0]?.body).toContain('worker.unref()');
    expect(guideExamplesForToken('worker.terminate')[0]?.body).toContain('worker.terminate()');
    expect(guideExamplesForToken('Bun.isMainThread')[0]?.body).toContain('Bun.isMainThread');
    expect(guideExamplesForToken('Worker smol')[0]?.body).toContain('smol: true');
    const inspectTable = guideExamplesForToken('Bun.inspect.table');
    expect(inspectTable).toHaveLength(3);
    expect(inspectTable[0]?.body).toContain('Bun.inspect.table([');
    expect(inspectTable.some(e => e.body.includes('["a", "c"]'))).toBe(true);
    expect(inspectTable.some(e => e.body.includes('colors: true'))).toBe(true);
    expect(guideExamplesForToken('BunInspectOptions')[0]?.body).toContain('sorted: true');
    expect(
      guideExamplesForPage(
        'https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options'
      )
    ).toHaveLength(3);
    expect(
      guideExamplesForPage(
        'https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname'
      ).length
    ).toBeGreaterThan(0);
    expect(
      guideExamplesForPage('https://bun.com/docs/runtime/http/server#reference').length
    ).toBeGreaterThan(0);
    expect(
      guideExamplesForPage('https://bun.com/blog/bun-v1.3.4#urlpattern-api').length
    ).toBeGreaterThan(0);
    expect(
      guideExamplesForPage(
        'https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster'
      ).length
    ).toBeGreaterThan(0);
  });
});

describe('inspect family catalog relations', () => {
  test('built catalog pins family docsUrl + drops Bun.serve junk examples', async () => {
    const cat = (await Bun.file(`${import.meta.dir}/../tools/bun-docs-catalog.json`).json()) as {
      entries: Array<{
        name: string;
        description?: string;
        docsUrl?: string;
        related?: string[];
        examples?: Array<{ body: string }>;
      }>;
    };
    const byName = new Map(cat.entries.map(e => [e.name, e]));
    expect(byName.get('Bun.inspect')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/utils#bun-inspect'
    );
    expect(byName.get('Bun.inspect.custom')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/utils#bun-inspect-custom'
    );
    expect(byName.get('Bun.inspect.table')?.docsUrl).toContain(
      'bun-inspect-table-tabulardata-properties-options'
    );
    expect(byName.get('BunInspectOptions')?.docsUrl).toBe(
      'https://bun.com/reference/bun/BunInspectOptions'
    );
    const custom = byName.get('Bun.inspect.custom')!;
    expect(custom.description).toContain('Override it to customize');
    expect(custom.examples?.[0]?.body).toContain('[Bun.inspect.custom]');
    expect(custom.examples?.[0]?.body).toContain('console.log(foo); // => "foo"');
    const inspect = byName.get('Bun.inspect')!;
    expect(inspect.examples?.some(x => x.body.includes('Bun.serve'))).toBe(false);
    expect(inspect.examples?.[0]?.body).toContain('Bun.inspect(obj)');
    expect(inspect.related?.slice(0, 3)).toEqual([
      'Bun.inspect.custom',
      'Bun.inspect.table',
      'BunInspectOptions',
    ]);
    expect(byName.get('available-overrides')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#available-overrides'
    );
    expect(byName.get('component-overrides')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#component-overrides'
    );
    expect(byName.get('Bun.markdown.react')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#bun-markdown-react'
    );
    expect(byName.get('Bun.markdown.react')?.related?.slice(0, 2)).toEqual([
      'Bun.markdown.ComponentOverrides',
      'Bun.markdown.ReactOptions',
    ]);
    expect(byName.get('Bun.markdown.react')?.related).toContain('component-overrides');
    expect(byName.get('Bun.markdown.react')?.related).toContain('parser-options-2');
    expect(byName.get('available-overrides')?.description).toContain(
      'Every HTML tag produced'
    );
    expect(byName.get('options')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#options'
    );
    expect(byName.get('autolinks')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#autolinks'
    );
    expect(byName.get('heading-ids')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#heading-ids'
    );
    expect(byName.get('parser-options')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#parser-options'
    );
    expect(byName.get('parser-options-2')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#parser-options-2'
    );
    expect(byName.get('react-18-and-older')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#react-18-and-older'
    );
    expect(byName.get('callback-signature')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#callback-signature'
    );
    expect(byName.get('block-callbacks')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#block-callbacks'
    );
    expect(byName.get('list-item-meta')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#list-item-meta'
    );
    expect(byName.get('inline-callbacks')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#inline-callbacks'
    );
    expect(byName.get('examples')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#examples'
    );
    expect(byName.get('examples')?.examples?.[0]?.body).toContain('class="heading heading-');
    expect(byName.get('Bun.markdown.render')?.related).toContain('examples');
    expect(byName.get('custom-html-with-classes')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#custom-html-with-classes'
    );
    expect(byName.get('stripping-all-formatting')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#stripping-all-formatting'
    );
    expect(byName.get('code-block-syntax-highlighting')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#code-block-syntax-highlighting'
    );
    expect(byName.get('custom-html-with-classes')?.examples?.[0]?.body).toContain(
      'class="heading heading-'
    );
    expect(byName.get('stripping-all-formatting')?.examples?.[0]?.body).toContain(
      'heading: children => children'
    );
    expect(byName.get('code-block-syntax-highlighting')?.examples?.[0]?.body).toContain(
      'meta?.language'
    );
    expect(byName.get('examples')?.related).toContain('custom-html-with-classes');
    expect(byName.get('examples')?.related).toContain('stripping-all-formatting');
    expect(byName.get('examples')?.related).toContain('code-block-syntax-highlighting');
    expect(byName.get('Bun.markdown.render')?.related).toContain('Bun.markdown.RenderCallbacks');
    expect(byName.get('server-side-rendering')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#server-side-rendering'
    );
    expect(byName.get('react-18-and-older')?.description).toContain('transitional');
    expect(byName.get('options')?.examples?.[0]?.body).toContain('tables: true');
    expect(byName.get('options')?.examples?.[1]?.body).toContain('wikiLinks: false');
    expect(byName.get('autolinks')?.examples?.[0]?.body).toContain('autolinks: true');
    expect(byName.get('heading-ids')?.examples?.[0]?.body).toContain(
      'headings: { ids: true }'
    );
    expect(byName.get('list-item-meta')?.examples?.[0]?.body).toContain('listItem:');
    expect(byName.get('inline-callbacks')?.examples?.[0]?.body).toContain('codespan:');
    expect(byName.get('parser-options-2')?.examples?.[0]?.body).toContain(
      'headings: { ids: true }'
    );
    // Intentional ansi split: curated docsUrl = official #ansi-terminal-output; examples from #bun-markdown-ansi
    expect(byName.get('Bun.markdown.ansi')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#ansi-terminal-output'
    );
    expect(byName.get('Bun.markdown.ansi')?.description).toContain('#bun-markdown-ansi');
    expect(byName.get('Bun.markdown.ansi')?.examples?.[0]?.body).toContain(
      'Bun.markdown.ansi('
    );
    expect(byName.get('Bun.markdown.Options')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#options'
    );
    expect(byName.get('Bun.markdown.Options')?.description).toContain(
      'reference/bun/markdown#bun.markdown.Options'
    );
    expect(byName.get('Bun.markdown.Options')?.examples?.[0]?.body).toContain('tables: true');
    expect(byName.get('Bun.markdown.Options')?.examples?.[1]?.body).toContain('latexMath: false');
    expect(byName.get('Bun.markdown.Options')?.related).toContain('Bun.markdown.ReactOptions');
    expect(byName.get('Bun.markdown.AnsiTheme')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#ansi-terminal-output'
    );
    expect(byName.get('Bun.markdown.AnsiTheme')?.description).toContain('kittyGraphics');
    expect(byName.get('Bun.markdown.AnsiTheme')?.examples?.[0]?.body).toContain(
      'kittyGraphics: false'
    );
    expect(byName.get('Bun.markdown.ReactOptions')?.docsUrl).toBe(
      'https://bun.com/reference/bun/markdown#bun.markdown.ReactOptions'
    );
    expect(byName.get('Bun.markdown.ReactOptions')?.examples?.[0]?.body).toContain(
      'reactVersion: 18'
    );
    expect(byName.get('Bun.markdown.RenderCallbacks')?.docsUrl).toBe(
      'https://bun.com/reference/bun/markdown#bun.markdown.RenderCallbacks'
    );
    expect(byName.get('Bun.markdown.RenderCallbacks')?.examples?.[0]?.body).toContain(
      'RenderCallbacks'
    );
    expect(byName.get('Bun.markdown.ComponentOverrides')?.docsUrl).toBe(
      'https://bun.com/reference/bun/markdown#bun.markdown.ComponentOverrides'
    );
    expect(byName.get('Bun.markdown.ComponentOverrides')?.examples?.[0]?.body).toContain(
      'ComponentOverrides'
    );
    expect(byName.get('Bun.markdown.HeadingMeta')?.docsUrl).toBe(
      'https://bun.com/reference/bun/markdown#bun.markdown.HeadingMeta'
    );
    expect(byName.get('Bun.markdown.HeadingMeta')?.examples?.[0]?.body).toContain('HeadingMeta');
    expect(byName.get('Bun.markdown.ListItemMeta')?.docsUrl).toBe(
      'https://bun.com/reference/bun/markdown#bun.markdown.ListItemMeta'
    );
    expect(byName.get('Bun.markdown.CodeBlockMeta')?.examples?.[0]?.body).toContain(
      'CodeBlockMeta'
    );
    expect(byName.get('Bun.markdown.CellMeta')?.description).toContain('TableCellMeta');
    expect(byName.get('Bun.markdown.HeadingProps')?.docsUrl).toBe(
      'https://bun.com/reference/bun/markdown#bun.markdown.HeadingProps'
    );
    expect(byName.get('Bun.markdown.CodeBlockProps')?.examples?.[0]?.body).toContain(
      'CodeBlockProps'
    );
    expect(byName.get('Bun.markdown.RenderCallbacks')?.related?.slice(0, 3)).toEqual([
      'Bun.markdown.HeadingMeta',
      'Bun.markdown.ListItemMeta',
      'Bun.markdown.CodeBlockMeta',
    ]);
    expect(byName.get('Bun.markdown.ComponentOverrides')?.related?.slice(0, 3)).toEqual([
      'Bun.markdown.HeadingProps',
      'Bun.markdown.LinkProps',
      'Bun.markdown.CodeBlockProps',
    ]);
    expect(byName.get('ansi-terminal-output')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/markdown#ansi-terminal-output'
    );
    expect(byName.get('ansi-terminal-output')?.examples?.[0]?.body).toContain(
      'Bun.markdown.render('
    );
    expect(byName.get('options')?.related).toContain('autolinks');
    expect(byName.get('options')?.related).toContain('heading-ids');
    expect(byName.get('Bun.markdown.render')?.related).toContain('list-item-meta');
    expect(byName.get('Bun.markdown.render')?.related).toContain('inline-callbacks');
    // Cookbook children survive the relatedTokens top-8 cap (not only via examples.*)
    expect(byName.get('Bun.markdown.render')?.related).toContain('omitting-elements');
    expect(byName.get('Bun.markdown.render')?.related).toContain('ansi-terminal-output');
    expect(byName.get('Bun.markdown.render')?.related).toContain('nested-list-numbering');
    expect(byName.get('BUN_OPTIONS')?.docsUrl).toBe(
      'https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options'
    );
    expect(byName.get('BUN_OPTIONS')?.description).toContain('without recompiling');
    expect(byName.get('BUN_OPTIONS')?.examples?.[0]?.body).toContain('BUN_OPTIONS="--cpu-prof"');
    expect(byName.get('BUN_OPTIONS')?.related?.slice(0, 2)).toEqual([
      'runtime-arguments-via-bun-options',
      'embedding-runtime-arguments',
    ]);
    expect(byName.get('file-uploads')?.docsUrl).toBe(
      'https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata'
    );
    expect(byName.get('file-uploads')?.description).toContain('FormData');
    expect(byName.get('file-uploads')?.examples?.[0]?.body).toContain('await req.formData()');
    expect(byName.get('req.formData')?.docsUrl).toBe(
      'https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata'
    );
    expect(byName.get('Worker')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/workers#creating-a-worker'
    );
    expect(byName.get('Worker')?.docsUrl).not.toContain('bundler/executables');
    expect(byName.get('worker.ref')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/workers#worker-ref'
    );
    expect(byName.get('worker.unref')?.docsUrl).toBe(
      'https://bun.com/docs/runtime/workers#worker-unref'
    );
    expect(byName.get('worker.ref')?.description).toContain('ref\'d by default');
    expect(byName.get('Bun.isMainThread')?.description).toContain('main thread');
    expect(byName.get('Bun.isMainThread')?.description).not.toContain('<Warning>');
    expect(byName.get('Worker')?.related?.slice(0, 2)).toEqual(['worker.ref', 'worker.unref']);
    expect(byName.get('executables Worker')?.docsUrl).toBe(
      'https://bun.com/docs/bundler/executables#worker'
    );
    expect(byName.get('Concurrency')?.docsUrl).toBe('https://bun.com/docs/runtime/workers');
    expect(byName.get('Concurrency')?.docsUrl).not.toContain('global-store');
    expect(byName.get('Concurrency')?.description).toContain('Runtime docs nav group');
    expect(byName.get('Concurrency')?.related?.slice(0, 2)).toEqual(['Workers', 'Worker']);
    expect(byName.get('install concurrency')?.docsUrl).toBe(
      'https://bun.com/docs/pm/global-store#concurrency'
    );
    expect(byName.get('global-store concurrency')?.docsUrl).toBe(
      'https://bun.com/docs/pm/global-store#concurrency'
    );
    expect(byName.get('--isolate')?.docsUrl).toBe(
      'https://bun.com/docs/test/parallel#isolate'
    );
    expect(byName.get('--parallel')?.docsUrl).toBe(
      'https://bun.com/docs/test/parallel#parallel'
    );
    expect(byName.get('--parallel')?.description).toContain('bun test --parallel');
    expect(byName.get('--parallel')?.description).toContain('bun run --parallel');
    expect(byName.get('--shard')?.docsUrl).toBe(
      'https://bun.com/docs/test/parallel#one-timings-file-per-shard'
    );
    expect(byName.get('--changed')?.docsUrl).toBe(
      'https://bun.com/blog/bun-v1.3.13#bun-test-changed'
    );
    expect(byName.get('--isolate')?.examples?.[0]?.body).toContain('bun test --isolate');
    expect(byName.get('--shard')?.examples?.[0]?.body).toContain('--shard=1/3');
    expect(byName.get('--changed')?.examples?.[0]?.body).toContain('bun test --changed');
    expect(byName.get('bun test --parallel')?.type).toBe('cli-flag');
    expect(byName.get('bun test --parallel')?.related?.slice(0, 4)).toEqual([
      '--isolate',
      '--shard',
      '--changed',
      'bun run --parallel',
    ]);
    expect(byName.get('JEST_WORKER_ID')?.type).toBe('env-var');
    expect(byName.get('BUN_TEST_WORKER_ID')?.docsUrl).toBe(
      'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel'
    );
    expect(byName.get('bun run --parallel')?.docsUrl).toBe(
      'https://bun.com/docs/pm/filter#parallel-and-sequential-mode'
    );
    expect(byName.get('bun run --parallel')?.releasedIn).toBe('1.3.9');
    expect(byName.get('bun run --parallel')?.examples?.[0]?.body).toContain(
      'bun run --parallel build test'
    );
    expect(byName.get('bun test flags')?.docsUrl).toBe(
      'https://bun.com/docs/test/parallel#parallel'
    );
    expect(byName.get('bun test flags')?.description).toContain('bun-test-flags.md');
    expect(byName.get('--parallel')?.examples?.[0]?.body).toContain(
      'pm/filter#parallel-and-sequential-mode'
    );
    // SHA-3 (v1.3.13) — blog ship note; audit SSOT uses CryptoHasher('sha3-256')
    // normalizeName collapses sha3-256 ↔ SHA3-256 (display name prefers first CANONICAL key)
    expect(byName.get('SHA3-256')?.docsUrl).toBe(
      'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto'
    );
    expect(byName.get('SHA3')?.docsUrl).toBe(
      'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto'
    );
    expect(byName.get('SHA3')?.releasedIn).toBe('1.3.13');
    expect(byName.get('SHA3-256')?.examples?.[0]?.body).toContain('createHash("sha3-256")');
    expect(byName.get('SHA3-256')?.examples?.[0]?.body).toContain('SHA3-256');
    expect(byName.get('Bun.CryptoHasher')?.description).toContain('sha256');
  });

  test('bunApiFamilyRoot clusters Bun.inspect.*', () => {
    expect(bunApiFamilyRoot('Bun.inspect')).toBe('Bun.inspect');
    expect(bunApiFamilyRoot('Bun.inspect.custom')).toBe('Bun.inspect');
    expect(bunApiFamilyRoot('Bun.inspect.table(tabularData, properties, options)')).toBe(
      'Bun.inspect'
    );
    expect(bunApiFamilyRoot('Bun.password.hash')).toBe('Bun.password');
  });

  test('seedPageRelations prefers dotted-family siblings before page peers', () => {
    const utils = 'https://bun.com/docs/runtime/utils';
    const entries: DocCatalogEntry[] = [
      {
        name: 'Bun.deepEquals',
        type: 'api',
        stability: 'stable',
        canonicalPage: utils,
        allPages: [utils],
        section: 'runtime',
      },
      {
        name: 'Bun.inspect',
        type: 'api',
        stability: 'stable',
        canonicalPage: utils,
        allPages: [utils],
        section: 'runtime',
      },
      {
        name: 'Bun.inspect.custom',
        type: 'api',
        stability: 'stable',
        canonicalPage: utils,
        allPages: [utils],
        section: 'runtime',
      },
      {
        name: 'Bun.inspect.table',
        type: 'api',
        stability: 'stable',
        canonicalPage: utils,
        allPages: [utils],
        section: 'runtime',
      },
      {
        name: 'Bun.env',
        type: 'api',
        stability: 'stable',
        canonicalPage: utils,
        allPages: [utils],
        section: 'runtime',
      },
    ];
    seedPageRelations(entries);
    const inspect = entries.find(e => e.name === 'Bun.inspect')!;
    expect(inspect.related?.[0]).toBe('Bun.inspect.custom');
    expect(inspect.related).toContain('Bun.inspect.table');
  });

  test('applyCuratedRelatedTokens fronts BunInspectOptions on Bun.inspect', () => {
    const utils = 'https://bun.com/docs/runtime/utils';
    const ref = 'https://bun.com/reference/bun/BunInspectOptions';
    const entries: DocCatalogEntry[] = [
      {
        name: 'Bun.inspect',
        type: 'api',
        stability: 'stable',
        canonicalPage: utils,
        allPages: [utils],
        section: 'runtime',
        related: ['Bun.deepEquals'],
      },
      {
        name: 'Bun.inspect.custom',
        type: 'api',
        stability: 'stable',
        canonicalPage: utils,
        allPages: [utils],
        section: 'runtime',
      },
      {
        name: 'Bun.inspect.table',
        type: 'api',
        stability: 'stable',
        canonicalPage: utils,
        allPages: [utils],
        section: 'runtime',
      },
      {
        name: 'BunInspectOptions',
        type: 'api',
        stability: 'stable',
        canonicalPage: ref,
        allPages: [ref],
        section: 'reference',
      },
      {
        name: '--console-depth',
        type: 'cli-flag',
        stability: 'stable',
        canonicalPage: 'https://bun.com/docs/runtime/console',
        allPages: ['https://bun.com/docs/runtime/console'],
        section: 'runtime',
      },
    ];
    applyCuratedRelatedTokens(entries);
    const inspect = entries.find(e => e.name === 'Bun.inspect')!;
    expect(inspect.related?.slice(0, 3)).toEqual([
      'Bun.inspect.custom',
      'Bun.inspect.table',
      'BunInspectOptions',
    ]);
  });
});

describe('runtime/markdown index ratchet', () => {
  test('every docs-index markdown anchor has curated token or guide path', async () => {
    const idx = (await Bun.file(`${import.meta.dir}/../tools/bun-docs-index.json`).json()) as {
      entries: Array<{ url?: string; anchors?: string[] }>;
    };
    const page = idx.entries.find(e => e.url?.includes('/runtime/markdown'));
    expect(page?.anchors?.length).toBeGreaterThan(0);
    const curatedPaths = new Set(
      CURATED_ENTRIES.filter(c => c.path.startsWith('runtime/markdown')).map(c => c.path)
    );
    const missing: string[] = [];
    for (const anchor of page!.anchors!) {
      const path = `runtime/markdown#${anchor}`;
      const hasCurated = curatedPaths.has(path);
      const hasGuide = Boolean(GUIDE_EXAMPLES[path]?.length);
      const hasTokenGuide = Object.values(TOKEN_GUIDE_PATH).includes(path);
      if (!hasCurated && !hasGuide && !hasTokenGuide) missing.push(anchor);
    }
    expect(missing).toEqual([]);
  });
});

describe('Bun.markdown type-surface integrity', () => {
  /** Core APIs + primary types (#665) + Meta/Props leaves (reference/bun/markdown). */
  const CORE_MARKDOWN_SURFACE = [
    'Bun.markdown',
    'Bun.markdown.html',
    'Bun.markdown.ansi',
    'Bun.markdown.render',
    'Bun.markdown.react',
    'Bun.markdown.Options',
    'Bun.markdown.AnsiTheme',
    'Bun.markdown.ReactOptions',
    'Bun.markdown.RenderCallbacks',
    'Bun.markdown.ComponentOverrides',
  ] as const;

  const MARKDOWN_META_PROPS_SURFACE = [
    'Bun.markdown.HeadingMeta',
    'Bun.markdown.ListMeta',
    'Bun.markdown.ListItemMeta',
    'Bun.markdown.CodeBlockMeta',
    'Bun.markdown.LinkMeta',
    'Bun.markdown.ImageMeta',
    'Bun.markdown.CellMeta',
    'Bun.markdown.HeadingProps',
    'Bun.markdown.LinkProps',
    'Bun.markdown.ImageProps',
    'Bun.markdown.ListItemProps',
    'Bun.markdown.OrderedListProps',
    'Bun.markdown.ChildrenProps',
    'Bun.markdown.CellProps',
    'Bun.markdown.CodeBlockProps',
  ] as const;

  test('catalog preserves the docs unstable status for the namespace', () => {
    for (const name of [...CORE_MARKDOWN_SURFACE, ...MARKDOWN_META_PROPS_SURFACE]) {
      expect(inferStability(name, '')).toBe('experimental');
    }
  });

  test('core Bun.markdown* surface has CANONICAL_REFS + curated + guide examples', async () => {
    const { CANONICAL_REFS } = await import('../tools/bun-doc-refs.ts');
    const curatedTerms = new Set(CURATED_ENTRIES.map(c => c.term));
    const missingCanon: string[] = [];
    const missingCurated: string[] = [];
    const missingGuide: string[] = [];
    for (const name of CORE_MARKDOWN_SURFACE) {
      if (!CANONICAL_REFS[name]) missingCanon.push(name);
      if (!curatedTerms.has(name)) missingCurated.push(name);
      const guidePath = TOKEN_GUIDE_PATH[name] ?? CURATED_ENTRIES.find(c => c.term === name)?.path;
      if (!guidePath || !GUIDE_EXAMPLES[guidePath]?.length) missingGuide.push(name);
    }
    expect({ missingCanon, missingCurated, missingGuide }).toEqual({
      missingCanon: [],
      missingCurated: [],
      missingGuide: [],
    });
  });

  test('Meta/Props leaf types have CANONICAL_REFS + curated + guide examples', async () => {
    const { CANONICAL_REFS, resolveApiAlias } = await import('../tools/bun-doc-refs.ts');
    const curatedTerms = new Set(CURATED_ENTRIES.map(c => c.term));
    const missingCanon: string[] = [];
    const missingCurated: string[] = [];
    const missingGuide: string[] = [];
    for (const name of MARKDOWN_META_PROPS_SURFACE) {
      if (!CANONICAL_REFS[name]) missingCanon.push(name);
      if (!curatedTerms.has(name)) missingCurated.push(name);
      const guidePath = TOKEN_GUIDE_PATH[name] ?? CURATED_ENTRIES.find(c => c.term === name)?.path;
      if (!guidePath || !GUIDE_EXAMPLES[guidePath]?.length) missingGuide.push(name);
    }
    expect({ missingCanon, missingCurated, missingGuide }).toEqual({
      missingCanon: [],
      missingCurated: [],
      missingGuide: [],
    });
    // Informal names → bun-types interface names
    expect(resolveApiAlias('Bun.markdown.CodeMeta')).toBe('Bun.markdown.CodeBlockMeta');
    expect(resolveApiAlias('Bun.markdown.TableCellMeta')).toBe('Bun.markdown.CellMeta');
  });

  test('inventory Bun.markdown interfaces (depth 1) are covered by CANONICAL_REFS', async () => {
    const { CANONICAL_REFS } = await import('../tools/bun-doc-refs.ts');
    const inv = (await Bun.file(
      `${import.meta.dir}/../tools/bun-types-inventory.json`
    ).json()) as { members: Array<{ kind: string; parent?: string; setting: string }> };
    const ifaces = inv.members
      .filter(m => m.kind === 'interface' && m.parent === 'Bun.markdown')
      .map(m => m.setting)
      .sort();
    expect(ifaces.length).toBeGreaterThan(10);
    const missing = ifaces.filter(s => !CANONICAL_REFS[s]);
    // AnsiTheme/Options use guide loci in CANONICAL_REFS (still present as keys)
    expect(missing).toEqual([]);
  });

  test('every Bun.markdown* api-index name resolves via CANONICAL_REFS', async () => {
    const { CANONICAL_REFS } = await import('../tools/bun-doc-refs.ts');
    const apiIndex = (await Bun.file(
      `${import.meta.dir}/../tools/bun-api-index.json`
    ).json()) as { apis: Array<{ name: string; docs: string }> };
    const markdownApis = apiIndex.apis.filter(a => a.name.startsWith('Bun.markdown'));
    expect(markdownApis.length).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const { name, docs } of markdownApis) {
      const canon = CANONICAL_REFS[name];
      if (!canon || canon !== docs) missing.push(`${name} → ${docs} (canon=${canon ?? '∅'})`);
    }
    expect(missing).toEqual([]);
  });

  /**
   * DEFERRED: bun-docs-index.json is llms.txt-driven (/docs only).
   * reference/bun/markdown TypeDoc anchors (#bun.markdown.*) are NOT in llms.txt.
   * Page presence lives in tools/bun-docs-feeds.json (reference) via
   * `bun tools/bun-docs-reference-index.ts index`.
   * Next owner (when scraping TypeDoc HTML is wanted):
   *   bun tools/bun-docs-reference-index.ts index --force
   *   # then extend tools/bun-docs-reference-index.ts (or a sibling) to harvest
   *   # heading/id anchors from https://bun.com/reference/bun/markdown into
   *   # feeds/reference or a dedicated reference-anchors.json — do NOT overload
   *   # bun-docs-index-gen.ts llms scrape (breaks docs-index schema consumers).
   */
  test('docs-index stays docs-plane only (reference markdown page not required)', async () => {
    const index = (await Bun.file(
      `${import.meta.dir}/../tools/bun-docs-index.json`
    ).json()) as { entries: Array<{ url: string }> };
    const hasReferenceMarkdown = index.entries.some(e =>
      e.url.includes('/reference/bun/markdown')
    );
    expect(hasReferenceMarkdown).toBe(false);
    const hasGuideMarkdown = index.entries.some(e => e.url.includes('/docs/runtime/markdown'));
    expect(hasGuideMarkdown).toBe(true);
  });
});

describe('frozen CANONICAL_REFS env / npmrc', () => {
  test('Read/Set environment variables + process.env + .npmrc point at institutional pages', async () => {
    const { CANONICAL_REFS } = await import('../tools/bun-doc-refs.ts');
    expect(CANONICAL_REFS['Bun.markdown reference']).toBe(
      'https://bun.com/reference/bun/markdown'
    );
    expect(CANONICAL_REFS['Bun.markdown types']).toBe('https://bun.com/reference/bun/markdown');
    expect(CANONICAL_REFS['Read environment variables']).toBe(
      'https://bun.com/docs/guides/runtime/read-env'
    );
    expect(CANONICAL_REFS['Set environment variables']).toBe(
      'https://bun.com/docs/guides/runtime/set-env'
    );
    expect(CANONICAL_REFS['set-env']).toBe('https://bun.com/docs/guides/runtime/set-env');
    expect(CANONICAL_REFS['Set a time zone in Bun']).toBe(
      'https://bun.com/docs/guides/runtime/timezone'
    );
    expect(CANONICAL_REFS.TZ).toBe('https://bun.com/docs/guides/runtime/timezone');
    expect(CANONICAL_REFS['.env']).toContain('#setting-environment-variables');
    expect(CANONICAL_REFS['process.env']).toBe('https://bun.com/docs/runtime/utils#bun-env');
    expect(CANONICAL_REFS['Bun.env']).toBe('https://bun.com/docs/runtime/utils#bun-env');
    expect(CANONICAL_REFS['.npmrc']).toBe('https://bun.com/docs/pm/npmrc');
    expect(CANONICAL_REFS['save-exact']).toContain('pm/npmrc#save-exact');
  });
});
