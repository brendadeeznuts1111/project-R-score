// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/webview — Bun.WebView
import { BUN_GITHUB_RELEASES_URL } from '../lib/shared/tools/bun-urls.ts';

/**
 * bun-docs-catalog.ts — structured Bun doc catalog entries.
 *
 * Each entry:
 *   name, type (api | cli-flag | config | concept),
 *   description?, stability (stable | experimental | deprecated),
 *   releasedIn? (Bun version when the feature shipped),
 *   fixedIn? / changedIn? (from curated changelog overlay),
 *   changeNote? / changeCommit? / commitUrl? (overlay),
 *   lastUpdated? (ISO date docs/index last refreshed for this entry),
 *   verifiedOn? (catalog pin Bun version at build),
 *   releaseUrl? (GitHub release for releasedIn or verifiedOn),
 *   blogUrl? (RSS-validated bun.com/blog/bun-vX.Y.Z — narrative release notes),
 *   docsUrl? (unversioned bun.com page + optional #anchor),
 *   canonicalPage, anchor?, allPages
 *
 * Catalog file also carries top-level bunVersion + releaseUrl + blogUrl + docsRoot
 * (+ commitHash when built against the runtime binary).
 * Bun docs are not versioned on bun.com (/docs/vX.Y.Z/ does not exist);
 * the pin is Bun.version (or --version=…) + GitHub release + blog post.
 * Blog URLs come from tools/release-index.json (RSS Phase 0), not URL guessing.
 * Token upgrade notes come from tools/bun-docs-changelog.ts (curated, not scraped).
 * Missing descriptions can be filled from live doc HTML (Phase 1 NOTE).
 *
 * Build:   bun tools/bun-docs-catalog.ts build [--version=1.4.0] [--force] [--skip-notes]
 * Prefetch: bun tools/bun-docs-releases.ts index
 * List:    bun tools/bun-docs-catalog.ts list [--section=runtime] [--type=api]
 *                 [-s runtime] [-t api] [-q WebView] [-w] [-n] [-c] [-l] [-v] [-j]
 * Lookup:  bun tools/bun-docs-catalog.ts get Bun.WebView
 * Verify:  bun tools/bun-docs-catalog.ts verify   # catalog bunVersion vs runtime
 *
 * List header: # catalog bunVersion=…  # release …  # blog bun.com/blog/bun-v…
 * Default columns: NAME · SEC · TYPE · STAB · SHIP · FIX · PIN · DOC
 * Wide (+): CHG · UPDATED · REL (tag) · BLOG (short) · NOTE (with --notes)
 *
 * Consumed by tools/bun-doc-refs.ts (`catalog` / enriched `suggest`).
 */
import { resolve } from 'node:path';
import { CURATED_ENTRIES } from './bun-docs-curated.ts';
import { changelogIndex } from './bun-docs-changelog.ts';
import { fetchPageNotes, extractNoteFromMarkdown } from './bun-docs-page-notes.ts';
import {
  cleanBunVersion,
  loadReleaseIndex,
  lookupBlogUrl,
  RELEASE_OVERLAY_PATH,
  releaseOverlayIndex,
  type ReleaseEntry,
  type ReleaseOverlayEntry,
  type ReleaseOverlayFile,
} from './bun-docs-releases.ts';
import {
  buildPageAnchorIndex,
  classifyLocusStatus,
  findParentWithFragment,
  resolveVerifiedLocus,
  type LocusStatus,
} from '../lib/docs/locus-resolve.ts';
// Avoid static import of bun-doc-refs (circular: refs → catalog → refs).

const INDEX_PATH = resolve(import.meta.dir, 'bun-docs-index.json');
const OUT_PATH = resolve(import.meta.dir, 'bun-docs-catalog.json');
const TOKEN_SUPPLEMENT_PATH = resolve(import.meta.dir, 'bun-docs-token-supplement.json');

/** Typed token categories where NOTE / LOC / STATUS coverage is tracked closely. */
export const NOTE_COVERAGE_TYPES: DocRefType[] = [
  'api',
  'cli-command',
  'cli-flag',
  'config-key',
  'env-var',
  'package-json-key',
  'cli-option',
];

export const DocRefTypeArray = [
  'api',
  'cli-command',
  'cli-flag',
  'cli-option',
  'config-key',
  'package-json-key',
  'env-var',
  'concept',
  'guide',
  'blog',
  'reference',
  'error',
  'tutorial',
  'spec',
  'other',
] as const;

export type DocRefType = (typeof DocRefTypeArray)[number];

export function isDocRefType(value: string): value is DocRefType {
  return DocRefTypeArray.includes(value as DocRefType);
}

export type DocStability = 'stable' | 'experimental' | 'deprecated';
export type DocSection = 'runtime' | 'bundler' | 'test' | 'guides' | 'pm' | 'reference' | 'other';

export type DocCatalogEntry = {
  name: string;
  type: DocRefType;
  description?: string;
  stability: DocStability;
  /**
   * Bun version in which the feature was released / first documented in curated
   * data (semver string, e.g. "1.3.14"). Omitted when unknown.
   */
  releasedIn?: string;
  /** Latest curated fix version for this token (changelog overlay). */
  fixedIn?: string;
  /** Latest curated change/deprecate version (changelog overlay). */
  changedIn?: string;
  /** Best human note from the changelog overlay (fix > change > feature). */
  changeNote?: string;
  /** Optional git SHA for the overlaid change (when known). */
  changeCommit?: string;
  /** https://github.com/oven-sh/bun/commit/{changeCommit} */
  commitUrl?: string;
  /**
   * When documentation for this entry was last refreshed in our index
   * (ISO-8601 from bun-docs-index.json `generated`).
   */
  lastUpdated?: string;
  /**
   * Local Bun.version when the catalog was built (verification pin).
   * Prefer catalog-level `bunVersion` for the pin; this mirrors it on entries.
   */
  verifiedOn?: string;
  /**
   * GitHub release for `releasedIn` if known, else for `verifiedOn`.
   * Docs themselves remain unversioned on bun.com (`docsUrl`).
   */
  releaseUrl?: string;
  /** Narrative release notes on bun.com/blog (version embedded in path). */
  blogUrl?: string;
  /** Full docs link (canonicalPage + optional #anchor) — latest unversioned docs. */
  docsUrl?: string;
  /** Page URL without .md and without fragment */
  canonicalPage: string;
  /** Fragment id without # */
  anchor?: string;
  /** True when no verified canonical heading fragment was resolved. */
  locusUnresolved?: boolean;
  /**
   * Rich locus STATUS (not binary resolved/unresolved).
   * fragment | page | inherited | dump | reference | coincidence | unresolved
   */
  locusStatus?: LocusStatus;
  /** Language-tagged usage examples from official docs. */
  examples?: Array<{ lang: string; body: string; fragment?: string }>;
  /** Related token names for cross-reference walks. */
  related?: string[];
  /** All known pages (no fragments), deduped, canonical first */
  allPages: string[];
  /** Primary product area */
  section: DocSection;
  aliases?: string[];
};

