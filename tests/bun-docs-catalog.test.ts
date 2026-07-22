/**
 * Catalog helpers: dedup scoring + canonical page preference + version pin URLs.
 * Changelog overlay: token → releasedIn / fixedIn / changeNote.
 */
import { describe, expect, test } from 'bun:test';
import {
  normalizeName,
  pageBase,
  pageAnchor,
  scoreCanonicalPage,
  pickCanonicalPage,
  sectionFromUrl,
  inferType,
  compareSemver,
  releaseUrlFor,
  blogUrlFor,
  docsUrlFor,
  parseVersionFlag,
  normalizeBunVersion,
  applyChangelogOverlay,
  listCells,
  shortType,
  shortStability,
  shortSection,
  shortUrl,
  buildListColumns,
  formatListTable,
  type DocCatalogEntry,
} from '../tools/bun-docs-catalog.ts';
import {
  changelogFor,
  changelogKey,
  commitUrlFor,
  allChangelogEvents,
} from '../tools/bun-docs-changelog.ts';

describe('bun-docs-catalog helpers', () => {
  test('normalizeName collapses bun. prefix case', () => {
    expect(normalizeName('Bun.WebView')).toBe('bun.webview');
    expect(normalizeName('bun.webview')).toBe('bun.webview');
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
  });

  test('docsUrlFor joins page + optional anchor (unversioned)', () => {
    expect(docsUrlFor('https://bun.com/docs/runtime/http/server.md')).toBe(
      'https://bun.com/docs/runtime/http/server'
    );
    expect(docsUrlFor('https://bun.com/docs/runtime/utils', 'bun-version')).toBe(
      'https://bun.com/docs/runtime/utils#bun-version'
    );
  });

  test('parseVersionFlag reads --version= and --version N', () => {
    expect(parseVersionFlag(['list', '--version=1.3.14'])).toBe('1.3.14');
    expect(parseVersionFlag(['build', '--version', 'v1.4.0'])).toBe('1.4.0');
    expect(parseVersionFlag(['build', '--version=bun-v1.3.12'])).toBe('1.3.12');
    expect(parseVersionFlag(['list'])).toBe(Bun.version);
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

  test('changelogFor Bun.WebView has releasedIn 1.4.0', () => {
    const cl = changelogFor('Bun.WebView');
    expect(cl.releasedIn).toBe('1.4.0');
    expect(cl.events.some(e => e.kind === 'feature')).toBe(true);
  });

  test('changelogFor Bun.Terminal releasedIn 1.3.5 with PTY blog anchor', () => {
    // https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support
    const cl = changelogFor('Bun.Terminal');
    expect(cl.releasedIn).toBe('1.3.5');
    expect(cl.changedIn).toBe('1.3.14'); // Windows ConPTY follow-up
    expect(cl.blogVersion).toBe('1.3.5');
    expect(cl.blogAnchor).toBe('bun-terminal-api-for-pseudo-terminal-pty-support');
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
    const { GUIDE_EXAMPLES, guideExamplesForPage, guideExamplesForToken } = await import(
      '../tools/bun-docs-guide-examples.ts'
    );
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
    expect(guideExamplesForToken('Bun.inspect.custom')[0]?.body).toContain('[Bun.inspect.custom]');
    const inspectTable = guideExamplesForToken('Bun.inspect.table');
    expect(inspectTable).toHaveLength(3);
    expect(inspectTable[0]?.body).toContain('Bun.inspect.table([');
    expect(inspectTable.some(e => e.body.includes('["a", "c"]'))).toBe(true);
    expect(inspectTable.some(e => e.body.includes('colors: true'))).toBe(true);
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

describe('frozen CANONICAL_REFS env / npmrc', () => {
  test('Read/Set environment variables + process.env + .npmrc point at institutional pages', async () => {
    const { CANONICAL_REFS } = await import('../tools/bun-doc-refs.ts');
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
