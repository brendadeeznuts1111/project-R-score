// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
/**
 * Bun docs coverage formula — grouped layers over prefer × CANONICAL × repo × DX × surface.
 * Surface = version-aware CANONICAL APIs exercised by tools/bun-api-oneliners.ts.
 * Derived measurement (not a second scrape). Prefer matrix lives in bun-prefer-matrix.ts.
 *
 * @see https://bun.com/docs/llms.txt
 * @see https://bun.com/docs/runtime/semver
 */
import { BUN_DX_CATALOG } from '../config/bun-dx-catalog.ts';
import { availableAt, onelinerCoveredApis } from './bun-api-oneliners.ts';
import { CANONICAL_REFS, resolveApiAlias } from './bun-doc-refs.ts';
import { formatCliTable, toolTableVersion } from './cli-table.ts';
import { PREFER_MATRIX, preferApiTokens, preferObjectFromMatrix } from './bun-prefer-matrix.ts';

export {
  PREFER_MATRIX,
  preferApiTokens,
  preferObjectFromMatrix,
  type PreferMatrixTask,
} from './bun-prefer-matrix.ts';

export { availableAt } from './bun-api-oneliners.ts';

export type CoverageLayer = {
  hit: number;
  total: number;
  pct: number;
  missing?: string[];
};

/** Grouped coverage — prefer / repo / dx / surface (version-aware demos). */
export type BunDocsCoverage = {
  generated: string;
  bunVersion: string;
  composite: { pct: number };
  groups: {
    prefer: {
      canonical: CoverageLayer;
      apiIndex: CoverageLayer;
      topics: CoverageLayer;
    };
    repo: {
      apis: CoverageLayer;
      links: CoverageLayer;
    };
    dx: {
      canonical: CoverageLayer;
    };
    /** Version-aware: CANONICAL APIs with since ≤ Bun.version exercised by oneliners. */
    surface: {
      versioned: CoverageLayer;
    };
  };
};

const REPO_USAGE_ROOTS = ['lib', 'tools', 'scripts', 'packages', 'server'] as const;
const REPO_LINK_PATHS = ['lib', 'tools', 'scripts', 'tests'] as const;
const API_INDEX_PATH = new URL('./bun-api-index.json', import.meta.url).pathname;
const DOCS_INDEX_PATH = new URL('./bun-docs-index.json', import.meta.url).pathname;
const CATALOG_PATH = new URL('./bun-docs-catalog.json', import.meta.url).pathname;

function pct(hit: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((100 * hit) / total);
}

function layer(hit: number, total: number, missing?: string[]): CoverageLayer {
  return { hit, total, pct: pct(hit, total), ...(missing?.length ? { missing } : {}) };
}

function inCanonical(api: string): boolean {
  if (CANONICAL_REFS[api]) return true;
  const aliased = resolveApiAlias(api);
  if (aliased !== api && CANONICAL_REFS[aliased]) return true;
  const parts = api.split('.');
  while (parts.length > 1) {
    parts.pop();
    const parent = parts.join('.');
    if (CANONICAL_REFS[parent]) return true;
    const parentAlias = resolveApiAlias(parent);
    if (parentAlias !== parent && CANONICAL_REFS[parentAlias]) return true;
  }
  return false;
}

function inApiIndex(api: string, indexed: Set<string>): boolean {
  if (indexed.has(api)) return true;
  const parts = api.split('.');
  while (parts.length > 1) {
    parts.pop();
    if (indexed.has(parts.join('.'))) return true;
  }
  return false;
}