/** OSC 8 terminal hyperlink. In terminals without support the visible text is still shown. */
function terminalLink(url: string, text: string): string {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

/** Display width of a string, ignoring ANSI / OSC escape sequences. */
function visibleWidth(text: string): number {
  // @see https://bun.com/docs/runtime/utils#bun-stringwidth
  return Bun.stringWidth(text, { countAnsiEscapeCodes: false });
}

/** Right-pad to a visible width (like String.prototype.padEnd but ANSI-aware). */
function displayPadEnd(text: string, width: number): string {
  const w = visibleWidth(text);
  return w < width ? `${text}${' '.repeat(width - w)}` : text;
}

/** Truncate to visible width with ellipsis when needed. */
function displayTruncate(text: string, width: number): string {
  if (width <= 0) return '';
  if (visibleWidth(text) <= width) return text;
  if (width <= 1) return '…';
  let out = '';
  for (const ch of text) {
    if (visibleWidth(out + ch) > width - 1) break;
    out += ch;
  }
  return `${out}…`;
}

function displayCell(text: string, width: number, align: 'left' | 'right' = 'left'): string {
  const t = displayTruncate(text, width);
  if (align === 'right') {
    const w = visibleWidth(t);
    return w < width ? `${' '.repeat(width - w)}${t}` : t;
  }
  return displayPadEnd(t, width);
}

/** Stable short labels for table density. */
export function shortType(type: DocRefType): string {
  switch (type) {
    case 'cli-command':
      return 'cmd';
    case 'cli-flag':
      return 'flag';
    case 'cli-option':
      return 'opt';
    case 'config-key':
      return 'cfg';
    case 'package-json-key':
      return 'pkg';
    case 'env-var':
      return 'env';
    case 'concept':
      return 'concept';
    case 'guide':
      return 'guide';
    case 'blog':
      return 'blog';
    case 'reference':
      return 'ref';
    case 'error':
      return 'err';
    case 'tutorial':
      return 'tut';
    case 'spec':
      return 'spec';
    case 'other':
      return 'other';
    case 'api':
    default:
      return 'api';
  }
}

export function shortStability(stability: DocStability): string {
  switch (stability) {
    case 'experimental':
      return 'exp';
    case 'deprecated':
      return 'dep';
    case 'stable':
    default:
      return 'ok';
  }
}

export function shortSection(section: DocSection): string {
  switch (section) {
    case 'runtime':
      return 'runtime';
    case 'bundler':
      return 'bundle';
    case 'test':
      return 'test';
    case 'guides':
      return 'guide';
    case 'pm':
      return 'pm';
    case 'reference':
      return 'ref';
    case 'other':
    default:
      return 'other';
  }
}

/** Compress docs/blog/github URLs for table display. */
export function shortUrl(url: string): string {
  return url
    .replace(/^https:\/\/bun\.com\/docs\//, '')
    .replace(/^https:\/\/bun\.com\/blog\//, 'blog/')
    .replace(/^https:\/\/bun\.com\//, '')
    .replace(/^https:\/\/github\.com\/oven-sh\/bun\/releases\/tag\//, 'tag/')
    .replace(/^https:\/\/github\.com\/oven-sh\/bun\/commit\//, 'commit/')
    .replace(/^https:\/\/github\.com\/oven-sh\/bun\//, 'gh/');
}

/**
 * Effective display cells with strong defaults when fields are missing.
 * PIN always falls back to catalog bunVersion; SHIP uses releasedIn only;
 * VER is the best version for release/blog links (ship → fix → change → pin).
 */
export function listCells(
  e: DocCatalogEntry,
  meta: { bunVersion: string }
): {
  name: string;
  section: string;
  type: string;
  stab: string;
  ship: string;
  fix: string;
  chg: string;
  pin: string;
  ver: string;
  updated: string;
  doc: string;
  release: string;
  blog: string;
  note: string;
  locus: string;
  status: string;
  page: string;
  fragment: string;
} {
  const pin = e.verifiedOn ?? meta.bunVersion;
  const ship = e.releasedIn ?? '—';
  const fix = e.fixedIn ?? '—';
  const chg = e.changedIn ?? '—';
  const ver = e.releasedIn ?? e.fixedIn ?? e.changedIn ?? pin;
  const docs = e.docsUrl ?? (e.anchor ? `${e.canonicalPage}#${e.anchor}` : e.canonicalPage);
  const release = e.releaseUrl ?? releaseUrlFor(ver);
  // BLOG is RSS-validated at build time — do not invent URLs in the table.
  const blog = e.blogUrl ?? '';
  const page = shortUrl(e.canonicalPage.replace(/\.md$/i, '').split('#')[0]!);
  const fragment = e.anchor ? `#${e.anchor}` : '—';
  const locus = e.anchor && !e.locusUnresolved ? 'resolved' : 'unresolved';
  const status =
    e.locusStatus ??
    (e.anchor && !e.locusUnresolved
      ? 'fragment'
      : page.includes('bun-apis')
        ? 'dump'
        : page.includes('reference/')
          ? 'reference'
          : 'page');
  return {
    name: e.name,
    section: shortSection(e.section),
    type: shortType(e.type),
    stab: shortStability(e.stability),
    ship,
    fix,
    chg,
    pin,
    ver,
    updated: e.lastUpdated?.slice(0, 10) ?? '—',
    doc: shortUrl(docs),
    release: shortUrl(release),
    blog: shortUrl(blog),
    note: e.changeNote || e.description || '',
    locus,
    status,
    page,
    fragment,
  };
}

type ListCol = {
  key: keyof ReturnType<typeof listCells>;
  header: string;
  width: number;
  align?: 'left' | 'right';
};

/** Default table: dense but informative (stronger defaults: PIN always filled). */
const LIST_COLS_DEFAULT: ListCol[] = [
  { key: 'name', header: 'NAME', width: 26 },
  { key: 'section', header: 'SEC', width: 7 },
  { key: 'type', header: 'TYPE', width: 7 },
  { key: 'stab', header: 'STAB', width: 4 },
  { key: 'ship', header: 'SHIP', width: 7 },
  { key: 'fix', header: 'FIX', width: 7 },
  { key: 'chg', header: 'CHG', width: 7 },
  { key: 'pin', header: 'PIN', width: 7 },
  { key: 'updated', header: 'UPDATED', width: 10 },
  { key: 'doc', header: 'DOC', width: 36 },
];

/** Extra columns for --wide (release/blog link short forms). */
const LIST_COLS_WIDE: ListCol[] = [
  { key: 'ver', header: 'VER', width: 7 },
  { key: 'release', header: 'RELEASE', width: 16 },
  { key: 'blog', header: 'BLOG', width: 32 },
];

const LIST_COL_NOTE: ListCol = { key: 'note', header: 'NOTE', width: 36 };

/** Legacy thin table (--compact). */
const LIST_COLS_COMPACT: ListCol[] = [
  { key: 'name', header: 'NAME', width: 32 },
  { key: 'type', header: 'TYPE', width: 10 },
  { key: 'stab', header: 'STAB', width: 12 },
  { key: 'ship', header: 'REL', width: 8 },
  { key: 'updated', header: 'UPDATED', width: 12 },
  { key: 'doc', header: 'DOC', width: 48 },
];

/** Locus-focused table: token separated from status / page / fragment. */
const LIST_COLS_LOCUS: ListCol[] = [
  { key: 'name', header: 'TOKEN', width: 28 },
  { key: 'type', header: 'TYPE', width: 8 },
  { key: 'status', header: 'STATUS', width: 11 },
  { key: 'page', header: 'PAGE', width: 32 },
  { key: 'fragment', header: 'FRAGMENT', width: 40 },
  { key: 'ship', header: 'SHIP', width: 7 },
];

export function buildListColumns(opts: {
  compact?: boolean;
  wide?: boolean;
  notes?: boolean;
  locus?: boolean;
  showVersion?: boolean;
  showRelease?: boolean;
}): ListCol[] {
  if (opts.locus) return [...LIST_COLS_LOCUS];
  if (opts.compact) {
    const cols = [...LIST_COLS_COMPACT];
    if (opts.showVersion) cols.splice(4, 0, { key: 'pin', header: 'VERIFIED', width: 10 });
    if (opts.showRelease)
      cols.splice(cols.length - 1, 0, { key: 'release', header: 'RELEASE', width: 22 });
    return cols;
  }
  const cols = [...LIST_COLS_DEFAULT];
  if (opts.wide || opts.showVersion || opts.showRelease) {
    // Insert wide cols before DOC
    const doc = cols.pop()!;
    cols.push(...LIST_COLS_WIDE);
    if (opts.notes) cols.push(LIST_COL_NOTE);
    cols.push(doc);
    return cols;
  }
  if (opts.notes) {
    const doc = cols.pop()!;
    cols.push(LIST_COL_NOTE, doc);
  }
  return cols;
}

export function formatListTable(
  entries: DocCatalogEntry[],
  meta: { bunVersion: string },
  cols: ListCol[],
  opts?: { links?: boolean }
): string[] {
  const lines: string[] = [];
  lines.push(cols.map(c => displayCell(c.header, c.width, c.align)).join(' '));
  lines.push(cols.map(c => '─'.repeat(c.width)).join(' '));
  for (const e of entries) {
    const cells = listCells(e, meta);
    const row = cols.map(c => {
      let val = cells[c.key] || '—';
      if (c.key === 'doc' && opts?.links) {
        const full = e.docsUrl ?? e.canonicalPage;
        val = terminalLink(full, cells.doc || full);
      } else if (c.key === 'release' && opts?.links && cells.release) {
        val = terminalLink(e.releaseUrl ?? releaseUrlFor(cells.ver), cells.release);
      } else if (c.key === 'blog' && opts?.links && e.blogUrl && cells.blog) {
        val = terminalLink(e.blogUrl, cells.blog);
      }
      if (!val) val = '—';
      return displayCell(val, c.width, c.align);
    });
    lines.push(row.join(' '));
  }
  return lines;
}

/** Normalize bun-v1.3.12 / v1.3.12 / 1.3.12 → 1.3.12 */
export function normalizeBunVersion(version: string): string {
  return version
    .trim()
    .replace(/^bun-v/i, '')
    .replace(/^v/i, '');
}

/** GitHub release page for a Bun semver (docs are unversioned on bun.com). */
export function releaseUrlFor(version: string): string {
  const v = normalizeBunVersion(version);
  return `https://github.com/oven-sh/bun/releases/tag/bun-v${v}`;
}

/**
 * Construct a blog URL path for a version (not RSS-validated).
 * Prefer `resolveBlogUrl` / release-index lookups for catalog stamps.
 */
export function blogUrlFor(version: string): string {
  const v = cleanBunVersion(version);
  return `https://bun.com/blog/bun-v${v}`;
}

/**
 * Resolve a blog URL from the RSS release map.
 * Exact version (pre-release stripped) → minor X.Y.0. Never walks to a major.
 * Preserves a `#fragment` from `existing` when the base is found.
 */
export function resolveBlogUrl(
  version: string,
  releaseMap: Map<string, ReleaseEntry>,
  existing?: string
): string | undefined {
  const base = lookupBlogUrl(version, releaseMap);
  if (!base) return undefined;
  const hash = existing?.includes('#') ? existing.slice(existing.indexOf('#')) : '';
  return base + hash;
}

/** Stamp entry.blogUrl from RSS; keep overlay #anchor when base validates. */
export function stampEntryBlogUrl(
  e: DocCatalogEntry,
  releaseMap: Map<string, ReleaseEntry>,
  fallbackVersion: string
): void {
  const existing = e.blogUrl;
  const hash = existing?.includes('#') ? existing.slice(existing.indexOf('#')) : '';
  const fromPath = existing?.match(/\/bun-v([\d.]+)/i)?.[1];
  const candidates = [fromPath, e.releasedIn, e.fixedIn, e.changedIn, fallbackVersion].filter(
    (v): v is string => Boolean(v)
  );

  for (const v of candidates) {
    const base = lookupBlogUrl(v, releaseMap);
    if (base) {
      e.blogUrl = base + hash;
      return;
    }
  }
  delete e.blogUrl;
}

export function docsUrlFor(page: string, anchor?: string): string {
  return anchor ? `${pageBase(page)}#${anchor}` : pageBase(page);
}

/** Parse --version=1.4.0 or --version 1.4.0 from argv; default Bun.version. */
export function parseVersionFlag(argv: string[] = Bun.argv.slice(2)): string {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith('--version=')) return normalizeBunVersion(a.slice(10));
    if (a === '--version' && argv[i + 1]) return normalizeBunVersion(argv[i + 1]!);
  }
  return Bun.version;
}

/** Short commit from runtime when pin matches Bun.version; undefined when cross-pinned. */
export function runtimeCommitHash(forVersion: string): string | undefined {
  if (normalizeBunVersion(forVersion) !== Bun.version) return undefined;
  const rev = (Bun as { revision?: string }).revision;
  return rev ? rev.slice(0, 12) : undefined;
}

export type CatalogFileMeta = {
  generated: string;
  bunVersion: string;
  releaseUrl: string;
  blogUrl: string;
  /** Runtime git revision when catalog was built against this binary (optional) */
  commitHash?: string;
  /** Unversioned docs root — Bun does not ship /docs/vX.Y.Z/ trees today */
  docsRoot: string;
  /** true if bunVersion was pinned via --version rather than runtime default */
  versionPinned: boolean;
  entries: DocCatalogEntry[];
};

type IndexEntry = {
  section: string;
  title: string;
  url: string;
  desc: string;
  domain: string;
  anchors: string[];
  officialSection?: string;
};

type IndexFile = {
  generated: string;
  bunVersion?: string;
  entries: IndexEntry[];
};

// ── Normalization & page scoring ──────────────────────────────────────────

export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/^bun\./i, 'Bun.')
    .replace(/^--/, '--')
    .toLowerCase();
}

/** Strip #fragment then trailing .md → bare page URL */
export function pageBase(url: string): string {
  return url.split('#')[0]!.replace(/\.md$/i, '');
}

export function pageAnchor(url: string): string | undefined {
  const i = url.indexOf('#');
  return i >= 0 ? url.slice(i + 1) : undefined;
}

/**
 * Prefer API reference pages over narrative guides.
 * Higher score = better canonical candidate.
 */
export function scoreCanonicalPage(url: string, nameHint?: string): number {
  const u = url.toLowerCase();
  let s = 0;
  if (u.includes('/reference/')) s += 100;
  if (u.includes('/docs/runtime/')) s += 50;
  if (u.includes('/docs/bundler')) s += 50;
  if (u.includes('/docs/test') || u.includes('/docs/cli/test')) s += 50;
  if (u.includes('/docs/pm/')) s += 40;
  if (u.includes('/docs/guides/')) s -= 30;
  if (u.includes('/docs/project/')) s -= 10;
  // Dump listing — never prefer over dedicated API pages
  if (u.includes('/runtime/bun-apis')) s -= 80;
  if (nameHint) {
    const seg = nameHint
      .replace(/^Bun\./, '')
      .replace(/^bun:/, '')
      .replace(/^--/, '')
      .toLowerCase();
    if (seg && (u.includes(`/${seg}`) || u.includes(seg.replace(/\./g, '/')))) s += 15;
  }
  // Prefer shorter, more specific paths slightly
  s -= Math.min(20, (u.split('/').length - 4) * 2);
  return s;
}

export function pickCanonicalPage(pages: string[], nameHint?: string): string {
  if (pages.length === 0) throw new Error('pickCanonicalPage: empty pages');
  const uniq = [...new Set(pages.map(pageBase))];
  uniq.sort((a, b) => scoreCanonicalPage(b, nameHint) - scoreCanonicalPage(a, nameHint));
  return uniq[0]!;
}

export function sectionFromUrl(url: string): DocSection {
  const u = url.toLowerCase();
  if (u.includes('/reference/')) return 'reference';
  if (u.includes('/docs/runtime') || u.includes('/docs/cli/run')) return 'runtime';
  if (u.includes('/docs/bundler')) return 'bundler';
  if (u.includes('/docs/test') || u.includes('/docs/cli/test')) return 'test';
  if (u.includes('/docs/guides/')) return 'guides';
  if (u.includes('/docs/pm/') || u.includes('/docs/install') || u.includes('/docs/cli/install'))
    return 'pm';
  return 'other';
}

const PACKAGE_JSON_KEYS = new Set([
  'workspaces',
  'trustedDependencies',
  'overrides',
  'resolutions',
  'peerDependencies',
  'optionalDependencies',
  'devDependencies',
  'dependencies',
]);

export function inferType(name: string, url: string): DocRefType {
  // Bun APIs and built-in modules first (avoids misclassifying Bun.TOML as a config key)
  if (
    name.startsWith('Bun.') ||
    name.startsWith('bun:') ||
    /^[A-Z][A-Za-z0-9]+$/.test(name) ||
    url.includes('/reference/')
  )
    return 'api';
  // Bun environment variables (BUN_* and runtime-config env keys)
  if (name.startsWith('BUN_') || /^[A-Z][A-Z0-9_]*$/.test(name)) return 'env-var';
  // CLI flags / options
  if (name.startsWith('--')) {
    // Options take a value; flags are boolean-ish. Heuristic: presence of well-known value-taking names.
    const valueFlags =
      /^(?:--config|--cwd|--outdir|--target|--sourcemap|--backend|--cpu|--os|--env|--port|--host|--splitting|--format|--jsx|--tsconfig|--mainfields|--conditions|--publicpath|--assetnaming|--entrynaming|--chunknaming|--sourcemap)$/i;
    return valueFlags.test(name) ? 'cli-option' : 'cli-flag';
  }
  // Top-level bun subcommands
  if (/^bun [a-z][a-z0-9-]*$/.test(name)) return 'cli-command';
  // package.json reserved keys
  if (PACKAGE_JSON_KEYS.has(name)) return 'package-json-key';
  // bunfig.toml / configuration keys
  if (
    name.includes('bunfig') ||
    name === 'globalStore' ||
    name === 'linker' ||
    /config|bunfig|toml/i.test(name)
  )
    return 'config-key';
  // Narrative guides
  if (url.includes('/docs/guides/')) return 'guide';
  return 'concept';
}

function inferStability(
  name: string,
  desc: string,
  curated?: { stability?: string }
): DocStability {
  if (curated?.stability === 'experimental' || curated?.stability === 'deprecated') {
    return curated.stability;
  }
  const blob = `${name} ${desc}`.toLowerCase();
  if (/\bdeprecated\b/.test(blob)) return 'deprecated';
  if (/\bexperimental\b|\bunstable\b/.test(blob)) return 'experimental';
  // Known experimental surfaces (runtime-checked family)
  if (/^Bun\.WebView$/i.test(name) || /^http3$/i.test(name) || /^Bun\.secrets$/i.test(name))
    return 'experimental';
  return 'stable';
}

// ── Build ─────────────────────────────────────────────────────────────────

const COVERED_SECTIONS: DocSection[] = ['runtime', 'bundler', 'test', 'guides'];

function mergeEntry(
  map: Map<string, DocCatalogEntry>,
  partial: {
    name: string;
    type?: DocRefType;
    description?: string;
    stability?: DocStability;
    releasedIn?: string;
    lastUpdated?: string;
    verifiedOn?: string;
    page: string;
    anchor?: string;
    section?: DocSection;
    aliasOf?: string;
  }
): void {
  const key = normalizeName(partial.aliasOf ?? partial.name);
  const page = pageBase(partial.page);
  const existing = map.get(key);
  if (!existing) {
    const allPages = [page];
    const canonicalPage = pickCanonicalPage(allPages, partial.name);
    map.set(key, {
      name: partial.aliasOf ? partial.name : partial.name,
      type: partial.type ?? inferType(partial.name, page),
      description: partial.description,
      stability: partial.stability ?? 'stable',
      releasedIn: partial.releasedIn,
      lastUpdated: partial.lastUpdated,
      verifiedOn: partial.verifiedOn,
      canonicalPage,
      anchor: partial.anchor,
      allPages,
      section: partial.section ?? sectionFromUrl(page),
      aliases: partial.aliasOf ? [partial.name] : undefined,
    });
    // Prefer display name with Bun. prefix when available
    const e = map.get(key)!;
    if (partial.name.startsWith('Bun.') || partial.name.startsWith('bun:')) {
      e.name = partial.name.startsWith('bun:') ? partial.name : partial.name;
    }
    return;
  }

  // merge pages
  if (!existing.allPages.includes(page)) existing.allPages.push(page);
  existing.canonicalPage = pickCanonicalPage(existing.allPages, existing.name);
  // prefer more specific anchor from CANONICAL map
  if (partial.anchor && !existing.anchor) existing.anchor = partial.anchor;
  if (partial.anchor && existing.canonicalPage === page) existing.anchor = partial.anchor;
  // enrich description
  if (
    partial.description &&
    (!existing.description || partial.description.length > existing.description.length)
  ) {
    existing.description = partial.description;
  }
  // stability: experimental/deprecated win over stable once set non-stable
  if (partial.stability && partial.stability !== 'stable') {
    existing.stability = partial.stability;
  }
  // releasedIn: keep earliest known release when both set
  if (partial.releasedIn) {
    if (!existing.releasedIn || compareSemver(partial.releasedIn, existing.releasedIn) < 0) {
      existing.releasedIn = partial.releasedIn;
    }
  }
  // lastUpdated: keep latest ISO timestamp
  if (partial.lastUpdated) {
    if (!existing.lastUpdated || partial.lastUpdated > existing.lastUpdated) {
      existing.lastUpdated = partial.lastUpdated;
    }
  }
  if (partial.verifiedOn) existing.verifiedOn = partial.verifiedOn;
  // type: prefer api over concept
  if (partial.type === 'api' && existing.type === 'concept') existing.type = 'api';
  if (partial.type === 'cli-flag' || partial.type === 'config') existing.type = partial.type;
  // aliases
  if (partial.name !== existing.name) {
    const al = new Set(existing.aliases ?? []);
    al.add(partial.name);
    // keep Bun.* as primary name when possible
    if (partial.name.startsWith('Bun.') && !existing.name.startsWith('Bun.')) {
      al.add(existing.name);
      existing.name = partial.name;
    }
    existing.aliases = [...al].filter(a => a !== existing.name);
    if (existing.aliases.length === 0) delete existing.aliases;
  }
  existing.section = partial.section ?? existing.section;
}

/** Seed related edges from tier-A tokens sharing the same canonical page. */
export function seedPageRelations(entries: DocCatalogEntry[]): void {
  const byPage = new Map<string, DocCatalogEntry[]>();
  for (const e of entries) {
    if (!NOTE_COVERAGE_TYPES.includes(e.type)) continue;
    const list = byPage.get(e.canonicalPage) ?? [];
    list.push(e);
    byPage.set(e.canonicalPage, list);
  }
  for (const e of entries) {
    if (!NOTE_COVERAGE_TYPES.includes(e.type)) continue;
    const peers = (byPage.get(e.canonicalPage) ?? []).filter(p => p.name !== e.name).slice(0, 5);
    if (peers.length === 0) continue;
    const rel = new Set(e.related ?? []);
    for (const p of peers) rel.add(p.name);
    e.related = [...rel];
  }
}

/** Apply verified locus resolution for tier-A tokens. */
export function applyVerifiedLocusToEntries(
  entries: DocCatalogEntry[],
  canonicalRefs: Record<string, string>,
  pageAnchors: ReturnType<typeof buildPageAnchorIndex>,
  observedAt: string,
  resolveName?: (name: string) => string
): void {
  for (const e of entries) {
    if (!NOTE_COVERAGE_TYPES.includes(e.type)) continue;
    const { locus } = resolveVerifiedLocus(
      { name: e.name, canonicalPage: e.canonicalPage, anchor: e.anchor },
      canonicalRefs,
      pageAnchors,
      observedAt,
      resolveName ? { resolveName } : undefined
    );
    // Pin page from verified locus — do not leave scrape/dump pages (bun-apis) in place.
    e.canonicalPage = locus.page;
    e.anchor = locus.fragment;
    e.locusUnresolved = locus.unresolved ?? !locus.fragment;
    if (!e.allPages.includes(locus.page)) {
      e.allPages = [locus.page, ...e.allPages];
    } else {
      e.allPages = [locus.page, ...e.allPages.filter(p => p !== locus.page)];
    }
  }

  // Family inheritance: only when child still has no fragment (e.g. readableStreamTo*)
  const byName = new Map(entries.map(e => [e.name, e]));
  const inheritedNames = new Set<string>();
  for (const e of entries) {
    if (!NOTE_COVERAGE_TYPES.includes(e.type)) continue;
    if (e.anchor && !e.locusUnresolved) continue;
    const parent = findParentWithFragment(e.name, byName);
    if (!parent) continue;
    e.canonicalPage = parent.page;
    e.anchor = parent.fragment;
    e.locusUnresolved = false;
    e.allPages = [parent.page, ...e.allPages.filter(p => p !== parent.page)];
    const rel = new Set(e.related ?? []);
    rel.add(parent.name);
    e.related = [...rel];
    inheritedNames.add(e.name);
  }

  // Stamp rich STATUS after inheritance
  for (const e of entries) {
    if (!NOTE_COVERAGE_TYPES.includes(e.type)) continue;
    if (inheritedNames.has(e.name)) {
      e.locusStatus = 'inherited';
      e.locusUnresolved = false;
      continue;
    }
    e.locusStatus = classifyLocusStatus({
      name: e.name,
      canonicalPage: e.canonicalPage,
      anchor: e.anchor,
      locusUnresolved: e.locusUnresolved,
      pageAnchors,
    });
    // Page-level / reference count as located for LOC metric
    if (e.locusStatus === 'page' || e.locusStatus === 'reference') {
      e.locusUnresolved = false;
    }
  }
}

/** Compare loose semver strings; negative if a < b. */
export function compareSemver(a: string, b: string): number {
  const pa = a
    .replace(/^v/, '')
    .split('.')
    .map(n => parseInt(n, 10) || 0);
  const pb = b
    .replace(/^v/, '')
    .split('.')
    .map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export async function loadIndex(): Promise<IndexFile> {
  return (await Bun.file(INDEX_PATH).json()) as IndexFile;
}

export async function buildCatalog(opts?: {
  bunVersion?: string;
  versionPinned?: boolean;
  /** Re-fetch RSS + overwrite NOTE even when description exists */
  force?: boolean;
  /** Skip live HTML NOTE enrichment */
  skipNotes?: boolean;
  /** Force refresh of release-index.json from RSS (default: refresh if missing) */
  refreshRss?: boolean;
}): Promise<DocCatalogEntry[]> {
  const index = await loadIndex();
  const map = new Map<string, DocCatalogEntry>();
  const docsLastUpdated = index.generated;
  const verifiedOn = opts?.bunVersion ?? Bun.version;
  const { map: releaseMap } = await loadReleaseIndex({
    refresh: opts?.refreshRss ?? true,
    force: opts?.force,
  });

  // 1) Index pages for covered sections → concept rows (page-level)
  for (const e of index.entries) {
    const page = pageBase(e.url.replace(/\.md$/, ''));
    const section = sectionFromUrl(page);
    if (!['runtime', 'bundler', 'test', 'guides', 'reference', 'pm'].includes(section)) continue;

    mergeEntry(map, {
      name: e.title,
      type: section === 'reference' ? 'api' : 'concept',
      description: e.desc || undefined,
      page,
      section: section === 'reference' ? 'reference' : section,
      stability: inferStability(e.title, e.desc),
      lastUpdated: docsLastUpdated,
      verifiedOn,
    });
  }

  // 2) Institutional CANONICAL_REFS → api / cli-flag / config
  const { CANONICAL_REFS } = await import('./bun-doc-refs.ts');
  for (const [name, url] of Object.entries(CANONICAL_REFS)) {
    if (!url.startsWith('https://bun.com/') && !url.startsWith('https://github.com/oven-sh/bun')) {
      continue;
    }
    if (
      [
        'llms.txt index',
        'rss feed',
        'discord',
        'issues',
        'install script',
        'download',
        'security policy',
      ].includes(name)
    ) {
      continue;
    }
    const page = pageBase(url);
    const anchor = pageAnchor(url);
    mergeEntry(map, {
      name,
      type: inferType(name, page),
      page,
      anchor,
      section: sectionFromUrl(page),
      stability: inferStability(name, ''),
      lastUpdated: docsLastUpdated,
      verifiedOn,
    });
  }

  // 3) Curated hot-path enrichment (description + stability + releasedIn + related)
  for (const c of CURATED_ENTRIES) {
    const page = `https://bun.com/docs/${c.path}`;
    mergeEntry(map, {
      name: c.term,
      type: inferType(c.term, page),
      description: c.description,
      stability: inferStability(c.term, c.description, c),
      releasedIn: c.minVersion,
      lastUpdated: docsLastUpdated,
      verifiedOn,
      page,
      section: sectionFromUrl(page),
    });
    if (c.related) {
      for (const rel of c.related) {
        mergeEntry(map, {
          name: c.term,
          page: `https://bun.com/docs/${rel}`,
          lastUpdated: docsLastUpdated,
          verifiedOn,
        });
      }
    }
  }

  // 4) Generated token supplement (CLI flags, env vars, config keys, APIs, concepts)
  // Accepts either a bare entry array or { bunVersion?, entries: [...] }.
  try {
    type SuppRow = {
      name: string;
      type: DocRefType;
      stability: DocStability;
      description?: string;
      releasedIn?: string;
      lastUpdated?: string;
      canonicalPage: string;
      anchor?: string;
      allPages: string[];
      section: DocSection;
      examples?: Array<{ lang: string; body: string; fragment?: string }>;
    };
    const raw = (await Bun.file(TOKEN_SUPPLEMENT_PATH).json()) as
      | SuppRow[]
      | { bunVersion?: string; entries?: SuppRow[] };
    const supplement: SuppRow[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.entries)
        ? raw.entries
        : [];
    for (const e of supplement) {
      mergeEntry(map, {
        name: e.name,
        type: e.type,
        description: e.description,
        stability: e.stability,
        releasedIn: e.releasedIn,
        lastUpdated: e.lastUpdated ?? docsLastUpdated,
        verifiedOn,
        page: e.canonicalPage,
        anchor: e.anchor,
        section: e.section,
      });
      const merged = map.get(normalizeName(e.name));
      if (merged && e.examples?.length) {
        merged.examples = [...(merged.examples ?? []), ...e.examples].slice(0, 3);
      }
      for (const alt of e.allPages ?? []) {
        if (alt === e.canonicalPage) continue;
        mergeEntry(map, {
          name: e.name,
          page: alt,
          lastUpdated: docsLastUpdated,
          verifiedOn,
        });
      }
    }
  } catch {
    // supplement is optional until generator has been run
  }

  // Curated descriptions are authoritative: override any index/auto/supplement text.
  for (const c of CURATED_ENTRIES) {
    if (!c.description) continue;
    const entry = map.get(normalizeName(c.term));
    if (entry) entry.description = c.description;
  }

  // 5) Inject changelog-only tokens missing from docs merge (e.g. process.env fixes)
  const clIndex = changelogIndex();
  for (const [key, cl] of clIndex) {
    if (cl.events.length === 0) continue;
    if (map.has(key)) continue;
    const primary = cl.events[0]!;
    const page = 'https://bun.com/docs/runtime';
    mergeEntry(map, {
      name: primary.name,
      type: inferType(primary.name, page),
      description: cl.changeNote ?? primary.note,
      page,
      section: 'runtime',
      stability: 'stable',
      lastUpdated: docsLastUpdated,
      verifiedOn,
    });
  }

  // Final sort: section then name
  const sectionOrder: DocSection[] = [
    'runtime',
    'bundler',
    'test',
    'guides',
    'pm',
    'reference',
    'other',
  ];
  const entries = [...map.values()].sort((a, b) => {
    const si = sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);
    if (si !== 0) return si;
    return a.name.localeCompare(b.name);
  });

  // 6) Curated changelog overlay (token → releasedIn/fixedIn/commit/note)
  for (const e of entries) {
    applyChangelogOverlay(e, clIndex);
  }

  // 6b) Release-post scrape overlay (fills SHIP/FIX/CHG; curated wins on conflicts)
  const releaseOverlay = await loadReleaseOverlay();
  if (releaseOverlay.size > 0) {
    for (const e of entries) {
      applyReleaseOverlay(e, releaseOverlay);
    }
  }

  // 7) Phase 1 NOTE — fill empty descriptions from live doc HTML (cached).
  if (!opts?.skipNotes) {
    const needUrls = [
      ...new Set(
        entries
          .filter(e => !e.description)
          .map(e => e.canonicalPage)
          .filter(Boolean)
      ),
    ];
    if (needUrls.length > 0) {
      const notes = await fetchPageNotes(needUrls, { force: opts?.force });
      for (const e of entries) {
        if (e.description) continue;
        const note = notes.get(e.canonicalPage.replace(/\.md$/, ''));
        if (note) e.description = note;
      }
    }
    await fillNotesFromMarkdown(entries, { force: opts?.force });
  }

  const pageAnchors = buildPageAnchorIndex(index.entries);
  const { resolveApiAlias } = await import('./bun-doc-refs.ts');
  applyVerifiedLocusToEntries(
    entries,
    CANONICAL_REFS,
    pageAnchors,
    new Date().toISOString(),
    resolveApiAlias
  );
  seedPageRelations(entries);

  // Re-pick canonical only when locus is still unresolved; verified pages stay pinned.
  for (const e of entries) {
    if (e.locusUnresolved || !e.anchor) {
      e.canonicalPage = pickCanonicalPage(e.allPages, e.name);
    }
    e.allPages = [e.canonicalPage, ...e.allPages.filter(p => p !== e.canonicalPage)];
    e.lastUpdated ??= docsLastUpdated;
    e.verifiedOn = verifiedOn;
    e.docsUrl = docsUrlFor(e.canonicalPage, e.anchor);
    // Prefer release notes for feature ship version; else latest fix; else catalog pin
    const forRelease = e.releasedIn ?? e.fixedIn ?? e.changedIn ?? verifiedOn;
    const releaseVersion = normalizeBunVersion(forRelease);
    e.releaseUrl = releaseMap.has(releaseVersion)
      ? releaseUrlFor(forRelease)
      : BUN_GITHUB_RELEASES_URL;
    // Blog: RSS-validated only (Phase 0). Overlay #anchors preserved when base exists.
    stampEntryBlogUrl(e, releaseMap, forRelease);
  }

  return entries;
}

/** Merge scraped release-post overlay (curated changelog wins on notes/SHAs). */
export function applyReleaseOverlay(
  e: DocCatalogEntry,
  overlay: Map<string, ReleaseOverlayEntry>
): void {
  const o =
    overlay.get(normalizeName(e.name)) ??
    e.aliases?.map(a => overlay.get(normalizeName(a))).find(Boolean);
  if (!o) return;

  if (o.releasedIn) {
    if (!e.releasedIn || compareSemver(o.releasedIn, e.releasedIn) < 0) {
      e.releasedIn = o.releasedIn;
    }
  }
  if (o.fixedIn) {
    if (!e.fixedIn || compareSemver(o.fixedIn, e.fixedIn) > 0) {
      e.fixedIn = o.fixedIn;
    }
  }
  if (o.changedIn) {
    if (!e.changedIn || compareSemver(o.changedIn, e.changedIn) > 0) {
      e.changedIn = o.changedIn;
    }
  }
  if (o.changeNote && !e.changeNote) {
    e.changeNote = o.changeNote;
  }
}

export async function loadReleaseOverlay(): Promise<Map<string, ReleaseOverlayEntry>> {
  if (!(await Bun.file(RELEASE_OVERLAY_PATH).exists())) return new Map();
  try {
    const file = (await Bun.file(RELEASE_OVERLAY_PATH).json()) as ReleaseOverlayFile;
    return releaseOverlayIndex(file);
  } catch {
    return new Map();
  }
}

export type CoverageReport = {
  total: number;
  note: { count: number; pct: number };
  blog: { count: number; pct: number };
  ship: { count: number; pct: number };
  fix: { count: number; pct: number };
  byType: Record<
    string,
    { total: number; note: number; notePct: number; ship: number; shipPct: number }
  >;
  warnings: string[];
};

/** Tier A = agent lookup tokens (api, flags, config, env, pkg keys). */
export type TierACoverage = {
  total: number;
  note: { count: number; pct: number };
  ship: { count: number; pct: number };
  blog: { count: number; pct: number };
  fix: { count: number; pct: number };
  locus: { count: number; pct: number };
  examples: { count: number; pct: number };
  history: { count: number; pct: number };
  bunVersion?: string;
  generated?: string;
};

export function tierACoverageSummary(
  entries: DocCatalogEntry[],
  meta?: { bunVersion?: string; generated?: string }
): TierACoverage {
  const slice = entries.filter(e => NOTE_COVERAGE_TYPES.includes(e.type));
  const total = slice.length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const withHistory = slice.filter(e => !!(e.releasedIn || e.fixedIn || e.changedIn)).length;
  const withLocus = slice.filter(e => {
    const s = e.locusStatus;
    if (s === 'fragment' || s === 'page' || s === 'inherited' || s === 'reference') return true;
    return !!(e.anchor && !e.locusUnresolved);
  }).length;
  const withExamples = slice.filter(e => (e.examples?.length ?? 0) > 0).length;
  return {
    total,
    note: {
      count: slice.filter(e => e.description).length,
      pct: pct(slice.filter(e => e.description).length),
    },
    ship: {
      count: slice.filter(e => e.releasedIn).length,
      pct: pct(slice.filter(e => e.releasedIn).length),
    },
    blog: {
      count: slice.filter(e => e.blogUrl).length,
      pct: pct(slice.filter(e => e.blogUrl).length),
    },
    fix: {
      count: slice.filter(e => e.fixedIn).length,
      pct: pct(slice.filter(e => e.fixedIn).length),
    },
    locus: { count: withLocus, pct: pct(withLocus) },
    examples: { count: withExamples, pct: pct(withExamples) },
    history: { count: withHistory, pct: pct(withHistory) },
    ...(meta?.bunVersion ? { bunVersion: meta.bunVersion } : {}),
    ...(meta?.generated ? { generated: meta.generated } : {}),
  };
}

export async function loadTierACoverageFromDisk(): Promise<TierACoverage | null> {
  if (!(await Bun.file(OUT_PATH).exists())) return null;
  try {
    const j = (await Bun.file(OUT_PATH).json()) as {
      bunVersion?: string;
      generated?: string;
      entries?: DocCatalogEntry[];
    };
    if (!Array.isArray(j.entries)) return null;
    return tierACoverageSummary(j.entries, {
      bunVersion: j.bunVersion,
      generated: j.generated,
    });
  } catch {
    return null;
  }
}

export function catalogCoverageReport(entries: DocCatalogEntry[]): CoverageReport {
  const warnings: string[] = [];
  const withDesc = entries.filter(e => e.description).length;
  const withBlog = entries.filter(e => e.blogUrl).length;
  const withShip = entries.filter(e => e.releasedIn).length;
  const withFix = entries.filter(e => e.fixedIn).length;
  const byType: CoverageReport['byType'] = {};

  for (const type of NOTE_COVERAGE_TYPES) {
    const slice = entries.filter(e => e.type === type);
    if (slice.length === 0) continue;
    const note = slice.filter(e => e.description).length;
    const ship = slice.filter(e => e.releasedIn).length;
    const notePct = Math.round((note / slice.length) * 100);
    byType[type] = {
      total: slice.length,
      note,
      notePct,
      ship,
      shipPct: Math.round((ship / slice.length) * 100),
    };
    if (notePct < 95) {
      warnings.push(`${type} NOTE ${notePct}% (${note}/${slice.length}) below 95% target`);
    }
  }

  return {
    total: entries.length,
    note: { count: withDesc, pct: Math.round((withDesc / entries.length) * 100) },
    blog: { count: withBlog, pct: Math.round((withBlog / entries.length) * 100) },
    ship: { count: withShip, pct: Math.round((withShip / entries.length) * 100) },
    fix: { count: withFix, pct: Math.round((withFix / entries.length) * 100) },
    byType,
    warnings,
  };
}

function printCoverageReport(report: CoverageReport, entries?: DocCatalogEntry[]): void {
  console.info(
    `   coverage NOTE=${report.note.count}/${report.total} (${report.note.pct}%)` +
      ` BLOG=${report.blog.count}/${report.total} (${report.blog.pct}%)` +
      ` SHIP=${report.ship.count}/${report.total} (${report.ship.pct}%)` +
      ` FIX=${report.fix.count}/${report.total} (${report.fix.pct}%)`
  );
  if (entries?.length) {
    const tier = tierACoverageSummary(entries);
    console.info(
      `   tier-A (${tier.total}): NOTE ${tier.note.pct}% SHIP ${tier.ship.pct}% BLOG ${tier.blog.pct}% FIX ${tier.fix.pct}% LOC ${tier.locus.pct}% EX ${tier.examples.pct}% HIST ${tier.history.pct}%`
    );
  }
  for (const [type, s] of Object.entries(report.byType)) {
    console.info(`   ${type}: NOTE ${s.notePct}% (${s.note}/${s.total}) SHIP ${s.shipPct}%`);
  }
  for (const w of report.warnings) console.warn(`   warn: ${w}`);
}

async function fillNotesFromMarkdown(
  entries: DocCatalogEntry[],
  opts?: { force?: boolean }
): Promise<void> {
  const need = entries.filter(
    e => (opts?.force || !e.description) && NOTE_COVERAGE_TYPES.includes(e.type)
  );
  if (need.length === 0) return;

  const urls = [...new Set(need.map(e => e.canonicalPage.replace(/\.md$/, '')))];
  let i = 0;
  const concurrency = 8;
  const notes = new Map<string, string>();

  async function worker(): Promise<void> {
    while (i < urls.length) {
      const url = urls[i++]!;
      const mdUrl = `${url}.md`;
      try {
        const res = await fetch(mdUrl);
        if (!res.ok) continue;
        const md = await res.text();
        const note = extractNoteFromMarkdown(md);
        if (note) notes.set(url, note);
      } catch {
        /* skip */
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()));

  for (const e of need) {
    if (!opts?.force && e.description) continue;
    const note = notes.get(e.canonicalPage.replace(/\.md$/, ''));
    if (note) e.description = note;
  }
}

export function compactCatalogRow(
  e: DocCatalogEntry,
  meta: { bunVersion: string },
  maxNote = 160
): Record<string, string> {
  const cells = listCells(e, meta);
  const note = cells.note.length > maxNote ? `${cells.note.slice(0, maxNote - 1)}…` : cells.note;
  const example = e.examples?.[0];
  return {
    name: e.name,
    type: e.type,
    ship: e.releasedIn ?? '',
    fix: e.fixedIn ?? '',
    chg: e.changedIn ?? '',
    pin: e.verifiedOn ?? meta.bunVersion,
    blog: e.blogUrl ?? '',
    doc: e.docsUrl ?? e.canonicalPage,
    locus: e.anchor && !e.locusUnresolved ? `#${e.anchor}` : '',
    exampleLang: example?.lang ?? '',
    note,
  };
}

/** Apply curated changelog stamps onto a catalog entry (mutates). */
export function applyChangelogOverlay(e: DocCatalogEntry, index = changelogIndex()): void {
  const cl =
    index.get(normalizeName(e.name)) ??
    e.aliases?.map(a => index.get(normalizeName(a))).find(Boolean);
  if (!cl || cl.events.length === 0) return;

  if (cl.releasedIn) {
    if (!e.releasedIn || compareSemver(cl.releasedIn, e.releasedIn) < 0) {
      e.releasedIn = cl.releasedIn;
    }
  }
  if (cl.fixedIn) e.fixedIn = cl.fixedIn;
  if (cl.changedIn) e.changedIn = cl.changedIn;
  if (cl.changeNote) e.changeNote = cl.changeNote;
  if (cl.changeCommit) {
    e.changeCommit = cl.changeCommit;
    e.commitUrl = cl.commitUrl;
  }
  if (cl.blogVersion) {
    // Provisional URL + optional section anchor; buildCatalog re-validates via RSS.
    const base = blogUrlFor(cl.blogVersion);
    e.blogUrl = cl.blogAnchor ? `${base}#${cl.blogAnchor}` : base;
  }
}

export async function writeCatalog(
  entries: DocCatalogEntry[],
  opts?: {
    bunVersion?: string;
    versionPinned?: boolean;
    commitHash?: string;
    releaseMap?: Map<string, ReleaseEntry>;
  }
): Promise<void> {
  const bunVersion = normalizeBunVersion(opts?.bunVersion ?? Bun.version);
  const releaseMap = opts?.releaseMap ?? (await loadReleaseIndex({ refresh: false })).map;
  const releaseUrl = releaseMap.has(bunVersion)
    ? releaseUrlFor(bunVersion)
    : BUN_GITHUB_RELEASES_URL;
  const blogUrl = lookupBlogUrl(bunVersion, releaseMap) ?? '';
  const commitHash = opts?.commitHash ?? runtimeCommitHash(bunVersion);
  const payload = {
    generated: new Date().toISOString(),
    bunVersion,
    releaseUrl,
    blogUrl,
    ...(commitHash ? { commitHash } : {}),
    docsRoot: 'https://bun.com/docs',
    versionPinned: opts?.versionPinned ?? false,
    note: 'docsUrl = unversioned latest docs; blogUrl from tools/release-index.json (RSS); releaseUrl = GitHub tag; fixedIn/changeNote from tools/bun-docs-changelog.ts',
    source: {
      index: 'tools/bun-docs-index.json',
      canonicalRefs: 'tools/bun-doc-refs.ts#CANONICAL_REFS',
      curated: 'tools/bun-docs-curated.ts',
      changelog: 'tools/bun-docs-changelog.ts',
      releaseIndex: 'tools/release-index.json',
      releaseOverlay: 'tools/bun-docs-release-overlay.json',
      tokenSupplement: 'tools/bun-docs-token-supplement.json',
    },
    schema: {
      name: 'string',
      type: 'api | cli-flag | config | concept',
      description: 'string?',
      stability: 'stable | experimental | deprecated',
      releasedIn: 'string? — Bun semver when feature shipped (curated)',
      fixedIn: 'string? — latest curated fix version',
      changedIn: 'string? — latest curated change/deprecate version',
      changeNote: 'string? — overlay note (fix > change > feature)',
      changeCommit: 'string? — optional git SHA from overlay',
      commitUrl: 'string? — github.com/oven-sh/bun/commit/…',
      lastUpdated: 'string? — ISO when docs index last refreshed',
      verifiedOn: 'string? — catalog pin Bun version',
      releaseUrl: 'string? — GitHub release for releasedIn or verifiedOn',
      blogUrl: 'string? — RSS-validated bun.com/blog/bun-vX.Y.Z (+ optional #anchor)',
      docsUrl: 'string? — unversioned bun.com docs page (+ anchor)',
      canonicalPage: 'string',
      anchor: 'string?',
      allPages: 'string[]',
      section: 'runtime | bundler | test | guides | pm | reference | other',
      aliases: 'string[]?',
    },
    coveredSections: COVERED_SECTIONS,
    count: entries.length,
    withReleasedIn: entries.filter(e => e.releasedIn).length,
    withFixedIn: entries.filter(e => e.fixedIn).length,
    withChangeNote: entries.filter(e => e.changeNote).length,
    withBlogUrl: entries.filter(e => e.blogUrl).length,
    withDescription: entries.filter(e => e.description).length,
    withReleasedInCount: entries.filter(e => e.releasedIn).length,
    byType: countBy(entries, e => e.type),
    bySection: countBy(entries, e => e.section),
    byStability: countBy(entries, e => e.stability),
    entries,
  };
  await Bun.write(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const o: Record<string, number> = {};
  for (const i of items) {
    const k = key(i);
    o[k] = (o[k] ?? 0) + 1;
  }
  return o;
}

export async function loadCatalogFile(): Promise<CatalogFileMeta> {
  if (!(await Bun.file(OUT_PATH).exists())) {
    const bunVersion = parseVersionFlag();
    const entries = await buildCatalog({ bunVersion });
    await writeCatalog(entries, {
      bunVersion,
      versionPinned: bunVersion !== Bun.version,
    });
  }
  const j = (await Bun.file(OUT_PATH).json()) as Partial<CatalogFileMeta> & {
    entries?: DocCatalogEntry[];
  };
  const entries = Array.isArray(j.entries) ? j.entries : await buildCatalog();
  const bunVersion = normalizeBunVersion(j.bunVersion ?? Bun.version);
  return {
    generated: j.generated ?? new Date().toISOString(),
    bunVersion,
    releaseUrl: j.releaseUrl ?? releaseUrlFor(bunVersion),
    blogUrl: j.blogUrl ?? '',
    commitHash: j.commitHash,
    docsRoot: j.docsRoot ?? 'https://bun.com/docs',
    versionPinned: j.versionPinned ?? false,
    entries,
  };
}

export async function loadCatalog(): Promise<DocCatalogEntry[]> {
  return (await loadCatalogFile()).entries;
}

export async function getCatalogEntry(name: string): Promise<DocCatalogEntry | null> {
  const entries = await loadCatalog();
  const n = normalizeName(name);
  return (
    entries.find(e => normalizeName(e.name) === n) ??
    entries.find(e => e.aliases?.some(a => normalizeName(a) === n)) ??
    null
  );
}

/** Agent export: DocCatalogEntry → TokenRef → BunToken (with overlay timeline). */
export async function getBunToken(
  name: string
): Promise<import('../lib/docs/bun-token.ts').BunToken | null> {
  const entry = await getCatalogEntry(name);
  if (!entry) return null;
  const { catalogEntryToBunToken } = await import('../lib/docs/token-ref-adapter.ts');
  const overlay = await loadReleaseOverlay();
  const hits = overlay.get(normalizeName(entry.name))?.hits;
  const meta = await loadCatalogFile();
  return catalogEntryToBunToken(entry, {
    hits,
    catalogGenerated: meta.generated,
    catalogCommitHash: meta.commitHash,
  });
}

/** Export all catalog entries as BunToken[] (overlay hits when present). */
export async function exportBunTokens(): Promise<import('../lib/docs/bun-token.ts').BunToken[]> {
  const { catalogEntryToBunToken } = await import('../lib/docs/token-ref-adapter.ts');
  const meta = await loadCatalogFile();
  const overlay = await loadReleaseOverlay();
  return meta.entries.map(e =>
    catalogEntryToBunToken(e, {
      hits: overlay.get(normalizeName(e.name))?.hits,
      catalogGenerated: meta.generated,
      catalogCommitHash: meta.commitHash,
    })
  );
}

// ── CLI ───────────────────────────────────────────────────────────────────

function printCatalogHeader(meta: CatalogFileMeta, runtime = Bun.version): void {
  const pin = meta.versionPinned ? ' (pinned via --version)' : '';
  console.info(`# catalog bunVersion=${meta.bunVersion}${pin}`);
  console.info(`# release ${meta.releaseUrl}`);
  console.info(`# blog ${meta.blogUrl || '(none in RSS release-index)'}`);
  if (meta.commitHash) console.info(`# commit ${meta.commitHash}`);
  console.info(`# docsRoot ${meta.docsRoot}  (unversioned latest)`);
  if (meta.bunVersion !== runtime) {
    console.info(`# warn: runtime Bun.version=${runtime} ≠ catalog pin ${meta.bunVersion}`);
  }
  console.info(`# generated ${meta.generated}`);
  console.info('');
}

function printEntry(e: DocCatalogEntry, verbose = true): void {
  const url = e.docsUrl ?? (e.anchor ? `${e.canonicalPage}#${e.anchor}` : e.canonicalPage);
  console.info(`${e.name}`);
  console.info(`  type: ${e.type}  stability: ${e.stability}  section: ${e.section}`);
  if (e.description) console.info(`  ${e.description}`);
  console.info(
    `  releasedIn: ${e.releasedIn ?? 'unknown'}` +
      (e.fixedIn ? `  fixedIn: ${e.fixedIn}` : '') +
      (e.changedIn ? `  changedIn: ${e.changedIn}` : '') +
      `  lastUpdated: ${e.lastUpdated ?? 'unknown'}  verifiedOn: ${e.verifiedOn ?? 'unknown'}`
  );
  if (e.changeNote) console.info(`  changeNote: ${e.changeNote}`);
  if (e.changeCommit) {
    console.info(`  changeCommit: ${e.changeCommit}${e.commitUrl ? `  (${e.commitUrl})` : ''}`);
  }
  console.info(`  docsUrl: ${url}`);
  if (e.releaseUrl) console.info(`  releaseUrl: ${e.releaseUrl}`);
  if (e.blogUrl) console.info(`  blogUrl: ${e.blogUrl}`);
  if (verbose && e.allPages.length > 1) {
    console.info(`  allPages (${e.allPages.length}):`);
    for (const p of e.allPages) {
      const mark = p === e.canonicalPage ? '★' : ' ';
      console.info(`   ${mark} ${p}`);
    }
  }
  if (e.aliases?.length) console.info(`  aliases: ${e.aliases.join(', ')}`);
}

/** Exit 0 if catalog pin matches expected version (default: runtime Bun.version). */
export async function verifyCatalog(
  expectedVersion: string = Bun.version
): Promise<{ ok: boolean; messages: string[] }> {
  const meta = await loadCatalogFile();
  const messages: string[] = [];
  let ok = true;

  if (meta.bunVersion !== expectedVersion) {
    ok = false;
    messages.push(
      `catalog bunVersion=${meta.bunVersion} ≠ expected ${expectedVersion} (rebuild: bun tools/bun-docs-catalog.ts build)`
    );
  } else {
    messages.push(`ok bunVersion=${meta.bunVersion}`);
  }

  const { map: releaseMap } = await loadReleaseIndex({ refresh: false });
  const expectedRelease = releaseMap.has(normalizeBunVersion(expectedVersion))
    ? releaseUrlFor(expectedVersion)
    : BUN_GITHUB_RELEASES_URL;
  if (meta.releaseUrl !== expectedRelease) {
    ok = false;
    messages.push(`catalog releaseUrl mismatch: ${meta.releaseUrl} (expected ${expectedRelease})`);
  } else {
    messages.push(`ok releaseUrl=${meta.releaseUrl}`);
  }

  const expectedBlog = lookupBlogUrl(expectedVersion, releaseMap) ?? '';
  if ((meta.blogUrl ?? '') !== expectedBlog) {
    ok = false;
    messages.push(
      `catalog blogUrl mismatch: ${meta.blogUrl || '(empty)'} (expected ${expectedBlog || '(empty — not in RSS)'})`
    );
  } else {
    messages.push(`ok blogUrl=${meta.blogUrl || '(empty — not in RSS)'}`);
  }

  const mismatched = meta.entries.filter(e => e.verifiedOn && e.verifiedOn !== meta.bunVersion);
  if (mismatched.length > 0) {
    ok = false;
    messages.push(
      `${mismatched.length} entries have verifiedOn ≠ catalog bunVersion (e.g. ${mismatched[0]!.name}=${mismatched[0]!.verifiedOn})`
    );
  } else {
    messages.push(`ok verifiedOn on ${meta.entries.length} entries`);
  }

  const missingUrls = meta.entries.filter(e => !e.docsUrl || !e.releaseUrl).length;
  if (missingUrls > 0) {
    // Soft warning — rebuild stamps these; do not fail older catalogs hard if pin matches
    messages.push(`warn: ${missingUrls} entries missing docsUrl/releaseUrl (rebuild to stamp)`);
  }

  return { ok, messages };
}

async function main(): Promise<void> {
  const [, , cmd = 'build', ...rest] = Bun.argv;
  if (cmd === 'build') {
    const bunVersion = parseVersionFlag(rest);
    const versionPinned = bunVersion !== Bun.version;
    const commitHash = runtimeCommitHash(bunVersion);
    const force = rest.includes('--force');
    const skipNotes = rest.includes('--skip-notes');
    const refreshRss = !rest.includes('--no-refresh-rss');
    const { map: releaseMap } = await loadReleaseIndex({ refresh: refreshRss, force });
    const entries = await buildCatalog({
      bunVersion,
      versionPinned,
      force,
      skipNotes,
      refreshRss,
    });
    await writeCatalog(entries, { bunVersion, versionPinned, commitHash, releaseMap });
    const typeCounts = countBy(entries, e => e.type);
    const topBlog = lookupBlogUrl(bunVersion, releaseMap) ?? '(none in RSS)';
    const coverage = catalogCoverageReport(entries);
    console.info(
      `✅ catalog ${entries.length} entries → tools/bun-docs-catalog.json` +
        `  bunVersion=${bunVersion}` +
        (versionPinned ? ' (pinned)' : '') +
        `  release=${releaseUrlFor(bunVersion)}` +
        `  blog=${topBlog}` +
        (commitHash ? `  commit=${commitHash}` : '') +
        `  (${Object.entries(typeCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')})`
    );
    printCoverageReport(coverage, entries);
    return;
  }
  if (cmd === 'export') {
    // Downstream closed early (e.g. `| head -1`) — exit cleanly; Bun 1.3.14+
    // also fixed FileSink leak on EPIPE, but the signal itself is expected.
    process.stdout.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EPIPE') process.exit(0);
    });
    const meta = await loadCatalogFile();
    const compact = rest.includes('--compact') || rest.includes('-c');
    const jsonl = rest.includes('--jsonl');
    // Default JSON / JSONL: BunToken export contract. --compact keeps thin TSV.
    if (!compact) {
      const tokens = await exportBunTokens();
      if (jsonl) {
        for (const t of tokens) {
          process.stdout.write(`${JSON.stringify(t)}\n`);
        }
        return;
      }
      process.stdout.write(
        `${JSON.stringify(
          {
            schema: 'lib/docs/bun-token.schema.json',
            bunVersion: meta.bunVersion,
            generated: meta.generated,
            count: tokens.length,
            tokens,
          },
          null,
          2
        )}\n`
      );
      return;
    }
    const rows = meta.entries.map(e => compactCatalogRow(e, meta));
    if (jsonl) {
      for (const row of rows) {
        process.stdout.write(`${JSON.stringify(row)}\n`);
      }
      return;
    }
    process.stdout.write('name\ttype\tship\tfix\tchg\tpin\tblog\tdoc\tlocus\texampleLang\tnote\n');
    for (const row of rows) {
      process.stdout.write(
        `${row.name}\t${row.type}\t${row.ship}\t${row.fix}\t${row.chg}\t${row.pin}\t${row.blog}\t${row.doc}\t${row.locus}\t${row.exampleLang}\t${row.note}\n`
      );
    }
    return;
  }
  if (cmd === 'list') {
    const meta = await loadCatalogFile();
    let entries = meta.entries;
    let section: DocSection | undefined;
    let type: DocRefType | undefined;
    let search: string | undefined;
    const json = rest.includes('--json') || rest.includes('-j');
    const verbose = rest.includes('--verbose') || rest.includes('-v');
    const wide = rest.includes('--wide') || rest.includes('-w');
    const notes = rest.includes('--notes') || rest.includes('-n');
    const compact = rest.includes('--compact') || rest.includes('-c');
    const locus = rest.includes('--locus') || rest.includes('-L');
    // --version / --release remain as aliases that expand to wide columns
    let showVersion = false;
    let showRelease = false;
    let links = rest.includes('--links') || rest.includes('-l');
    for (let i = 0; i < rest.length; i++) {
      const a = rest[i]!;
      if (a.startsWith('--section=') || a.startsWith('-s=')) {
        section = a.slice(a.indexOf('=') + 1) as DocSection;
      } else if ((a === '--section' || a === '-s') && rest[i + 1]) {
        section = rest[++i] as DocSection;
      } else if (a.startsWith('--type=') || a.startsWith('-t=')) {
        type = a.slice(a.indexOf('=') + 1) as DocRefType;
      } else if ((a === '--type' || a === '-t') && rest[i + 1]) {
        type = rest[++i] as DocRefType;
      } else if (a.startsWith('--search=') || a.startsWith('-q=')) {
        search = a.slice(a.indexOf('=') + 1);
      } else if ((a === '--search' || a === '-q') && rest[i + 1]) {
        search = rest[++i];
      } else if (a === '--version') {
        showVersion = true;
      } else if (a === '--release') {
        showRelease = true;
      }
    }
    if (section) entries = entries.filter(e => e.section === section);
    if (type) entries = entries.filter(e => e.type === type);
    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(
        e =>
          e.name.toLowerCase().includes(q) ||
          e.aliases?.some(a => a.toLowerCase().includes(q)) ||
          e.description?.toLowerCase().includes(q) ||
          e.canonicalPage.toLowerCase().includes(q) ||
          e.anchor?.toLowerCase().includes(q) ||
          e.changeNote?.toLowerCase().includes(q) ||
          e.releasedIn?.includes(q) ||
          e.fixedIn?.includes(q)
      );
    }
    if (json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            bunVersion: meta.bunVersion,
            releaseUrl: meta.releaseUrl,
            blogUrl: meta.blogUrl,
            commitHash: meta.commitHash,
            docsRoot: meta.docsRoot,
            versionPinned: meta.versionPinned,
            count: entries.length,
            entries: entries.map(e => ({ ...e, ...listCells(e, meta) })),
          },
          null,
          2
        )}\n`
      );
      return;
    }
    printCatalogHeader(meta);
    if (verbose) {
      for (const e of entries) {
        printEntry(e, true);
        console.info('');
      }
      console.info(`${entries.length} entries`);
      if (search) console.info(`(filter --search=${search})`);
      return;
    }
    const cols = buildListColumns({
      compact,
      wide,
      notes,
      locus,
      showVersion,
      showRelease,
    });
    for (const line of formatListTable(entries, meta, cols, { links })) {
      console.info(line);
    }
    console.info(`\n${entries.length} entries`);
    if (search) console.info(`(filter --search=${search})`);
    if (!compact && !wide && !notes && !locus) {
      console.info(
        '(tips: --locus TOKEN/PAGE/FRAGMENT · --wide VER/RELEASE/BLOG · --notes · --compact)'
      );
    }
    return;
  }
  if (cmd === 'get') {
    const meta = await loadCatalogFile();
    const name = rest.filter(a => !a.startsWith('--')).join(' ');
    const n = normalizeName(name);
    const e =
      meta.entries.find(x => normalizeName(x.name) === n) ??
      meta.entries.find(x => x.aliases?.some(a => normalizeName(a) === n)) ??
      null;
    if (!e) {
      console.error(`❌ not in catalog: ${name} (run: bun tools/bun-docs-catalog.ts build)`);
      process.exit(1);
    }
    printCatalogHeader(meta);
    printEntry(e, true);
    return;
  }
  if (cmd === 'verify') {
    const expected = parseVersionFlag(rest);
    const { ok, messages } = await verifyCatalog(expected);
    for (const m of messages) {
      console.info(ok || m.startsWith('ok') || m.startsWith('warn') ? `  ${m}` : `  ❌ ${m}`);
    }
    if (ok) {
      console.info(`✅ catalog pin matches ${expected}`);
      return;
    }
    console.error(`❌ catalog verify failed (expected Bun ${expected})`);
    process.exit(1);
  }
  console.error('usage: bun tools/bun-docs-catalog.ts build|list|get|verify|export [args]');
  console.error('  build [--version=1.4.0] [--force] [--skip-notes] [--no-refresh-rss]');
  console.error('       # default Bun.version; BLOG from RSS release-index; NOTE from doc HTML');
  console.error('  export [--jsonl]             # BunToken JSON (default) / JSONL');
  console.error('  export --compact [--jsonl]   # thin TSV / compact JSONL (legacy)');
  console.error('  list -s runtime|bundler|test|guides -t ' + DocRefTypeArray.join('|'));
  console.error('       -q WebView         # name/alias/desc/url/anchor/note/version');
  console.error('       default columns: NAME SEC TYPE STAB SHIP FIX PIN DOC');
  console.error('       -L / --locus       # TOKEN TYPE STATUS PAGE FRAGMENT SHIP');
  console.error('       -w / --wide        # + CHG UPDATED VER RELEASE BLOG');
  console.error('       -n / --notes       # + NOTE (changeNote, falling back to description)');
  console.error('       --version/--release  # aliases that expand wide columns');
  console.error('       -c / --compact     # legacy thin table');
  console.error('       -l / --links       # OSC-8 hyperlinks on DOC/RELEASE/BLOG');
  console.error('       -v / --verbose     # full entry cards');
  console.error('       -j / --json        # entries + computed list cells');
  console.error('  get <name>              # entry + catalog version header');
  console.error('  verify [--version=…]    # catalog bunVersion vs runtime (or flag)');
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
