/**
 * Bundler nav × index anchors × catalog — gap reports for bun-doc-refs.
 * High-signal only (see docs/BUN_DOCS_OPERATE.md · plan: Bundler refs gap team).
 *
 * @see ./bundler-nav.ts
 * @see https://bun.com/docs/bundler/index
 */
import {
  BUNDLER_NAV_GROUPS,
  BUNDLER_NAV_LEAVES,
  bundlerDocUrl,
  type BundlerNavGroup,
  type BundlerNavLeaf,
} from './bundler-nav';

export type IndexDocEntry = {
  title: string;
  url: string;
  domain?: string;
  desc?: string;
  anchors?: string[];
};

export type CatalogLiteEntry = {
  name: string;
  type: string;
  section?: string;
  docsUrl?: string;
  canonicalPage?: string;
  anchor?: string;
};

export type BundlerGapKind = 'catalog' | 'section-landing' | 'loader-type';

export type BundlerGap = {
  kind: BundlerGapKind;
  group: BundlerNavGroup | 'catalog';
  path: string;
  token: string;
  url: string;
  reason: string;
};

export type BundlerTokenRow = {
  name: string;
  type: string;
  docsUrl: string;
  hasRef: boolean;
  group?: BundlerNavGroup;
};

const SECTION_LANDING_EXACT = new Set([
  'usage',
  'when-to-use-macros',
  'when-to-use-bytecode',
  'when-to-use-minification',
  'examples',
  'cli-usage',
  'javascript-api',
  'security-considerations',
  'basic-example',
  'granular-control',
  'keep-names',
  'supported-targets',
  'listing-embedded-files',
  'detecting-standalone-mode-at-runtime',
  'act-as-the-bun-cli',
  'inline-environment-variables',
  'built-in-events',
  'import-attributes',
  'onload',
  'onresolve',
  'onstart',
  'onend',
  'onbeforeparse',
  'plugin-api',
  'cli-api',
  'html-routes',
  'css-modules',
  'build-for-production',
  'watch-mode',
  'drop-console-calls',
  'esm-bytecode',
  'build-time-constants',
  'import-meta-hot-api-reference',
  'namespaces',
  'defer',
  'native-plugins',
  'execution',
  'dead-code-elimination',
  'define',
  'loader',
  'metafile',
  'external',
  'minify',
]);

/** Stem match for section landings; prefer EXACT for short tokens (define/loader/metafile). */
const SECTION_LANDING_STEM =
  /^(usage|when-to-use|examples|cli-usage|javascript-api|security-considerations|basic-example|granular-control|keep-names|supported-targets|listing-embedded|detecting-standalone|act-as-the-bun|inline-environment|built-in-events|import-attributes|onload|onresolve|onstart|onend|onbeforeparse|plugin-api|cli-api|html-routes|css-modules|build-for-production|watch-mode|drop-console|esm-bytecode|build-time-constants|import-meta-hot|namespaces|defer|native-plugins|execution|dead-code)(-|$)/;

/** Minifier / CSS transform noise — skip unless exact section landing. */
const NOISE_ANCHOR =
  /-(folding|shortening|optimization|formatting|removal|inlining|merging|simplification|constant-folding)$/;

