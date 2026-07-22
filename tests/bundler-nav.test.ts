import { describe, expect, test } from 'bun:test';
import {
  catalogMissingRefCount,
  computeBundlerGaps,
  computeBundlerTokenRows,
  isHighSignalAnchor,
  tokenForAnchor,
} from '../lib/docs/bundler-gaps';
import {
  BUNDLER_NAV_GROUPS,
  BUNDLER_NAV_LEAVES,
  bundlerDocUrl,
  bundlerNavCanonicalRefs,
  formatBundlerNavMarkdown,
  formatBundlerNavTree,
} from '../lib/docs/bundler-nav';
import { CANONICAL_REFS } from '../tools/bun-doc-refs';

describe('bundler nav SSOT', () => {
  test('sidebar groups and leaf count', () => {
    expect(BUNDLER_NAV_GROUPS).toEqual([
      'Core',
      'Development Server',
      'Asset Processing',
      'Single File Executable',
      'Extensions',
      'Optimization',
      'Migration',
    ]);
    expect(BUNDLER_NAV_LEAVES).toHaveLength(13);
  });

  test('every leaf path exists in docs index', async () => {
    const idx = await Bun.file(`${import.meta.dir}/../tools/bun-docs-index.json`).json();
    const entries = idx.entries as Array<{ url: string; domain?: string }>;
    const domains = new Set(
      entries.map(
        e => e.domain ?? e.url.replace(/^https:\/\/bun\.com\/docs\//, '').replace(/\.md$/, '')
      )
    );
    for (const leaf of BUNDLER_NAV_LEAVES) {
      expect(domains.has(leaf.path), `missing index page for ${leaf.title} (${leaf.path})`).toBe(
        true
      );
    }
  });

  test('canonical refs merge covers titles + groups', () => {
    const nav = bundlerNavCanonicalRefs();
    for (const leaf of BUNDLER_NAV_LEAVES) {
      expect(nav[leaf.title]).toBe(bundlerDocUrl(leaf.path));
      expect(CANONICAL_REFS[leaf.title]).toBe(bundlerDocUrl(leaf.path));
    }
    for (const group of BUNDLER_NAV_GROUPS) {
      expect(CANONICAL_REFS[group]).toBeTruthy();
    }
    expect(CANONICAL_REFS['bun build']).toBe(bundlerDocUrl('bundler/index', 'basic-example'));
    expect(CANONICAL_REFS.Macros).toBe(bundlerDocUrl('bundler/macros'));
    expect(CANONICAL_REFS.Plugins).toBe(bundlerDocUrl('bundler/plugins'));
  });

  test('formatters include every leaf title', () => {
    const md = formatBundlerNavMarkdown();
    const tree = formatBundlerNavTree();
    for (const leaf of BUNDLER_NAV_LEAVES) {
      expect(md).toContain(leaf.title);
      expect(tree).toContain(leaf.title);
    }
  });

  test('lib/macros README stays aligned with nav SSOT', async () => {
    const readme = await Bun.file(`${import.meta.dir}/../lib/macros/README.md`).text();
    for (const leaf of BUNDLER_NAV_LEAVES) {
      expect(readme).toContain(leaf.title);
      expect(readme).toContain(leaf.path);
    }
    for (const group of BUNDLER_NAV_GROUPS) {
      expect(readme).toContain(`### ${group}`);
    }
  });
});

describe('bundler gaps report', () => {
  test('high-signal classifier + loader tokens', () => {
    expect(isHighSignalAnchor('bundler/index', 'define')).toBe(true);
    expect(isHighSignalAnchor('bundler/minifier', 'boolean-literal-shortening')).toBe(false);
    expect(isHighSignalAnchor('bundler/loaders', 'json')).toBe(true);
    expect(tokenForAnchor('bundler/loaders', 'json')).toBe('loader:json');
    expect(tokenForAnchor('bundler/hot-reloading', 'import-meta-hot-api-reference')).toBe(
      'import.meta.hot'
    );
  });

  test('gaps JSON shape is stable; page ref does not cover frags', async () => {
    const idx = await Bun.file(`${import.meta.dir}/../tools/bun-docs-index.json`).json();
    const cat = await Bun.file(`${import.meta.dir}/../tools/bun-docs-catalog.json`).json();
    const gaps = computeBundlerGaps({
      indexEntries: idx.entries,
      catalogEntries: cat.entries,
      refs: {
        Bundler: 'https://bun.com/docs/bundler/index',
        Macros: 'https://bun.com/docs/bundler/macros',
      },
    });
    expect(gaps.length).toBeGreaterThan(0);
    for (const g of gaps) {
      expect(g.kind === 'catalog' || g.kind === 'section-landing' || g.kind === 'loader-type').toBe(
        true
      );
      expect(g.token.length).toBeGreaterThan(0);
      expect(g.url.startsWith('https://bun.com/docs/')).toBe(true);
      expect(typeof g.reason).toBe('string');
    }
    // Bare page must not swallow #define
    expect(
      gaps.some(g => g.url === 'https://bun.com/docs/bundler/index#define' || g.token.includes('define'))
    ).toBe(true);
  });

  test('catalog tokens hasRef; --gaps --strict only cares about missing names', async () => {
    const cat = await Bun.file(`${import.meta.dir}/../tools/bun-docs-catalog.json`).json();
    const rows = computeBundlerTokenRows({ catalogEntries: cat.entries, refs: CANONICAL_REFS });
    expect(rows.length).toBeGreaterThan(20);
    // After fill: zero catalog entries with neither name nor URL coverage preferred;
    // URL-only coverage still counts as hasRef for --tokens.
    expect(catalogMissingRefCount(rows)).toBe(0);
  });

  test('CLI bundler --gaps --json exits 0', async () => {
    const proc = Bun.spawnSync({
      cmd: ['bun', 'tools/bun-doc-refs.ts', 'bundler', '--gaps', '--json'],
      cwd: `${import.meta.dir}/..`,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(proc.exitCode).toBe(0);
    const j = JSON.parse(proc.stdout.toString()) as { count: number; gaps: unknown[] };
    expect(typeof j.count).toBe('number');
    expect(Array.isArray(j.gaps)).toBe(true);
  });
});