function canonicalDocsPaths(): Set<string> {
  const paths = new Set<string>();
  for (const url of Object.values(CANONICAL_REFS)) {
    const m = url.match(/^https:\/\/bun\.com\/docs\/([^#]+)/);
    if (m?.[1]) paths.add(m[1].replace(/\.md$/, '').replace(/\/$/, ''));
  }
  return paths;
}

export type DeadAnchorCount = {
  checked: number;
  bad: number;
  dead: Array<{ file: string; path: string; anchor: string; reason: 'page' | 'anchor' }>;
};

/** Quiet repo-link scan (same rules as bun-doc-refs deepcheck). */
export async function countDeadRepoAnchors(
  paths: readonly string[] = REPO_LINK_PATHS
): Promise<DeadAnchorCount> {
  const idx = (await Bun.file(DOCS_INDEX_PATH).json()) as {
    entries: Array<{ url: string; anchors: string[] }>;
  };
  const findEntry = (path: string) =>
    idx.entries.find(e => e.url === `https://bun.com/docs/${path}.md`) ??
    idx.entries.find(e => e.url === `https://bun.com/docs/${path}/index.md`);

  const linkRe = /https:\/\/bun\.com\/docs\/([a-z0-9\-/]+)#([a-z0-9-]+)/g;
  const dead: DeadAnchorCount['dead'] = [];
  let checked = 0;

  for (const root of paths) {
    const glob = new Bun.Glob(`${root}/**/*.ts`);
    for await (const file of glob.scan({ cwd: '.', onlyFiles: true })) {
      if (file.includes('node_modules')) continue;
      const text = await Bun.file(file).text();
      for (const m of text.matchAll(linkRe)) {
        checked++;
        const path = m[1];
        const anchor = m[2];
        if (path === undefined || anchor === undefined) continue;
        const entry = findEntry(path);
        if (!entry) {
          dead.push({ file, path, anchor, reason: 'page' });
          continue;
        }
        if (!entry.anchors.includes(anchor)) {
          dead.push({ file, path, anchor, reason: 'anchor' });
        }
      }
    }
  }

  return { checked, bad: dead.length, dead };
}

async function loadApiIndexFile(): Promise<{
  names: Set<string>;
  preferKeys: string[];
}> {
  try {
    const raw = (await Bun.file(API_INDEX_PATH).json()) as {
      apis?: Array<{ name: string }>;
      prefer?: Record<string, unknown>;
    };
    return {
      names: new Set((raw.apis ?? []).map(a => a.name)),
      preferKeys: Object.keys(raw.prefer ?? {}),
    };
  } catch {
    return {
      names: new Set(
        Object.keys(CANONICAL_REFS).filter(k => k.startsWith('Bun.') || k.startsWith('bun:'))
      ),
      preferKeys: [],
    };
  }
}

async function scanRepoApiUsage(): Promise<Map<string, number>> {
  const usage = new Map<string, number>();
  for (const root of REPO_USAGE_ROOTS) {
    const glob = new Bun.Glob(`${root}/**/*.ts`);
    for await (const file of glob.scan({ cwd: '.', onlyFiles: true })) {
      if (file.includes('node_modules')) continue;
      const text = await Bun.file(file).text();
      for (const m of text.matchAll(/\bBun\.([A-Za-z][A-Za-z0-9]*)/g)) {
        const name = `Bun.${m[1]}`;
        usage.set(name, (usage.get(name) ?? 0) + 1);
      }
      for (const m of text.matchAll(/\bbun:([a-z][a-z0-9-]*)/g)) {
        const name = `bun:${m[1]}`;
        usage.set(name, (usage.get(name) ?? 0) + 1);
      }
    }
  }
  return usage;
}

export type ComputeCoverageOpts = {
  apiIndexApis?: string[];
  preferTopics?: string[];
  skipRepoScan?: boolean;
  skipLinkScan?: boolean;
  linkPaths?: readonly string[];
  repoLinks?: { hit: number; total: number; missing?: string[] };
};

function allLayerPcts(c: BunDocsCoverage): number[] {
  const { prefer, repo, dx, surface } = c.groups;
  return [
    prefer.canonical.pct,
    prefer.apiIndex.pct,
    prefer.topics.pct,
    repo.apis.pct,
    repo.links.pct,
    dx.canonical.pct,
    surface.versioned.pct,
  ];
}

/** Catalog name → releasedIn (missing ⇒ undefined ⇒ treat as available). */
async function loadCatalogReleasedIn(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const cat = (await Bun.file(CATALOG_PATH).json()) as {
      tokens?: Array<{ name?: string; releasedIn?: string }>;
    };
    for (const t of cat.tokens ?? []) {
      if (t.name && t.releasedIn) map.set(t.name, t.releasedIn);
    }
  } catch {
    /* catalog optional for surface math */
  }
  return map;
}

/** True if covered set exercises a canonical token (exact, parent, child, or alias). */
export function surfaceExercises(canonical: string, covered: Set<string>): boolean {
  const canonAlias = resolveApiAlias(canonical);
  if (covered.has(canonical) || covered.has(canonAlias)) return true;
  for (const c of covered) {
    const ca = resolveApiAlias(c);
    if (c === canonical || ca === canonical || ca === canonAlias || c === canonAlias) return true;
    if (c.startsWith(`${canonical}.`) || canonical.startsWith(`${c}.`)) return true;
    if (ca.startsWith(`${canonical}.`) || canonical.startsWith(`${ca}.`)) return true;
  }
  return false;
}

/** Real API tokens only — skip guide aliases like "Bun.serve routes". */
export function isSurfaceApiToken(k: string): boolean {
  if (k === 'HTMLRewriter') return true;
  if (k.startsWith('bun:')) return /^bun:[a-z][a-z0-9_-]*$/.test(k);
  if (!k.startsWith('Bun.')) return false;
  return /^Bun\.[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(k);
}

/** Version-aware surface layer over CANONICAL Bun.* / bun: (+ HTMLRewriter). */
export async function computeSurfaceLayer(
  bunVersion: string = Bun.version
): Promise<CoverageLayer> {
  const releasedIn = await loadCatalogReleasedIn();
  const covered = onelinerCoveredApis({ includeLive: true });
  const universe = Object.keys(CANONICAL_REFS).filter(isSurfaceApiToken);
  const available = universe.filter(k => availableAt(bunVersion, releasedIn.get(k)));
  const missing: string[] = [];
  let hit = 0;
  for (const api of available) {
    if (surfaceExercises(api, covered)) hit++;
    else missing.push(api);
  }
  return layer(hit, available.length, missing.slice(0, 40));
}

export async function computeBunDocsCoverage(
  opts: ComputeCoverageOpts = {}
): Promise<BunDocsCoverage> {
  const tokens = preferApiTokens();
  const fromDisk = opts.apiIndexApis || opts.preferTopics ? null : await loadApiIndexFile();
  const indexed = opts.apiIndexApis
    ? new Set(opts.apiIndexApis)
    : (fromDisk?.names ??
      new Set(
        Object.keys(CANONICAL_REFS).filter(k => k.startsWith('Bun.') || k.startsWith('bun:'))
      ));

  const preferCanonicalMissing = tokens.filter(t => !inCanonical(t));
  const preferApiMissing = tokens.filter(t => !inApiIndex(t, indexed));

  const topicKeys = opts.preferTopics ?? fromDisk?.preferKeys ?? [];
  const topicSet = new Set(topicKeys);
  const topicMissing = PREFER_MATRIX.map(t => t.id).filter(id => !topicSet.has(id));

  let repoApis: CoverageLayer;
  if (opts.skipRepoScan) {
    repoApis = layer(0, 0);
  } else {
    const usage = await scanRepoApiUsage();
    const names = [...usage.keys()];
    const missing = names
      .filter(n => !indexed.has(n))
      .sort((a, b) => usage.get(b)! - usage.get(a)!);
    repoApis = layer(names.length - missing.length, names.length, missing.slice(0, 25));
  }

  let repoLinks: CoverageLayer;
  if (opts.repoLinks) {
    repoLinks = layer(opts.repoLinks.hit, opts.repoLinks.total, opts.repoLinks.missing);
  } else if (opts.skipLinkScan) {
    repoLinks = layer(0, 0);
  } else {
    const { checked, bad, dead } = await countDeadRepoAnchors(opts.linkPaths ?? REPO_LINK_PATHS);
    repoLinks = layer(
      checked - bad,
      checked,
      dead.slice(0, 20).map(d => `${d.path}#${d.anchor}`)
    );
  }

  const canonPaths = canonicalDocsPaths();
  const dxMissing: string[] = [];
  let dxHit = 0;
  for (const entry of BUN_DX_CATALOG) {
    const m = entry.docs.match(/^https:\/\/bun\.com\/docs\/([^#]+)/);
    if (!m?.[1]) {
      dxMissing.push(entry.id);
      continue;
    }
    const path = m[1].replace(/\.md$/, '').replace(/\/$/, '');
    if (canonPaths.has(path)) dxHit++;
    else dxMissing.push(`${entry.id}:${path}`);
  }

  const surfaceVersioned = await computeSurfaceLayer(Bun.version);

  const result: BunDocsCoverage = {
    generated: new Date().toISOString(),
    bunVersion: Bun.version,
    composite: { pct: 0 },
    groups: {
      prefer: {
        canonical: layer(
          tokens.length - preferCanonicalMissing.length,
          tokens.length,
          preferCanonicalMissing
        ),
        apiIndex: layer(tokens.length - preferApiMissing.length, tokens.length, preferApiMissing),
        topics: layer(
          PREFER_MATRIX.length - topicMissing.length,
          PREFER_MATRIX.length,
          topicMissing
        ),
      },
      repo: {
        apis: repoApis,
        links: repoLinks,
      },
      dx: {
        canonical: layer(dxHit, BUN_DX_CATALOG.length, dxMissing),
      },
      surface: {
        versioned: surfaceVersioned,
      },
    },
  };

  const pcts = allLayerPcts(result);
  result.composite.pct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  return result;
}

/** Human-readable block — columnar groups, composite on the title line. */
export function formatCoverageBlock(result: BunDocsCoverage, opts?: { json?: boolean }): string {
  if (opts?.json) return `${JSON.stringify(result, null, 2)}\n`;

  const { prefer, repo, dx, surface } = result.groups;
  const bun = result.bunVersion || toolTableVersion();
  const layerAttrs = (L: CoverageLayer) =>
    L.missing?.length ? `missing:${L.missing.length}` : 'ok';
  const rows = [
    {
      group: 'prefer',
      layer: 'CANONICAL',
      attrs: layerAttrs(prefer.canonical),
      hit: prefer.canonical.hit,
      total: prefer.canonical.total,
      pct: prefer.canonical.pct,
    },
    {
      group: 'prefer',
      layer: 'api-index',
      attrs: layerAttrs(prefer.apiIndex),
      hit: prefer.apiIndex.hit,
      total: prefer.apiIndex.total,
      pct: prefer.apiIndex.pct,
    },
    {
      group: 'prefer',
      layer: 'topics',
      attrs: layerAttrs(prefer.topics),
      hit: prefer.topics.hit,
      total: prefer.topics.total,
      pct: prefer.topics.pct,
    },
    {
      group: 'repo',
      layer: 'APIs',
      attrs: layerAttrs(repo.apis),
      hit: repo.apis.hit,
      total: repo.apis.total,
      pct: repo.apis.pct,
    },
    {
      group: 'repo',
      layer: '@see',
      attrs: layerAttrs(repo.links),
      hit: repo.links.hit,
      total: repo.links.total,
      pct: repo.links.pct,
    },
    {
      group: 'dx',
      layer: 'CANONICAL',
      attrs: layerAttrs(dx.canonical),
      hit: dx.canonical.hit,
      total: dx.canonical.total,
      pct: dx.canonical.pct,
    },
    {
      group: 'surface',
      layer: 'versioned',
      attrs: layerAttrs(surface.versioned),
      hit: surface.versioned.hit,
      total: surface.versioned.total,
      pct: surface.versioned.pct,
    },
  ];

  return (
    [
      `📐 Coverage  ${result.composite.pct}%  (surface ${surface.versioned.pct}%)`,
      '',
      formatCliTable(
        rows,
        [
          { key: 'group', header: 'GROUP', maxWidth: 8 },
          { key: 'layer', header: 'LAYER', maxWidth: 12 },
          { key: 'attrs', header: 'ATTRS', maxWidth: 14 },
          { key: 'hit', header: 'HIT', width: 5, align: 'right' },
          { key: 'total', header: 'TOTAL', width: 5, align: 'right' },
          { key: 'pct', header: 'PCT', width: 4, align: 'right' },
        ],
        {
          indent: '  ',
          bun,
          cols: ['group', 'layer', 'attrs', 'hit', 'total', 'pct'],
        }
      ).trimEnd(),
      '',
    ].join('\n') + '\n'
  );
}

export function printCoverageBlock(result: BunDocsCoverage, opts?: { json?: boolean }): void {
  console.info(formatCoverageBlock(result, opts).trimEnd());
  console.info('');
}

/** Gate used by `coverage` CLI — repo @see must be clean. */
export function coverageRepoLinksFail(result: BunDocsCoverage): boolean {
  return result.groups.repo.links.pct < 100;
}