export function domainFromUrl(url: string): string {
  return url
    .replace(/^https:\/\/bun\.com\/docs\//, '')
    .replace(/\.md$/, '')
    .replace(/#.*$/, '');
}

export function leafForPath(path: string): BundlerNavLeaf | undefined {
  return BUNDLER_NAV_LEAVES.find(l => l.path === path);
}

export function isHighSignalAnchor(path: string, anchor: string): boolean {
  if (SECTION_LANDING_EXACT.has(anchor)) return true;
  if (SECTION_LANDING_STEM.test(anchor)) return true;
  if (path === 'bundler/loaders') return true; // all loader types
  if (
    path === 'bundler/minifier' &&
    NOISE_ANCHOR.test(anchor) &&
    !SECTION_LANDING_EXACT.has(anchor)
  ) {
    return false;
  }
  if (path === 'bundler/css' && NOISE_ANCHOR.test(anchor)) return false;
  if (
    path === 'bundler/minifier' &&
    !SECTION_LANDING_EXACT.has(anchor) &&
    !SECTION_LANDING_STEM.test(anchor)
  ) {
    return false;
  }
  return false;
}

export function tokenForAnchor(path: string, anchor: string): string {
  if (path === 'bundler/loaders') return `loader:${anchor}`;
  if (path === 'bundler/plugins') {
    if (anchor.startsWith('on')) return anchor; // onLoad style handled elsewhere; keep slug
    return `plugins ${anchor}`;
  }
  if (path === 'bundler/macros') return `macros ${anchor}`;
  if (path === 'bundler/index') return `bundler ${anchor}`;
  if (path === 'bundler/esbuild') return `esbuild ${anchor}`;
  if (path === 'bundler/hot-reloading') {
    if (anchor === 'import-meta-hot-api-reference') return 'import.meta.hot';
    if (anchor === 'import-meta-hot-accept') return 'import.meta.hot.accept';
    if (anchor === 'import-meta-hot-data') return 'import.meta.hot.data';
    if (anchor === 'import-meta-hot-dispose') return 'import.meta.hot.dispose';
    if (anchor === 'import-meta-hot-prune') return 'import.meta.hot.prune';
    if (anchor === 'import-meta-hot-on-and-off') return 'import.meta.hot.on';
    if (anchor === 'built-in-events') return 'hmr built-in-events';
    return `hmr ${anchor}`;
  }
  const leaf = leafForPath(path);
  const prefix = leaf?.title ?? path;
  return `${prefix} ${anchor}`;
}

/** True if refs already point at this exact URL (frag-sensitive). Page ≠ page#frag. */
function refsCoverUrl(refs: Record<string, string>, url: string): boolean {
  const norm = url.replace(/\/$/, '');
  const hash = norm.indexOf('#');
  const page = hash >= 0 ? norm.slice(0, hash) : norm;
  const frag = hash >= 0 ? norm.slice(hash + 1) : undefined;

  for (const v of Object.values(refs)) {
    if (v === norm) return true;
  }
  if (!frag) {
    // Page landing: covered by exact page or any frag on that page
    for (const v of Object.values(refs)) {
      if (v === page || v.startsWith(`${page}#`)) return true;
    }
    return false;
  }
  // Fragment: only exact URL or same page + same fragment (not bare page)
  for (const v of Object.values(refs)) {
    if (v === `${page}#${frag}`) return true;
  }
  return false;
}

function refsCoverToken(refs: Record<string, string>, token: string): boolean {
  return token in refs;
}

export function indexByDomain(entries: IndexDocEntry[]): Map<string, IndexDocEntry> {
  const m = new Map<string, IndexDocEntry>();
  for (const e of entries) {
    const d = e.domain ?? domainFromUrl(e.url);
    m.set(d, e);
  }
  return m;
}

export function catalogBundlerEntries(catalog: CatalogLiteEntry[]): CatalogLiteEntry[] {
  return catalog.filter(e => {
    if (e.section === 'bundler') return true;
    const u = e.docsUrl || e.canonicalPage || '';
    return u.includes('/bundler/');
  });
}

export function computeBundlerGaps(opts: {
  indexEntries: IndexDocEntry[];
  catalogEntries: CatalogLiteEntry[];
  refs: Record<string, string>;
  group?: BundlerNavGroup;
}): BundlerGap[] {
  const { indexEntries, catalogEntries, refs } = opts;
  const byDomain = indexByDomain(indexEntries);
  const gaps: BundlerGap[] = [];
  const seen = new Set<string>();

  const push = (g: BundlerGap) => {
    const key = `${g.kind}|${g.token}|${g.url}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (opts.group && g.group !== opts.group && g.group !== 'catalog') return;
    // catalog gaps: filter by leaf group when --group set
    if (opts.group && g.group === 'catalog') {
      const path = domainFromUrl(g.url);
      const leaf = leafForPath(path);
      if (leaf && leaf.group !== opts.group) return;
    }
    gaps.push(g);
  };

  for (const e of catalogBundlerEntries(catalogEntries)) {
    const url = e.docsUrl || (e.anchor ? `${e.canonicalPage}#${e.anchor}` : e.canonicalPage) || '';
    if (!url) continue;
    const hasName = refsCoverToken(refs, e.name);
    const hasUrl = refsCoverUrl(refs, url);
    if (!hasName && !hasUrl) {
      push({
        kind: 'catalog',
        group: 'catalog',
        path: domainFromUrl(url),
        token: e.name,
        url,
        reason: `catalog ${e.type} missing from CANONICAL_REFS`,
      });
    } else if (!hasName) {
      push({
        kind: 'catalog',
        group: 'catalog',
        path: domainFromUrl(url),
        token: e.name,
        url,
        reason: `catalog name not a CANONICAL_REFS key (url covered)`,
      });
    }
  }

  for (const leaf of BUNDLER_NAV_LEAVES) {
    if (opts.group && leaf.group !== opts.group) continue;
    const entry = byDomain.get(leaf.path);
    if (!entry) continue;
    for (const anchor of entry.anchors ?? []) {
      if (!isHighSignalAnchor(leaf.path, anchor)) continue;
      const url = bundlerDocUrl(leaf.path, anchor);
      const token = tokenForAnchor(leaf.path, anchor);
      if (refsCoverUrl(refs, url) || refsCoverToken(refs, token)) continue;
      // also accept common PascalCase hook names
      if (anchor === 'onload' && refsCoverToken(refs, 'onLoad')) continue;
      if (anchor === 'onresolve' && refsCoverToken(refs, 'onResolve')) continue;
      if (anchor === 'onstart' && refsCoverToken(refs, 'onStart')) continue;
      if (anchor === 'onend' && refsCoverToken(refs, 'onEnd')) continue;
      if (anchor === 'onbeforeparse' && refsCoverToken(refs, 'onBeforeParse')) continue;
      const kind: BundlerGapKind =
        leaf.path === 'bundler/loaders' ? 'loader-type' : 'section-landing';
      push({
        kind,
        group: leaf.group,
        path: leaf.path,
        token,
        url,
        reason:
          kind === 'loader-type' ? 'loader type anchor uncovered' : 'section landing uncovered',
      });
    }
  }

  return gaps;
}

export function computeBundlerTokenRows(opts: {
  catalogEntries: CatalogLiteEntry[];
  refs: Record<string, string>;
}): BundlerTokenRow[] {
  const rows: BundlerTokenRow[] = [];
  for (const e of catalogBundlerEntries(opts.catalogEntries)) {
    const docsUrl = e.docsUrl || e.canonicalPage || '';
    const path = domainFromUrl(docsUrl);
    const leaf = leafForPath(path);
    rows.push({
      name: e.name,
      type: e.type,
      docsUrl,
      hasRef: refsCoverToken(opts.refs, e.name) || refsCoverUrl(opts.refs, docsUrl),
      group: leaf?.group,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

export function formatBundlerAnchorsReport(
  indexEntries: IndexDocEntry[],
  group?: BundlerNavGroup
): string {
  const byDomain = indexByDomain(indexEntries);
  const lines: string[] = [];
  for (const g of BUNDLER_NAV_GROUPS) {
    if (group && g !== group) continue;
    lines.push(`## ${g}`, '');
    for (const leaf of BUNDLER_NAV_LEAVES.filter(l => l.group === g)) {
      const e = byDomain.get(leaf.path);
      lines.push(`### ${leaf.title}`);
      lines.push(`url: ${bundlerDocUrl(leaf.path)}`);
      if (!e) {
        lines.push('MISSING from index', '');
        continue;
      }
      const anchors = e.anchors ?? [];
      lines.push(`anchors (${anchors.length}):`);
      for (const a of anchors) lines.push(`  - #${a}`);
      lines.push('');
    }
  }
  return lines.join('\n').trimEnd() + '\n';
}

export function formatBundlerGapsText(gaps: BundlerGap[]): string {
  if (gaps.length === 0) return 'No high-signal bundler gaps.\n';
  const lines = [`bundler gaps: ${gaps.length}`, ''];
  for (const g of gaps) {
    lines.push(`[${g.kind}] ${g.token}`);
    lines.push(`  ${g.url}`);
    lines.push(`  ${g.reason} · group=${g.group}`);
  }
  return lines.join('\n') + '\n';
}

export function catalogMissingRefCount(rows: BundlerTokenRow[]): number {
  return rows.filter(r => !r.hasRef).length;
}
