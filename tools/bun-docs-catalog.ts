// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/webview — Bun.WebView
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
 *   blogUrl? (https://bun.com/blog/bun-vX.Y.Z — narrative release notes),
 *   docsUrl? (unversioned bun.com page + optional #anchor),
 *   canonicalPage, anchor?, allPages
 *
 * Catalog file also carries top-level bunVersion + releaseUrl + blogUrl + docsRoot
 * (+ commitHash when built against the runtime binary).
 * Bun docs are not versioned on bun.com (/docs/vX.Y.Z/ does not exist);
 * the pin is Bun.version (or --version=…) + GitHub release + blog post.
 * Token upgrade notes come from tools/bun-docs-changelog.ts (curated, not scraped).
 *
 * Build:   bun tools/bun-docs-catalog.ts build [--version=1.4.0]
 * List:    bun tools/bun-docs-catalog.ts list [--section=runtime] [--type=api]
 *                 [--search=WebView] [--wide] [--notes] [--compact] [--verbose] [--json]
 * Lookup:  bun tools/bun-docs-catalog.ts get Bun.WebView
 * Verify:  bun tools/bun-docs-catalog.ts verify   # catalog bunVersion vs runtime
 *
 * List header: # catalog bunVersion=…  # release …  # blog https://bun.com/blog/bun-v…
 * Default columns: NAME · SEC · TYPE · STAB · SHIP · FIX · PIN · DOC
 * Wide (+): CHG · UPDATED · REL (tag) · BLOG (short) · NOTE (with --notes)
 *
 * Consumed by tools/bun-doc-refs.ts (`catalog` / enriched `suggest`).
 */
import { resolve } from 'node:path';
import { CURATED_ENTRIES } from './bun-docs-curated.ts';
import { changelogIndex } from './bun-docs-changelog.ts';
// Avoid static import of bun-doc-refs (circular: refs → catalog → refs).

const INDEX_PATH = resolve(import.meta.dir, 'bun-docs-index.json');
const OUT_PATH = resolve(import.meta.dir, 'bun-docs-catalog.json');
const TOKEN_SUPPLEMENT_PATH = resolve(import.meta.dir, 'bun-docs-token-supplement.json');

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
} {
  const pin = e.verifiedOn ?? meta.bunVersion;
  const ship = e.releasedIn ?? '—';
  const fix = e.fixedIn ?? '—';
  const chg = e.changedIn ?? '—';
  const ver = e.releasedIn ?? e.fixedIn ?? e.changedIn ?? pin;
  const docs = e.docsUrl ?? (e.anchor ? `${e.canonicalPage}#${e.anchor}` : e.canonicalPage);
  const release = e.releaseUrl ?? releaseUrlFor(ver);
  const blog = e.blogUrl ?? blogUrlFor(ver);
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
    note: e.changeNote ?? '',
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

export function buildListColumns(opts: {
  compact?: boolean;
  wide?: boolean;
  notes?: boolean;
  showVersion?: boolean;
  showRelease?: boolean;
}): ListCol[] {
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
      } else if (c.key === 'blog' && opts?.links && cells.blog) {
        val = terminalLink(e.blogUrl ?? blogUrlFor(cells.ver), cells.blog);
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

/** Official blog post for a release (version is in the path). */
export function blogUrlFor(version: string): string {
  const v = normalizeBunVersion(version);
  return `https://bun.com/blog/bun-v${v}`;
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
    const valueFlags = /^(?:--config|--cwd|--outdir|--target|--sourcemap|--backend|--cpu|--os|--env|--port|--host|--splitting|--format|--jsx|--tsconfig|--mainfields|--conditions|--publicpath|--assetnaming|--entrynaming|--chunknaming|--sourcemap)$/i;
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
}): Promise<DocCatalogEntry[]> {
  const index = await loadIndex();
  const map = new Map<string, DocCatalogEntry>();
  const docsLastUpdated = index.generated;
  const verifiedOn = opts?.bunVersion ?? Bun.version;

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

  // Re-pick canonical + put canonical first in allPages; pin version fields
  for (const e of entries) {
    e.canonicalPage = pickCanonicalPage(e.allPages, e.name);
    e.allPages = [e.canonicalPage, ...e.allPages.filter(p => p !== e.canonicalPage)];
    e.lastUpdated ??= docsLastUpdated;
    e.verifiedOn = verifiedOn;
    e.docsUrl = docsUrlFor(e.canonicalPage, e.anchor);
    // Prefer release notes for feature ship version; else latest fix; else catalog pin
    const forRelease = e.releasedIn ?? e.fixedIn ?? e.changedIn ?? verifiedOn;
    e.releaseUrl = releaseUrlFor(forRelease);
    // Blog: overlay may add #anchor for a specific notes section
    if (!e.blogUrl || !e.blogUrl.includes('#')) {
      e.blogUrl = blogUrlFor(forRelease);
    }
  }

  return entries;
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
    const base = blogUrlFor(cl.blogVersion);
    e.blogUrl = cl.blogAnchor ? `${base}#${cl.blogAnchor}` : base;
  }
}

export async function writeCatalog(
  entries: DocCatalogEntry[],
  opts?: { bunVersion?: string; versionPinned?: boolean; commitHash?: string }
): Promise<void> {
  const bunVersion = normalizeBunVersion(opts?.bunVersion ?? Bun.version);
  const releaseUrl = releaseUrlFor(bunVersion);
  const blogUrl = blogUrlFor(bunVersion);
  const commitHash = opts?.commitHash ?? runtimeCommitHash(bunVersion);
  const payload = {
    generated: new Date().toISOString(),
    bunVersion,
    releaseUrl,
    blogUrl,
    ...(commitHash ? { commitHash } : {}),
    docsRoot: 'https://bun.com/docs',
    versionPinned: opts?.versionPinned ?? false,
    note: 'docsUrl = unversioned latest docs; releaseUrl/blogUrl pin versioned release notes; fixedIn/changeNote from tools/bun-docs-changelog.ts',
    source: {
      index: 'tools/bun-docs-index.json',
      canonicalRefs: 'tools/bun-doc-refs.ts#CANONICAL_REFS',
      curated: 'tools/bun-docs-curated.ts',
      changelog: 'tools/bun-docs-changelog.ts',
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
      blogUrl: 'string? — bun.com/blog/bun-vX.Y.Z narrative notes',
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
    blogUrl: j.blogUrl ?? blogUrlFor(bunVersion),
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

// ── CLI ───────────────────────────────────────────────────────────────────

function printCatalogHeader(meta: CatalogFileMeta, runtime = Bun.version): void {
  const pin = meta.versionPinned ? ' (pinned via --version)' : '';
  console.info(`# catalog bunVersion=${meta.bunVersion}${pin}`);
  console.info(`# release ${meta.releaseUrl}`);
  console.info(`# blog ${meta.blogUrl}`);
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

  const expectedRelease = releaseUrlFor(expectedVersion);
  if (meta.releaseUrl !== expectedRelease) {
    ok = false;
    messages.push(`catalog releaseUrl mismatch: ${meta.releaseUrl} (expected ${expectedRelease})`);
  } else {
    messages.push(`ok releaseUrl=${meta.releaseUrl}`);
  }

  const expectedBlog = blogUrlFor(expectedVersion);
  if (meta.blogUrl !== expectedBlog) {
    ok = false;
    messages.push(`catalog blogUrl mismatch: ${meta.blogUrl} (expected ${expectedBlog})`);
  } else {
    messages.push(`ok blogUrl=${meta.blogUrl}`);
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
    const entries = await buildCatalog({ bunVersion, versionPinned });
    await writeCatalog(entries, { bunVersion, versionPinned, commitHash });
    const typeCounts = countBy(entries, e => e.type);
    console.info(
      `✅ catalog ${entries.length} entries → tools/bun-docs-catalog.json` +
        `  bunVersion=${bunVersion}` +
        (versionPinned ? ' (pinned)' : '') +
        `  release=${releaseUrlFor(bunVersion)}` +
        `  blog=${blogUrlFor(bunVersion)}` +
        (commitHash ? `  commit=${commitHash}` : '') +
        `  (${Object.entries(typeCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')})`
    );
    return;
  }
  if (cmd === 'list') {
    const meta = await loadCatalogFile();
    let entries = meta.entries;
    let section: DocSection | undefined;
    let type: DocRefType | undefined;
    let search: string | undefined;
    const json = rest.includes('--json');
    const verbose = rest.includes('--verbose') || rest.includes('-v');
    const wide = rest.includes('--wide') || rest.includes('-w');
    const notes = rest.includes('--notes');
    const compact = rest.includes('--compact');
    // --version / --release remain as aliases that expand to wide columns
    let showVersion = false;
    let showRelease = false;
    let links = false;
    for (let i = 0; i < rest.length; i++) {
      const a = rest[i]!;
      if (a.startsWith('--section=')) section = a.slice(10) as DocSection;
      else if (a === '--section' && rest[i + 1]) {
        section = rest[++i] as DocSection;
      } else if (a.startsWith('--type=')) type = a.slice(7) as DocRefType;
      else if (a === '--type' && rest[i + 1]) {
        type = rest[++i] as DocRefType;
      } else if (a.startsWith('--search=')) search = a.slice(9);
      else if (a === '--search' && rest[i + 1]) {
        search = rest[++i];
      } else if (a === '--version') {
        showVersion = true;
      } else if (a === '--release') {
        showRelease = true;
      } else if (a === '--links') {
        links = true;
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
      showVersion,
      showRelease,
    });
    for (const line of formatListTable(entries, meta, cols, { links })) {
      console.info(line);
    }
    console.info(`\n${entries.length} entries`);
    if (search) console.info(`(filter --search=${search})`);
    if (!compact && !wide && !notes) {
      console.info('(tips: --wide VER/RELEASE/BLOG · --notes changeNote · --compact legacy)');
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
  console.error('usage: bun tools/bun-docs-catalog.ts build|list|get|verify [args]');
  console.error('  build [--version=1.4.0]   # default Bun.version; pins catalog + releaseUrl');
  console.error('  list --section=runtime|bundler|test|guides --type=' + DocRefTypeArray.join('|'));
  console.error('       --search=WebView   # name/alias/desc/url/anchor/note/version');
  console.error('       default columns: NAME SEC TYPE STAB SHIP FIX PIN DOC');
  console.error('       --wide / -w        # + CHG UPDATED VER RELEASE BLOG');
  console.error('       --notes            # + NOTE (changeNote)');
  console.error('       --version/--release  # aliases that expand wide columns');
  console.error('       --compact          # legacy thin table');
  console.error('       --links            # OSC-8 hyperlinks on DOC/RELEASE/BLOG');
  console.error('       --verbose / -v     # full entry cards');
  console.error('       --json             # entries + computed list cells');
  console.error('  get <name>              # entry + catalog version header');
  console.error('  verify [--version=…]    # catalog bunVersion vs runtime (or flag)');
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
