// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Tennis player avatar index — slug normalize + warehouse/cache scan.
 * Pure helpers (Bun.file / Bun.Glob only; no node:fs).
 *
 * @see lib/images/avatar-response.ts
 * @see docs/IMAGES.md
 */
import { basenamePath, extnamePath, joinPath } from '../path-bun.ts';

const ROOT = joinPath(import.meta.dir, '../..');
const DEFAULT_SOURCE_DIR = joinPath(ROOT, 'warehouse/avatars');
const DEFAULT_CACHE_DIR = joinPath(ROOT, 'public/avatars');

/** Same allowlist as lib/images/avatar-response SAFE_SLUG. */
const SAFE_SLUG = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

const SOURCE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/** Known fixture slug shipped under warehouse/avatars. */
const FIXTURE_SLUG = 'demo-player';

export type AvatarPlayerEntry = {
  slug: string;
  displayName: string;
  /** optional competitor / profile keys for join */
  aliases?: string[];
  competitorIds?: string[];
  hasSource: boolean;
  hasWebp: boolean;
  sourceExt?: string;
  source: 'warehouse' | 'fixture' | 'fallback' | 'manual';
};

export type AvatarIndex = {
  schemaVersion: 1;
  kind: 'tennis-avatar-index';
  generatedAt: string;
  sourceDir: string;
  cacheDir: string;
  players: AvatarPlayerEntry[];
};

export type AvatarScanOpts = {
  sourceDir?: string;
  cacheDir?: string;
  root?: string;
};

/**
 * Lowercase slug: strip diacritics, non-alnum → `-`, collapse dashes, trim, max 64.
 * Path separators become `-` (traversal tokens never remain).
 */
export function normalizePlayerSlug(name: string): string {
  const raw = String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!raw) return 'player';
  // Ensure leading alnum for SAFE_SLUG
  const body = /^[a-z0-9]/.test(raw) ? raw : `p-${raw}`;
  return body.slice(0, 64);
}

/** Title-case heuristic: `jannik-sinner` → `Jannik Sinner`. */
export function displayNameFromSlug(slug: string): string {
  return String(slug ?? '')
    .split(/[-_.]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/** Safe filesystem avatar key — no path traversal. */
export function isSafeAvatarSlug(slug: string): boolean {
  return SAFE_SLUG.test(slug);
}

function resolveDirs(opts?: AvatarScanOpts): { sourceDir: string; cacheDir: string } {
  const root = opts?.root ? joinPath(opts.root) : ROOT;
  return {
    sourceDir: opts?.sourceDir
      ? opts.sourceDir.startsWith('/')
        ? opts.sourceDir
        : joinPath(root, opts.sourceDir)
      : opts?.root
        ? joinPath(root, 'warehouse/avatars')
        : DEFAULT_SOURCE_DIR,
    cacheDir: opts?.cacheDir
      ? opts.cacheDir.startsWith('/')
        ? opts.cacheDir
        : joinPath(root, opts.cacheDir)
      : opts?.root
        ? joinPath(root, 'public/avatars')
        : DEFAULT_CACHE_DIR,
  };
}

async function hasWebpCache(cacheDir: string, slug: string): Promise<boolean> {
  return Bun.file(joinPath(cacheDir, `${slug}.webp`)).exists();
}

function sourceKindForSlug(slug: string): AvatarPlayerEntry['source'] {
  return slug === FIXTURE_SLUG ? 'fixture' : 'warehouse';
}

/**
 * Scan warehouse/avatars for png/jpg/jpeg/webp; check public/avatars/{slug}.webp.
 * Includes demo-player as fixture when present.
 */
export async function scanWarehouseAvatars(opts?: AvatarScanOpts): Promise<AvatarIndex> {
  const { sourceDir, cacheDir } = resolveDirs(opts);
  const bySlug = new Map<string, AvatarPlayerEntry>();

  const glob = new Bun.Glob('*.{png,jpg,jpeg,webp}');
  try {
    for await (const rel of glob.scan({ cwd: sourceDir, onlyFiles: true })) {
      const base = basenamePath(rel);
      const ext = extnamePath(base).toLowerCase();
      if (!SOURCE_EXTS.has(ext)) continue;
      const stem = base.slice(0, base.length - ext.length);
      const slug = normalizePlayerSlug(stem);
      if (!slug || !isSafeAvatarSlug(slug)) continue;

      const prev = bySlug.get(slug);
      // Prefer non-webp warehouse original when both exist (webp may be a preconvert).
      if (prev?.hasSource && prev.sourceExt && prev.sourceExt !== '.webp' && ext === '.webp') {
        continue;
      }

      bySlug.set(slug, {
        slug,
        displayName: displayNameFromSlug(slug),
        hasSource: true,
        hasWebp: await hasWebpCache(cacheDir, slug),
        sourceExt: ext,
        source: sourceKindForSlug(slug),
      });
    }
  } catch {
    // Missing sourceDir → empty warehouse scan (still may add fixture check below).
  }

  // Ensure demo-player is listed as fixture when either source or cache exists.
  if (!bySlug.has(FIXTURE_SLUG)) {
    let fixtureExt: string | undefined;
    for (const ext of SOURCE_EXTS) {
      if (await Bun.file(joinPath(sourceDir, `${FIXTURE_SLUG}${ext}`)).exists()) {
        fixtureExt = ext;
        break;
      }
    }
    const webp = await hasWebpCache(cacheDir, FIXTURE_SLUG);
    if (fixtureExt || webp) {
      bySlug.set(FIXTURE_SLUG, {
        slug: FIXTURE_SLUG,
        displayName: displayNameFromSlug(FIXTURE_SLUG),
        hasSource: Boolean(fixtureExt),
        hasWebp: webp,
        sourceExt: fixtureExt,
        source: 'fixture',
      });
    }
  }

  const players = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  return {
    schemaVersion: 1,
    kind: 'tennis-avatar-index',
    generatedAt: new Date().toISOString(),
    sourceDir,
    cacheDir,
    players,
  };
}

/**
 * Merge warehouse scan with display names from event-store profiles (or any list).
 * Unknown names become manual entries (hasSource false until warehouse has a file).
 */
export async function buildAvatarIndexFromNames(
  names: string[],
  opts?: AvatarScanOpts
): Promise<AvatarIndex> {
  const base = await scanWarehouseAvatars(opts);
  const bySlug = new Map(base.players.map(p => [p.slug, p]));

  for (const name of names) {
    const raw = String(name ?? '').trim();
    if (!raw) continue;
    const slug = normalizePlayerSlug(raw);
    if (!slug || !isSafeAvatarSlug(slug)) continue;

    const existing = bySlug.get(slug);
    if (existing) {
      const aliases = new Set(existing.aliases ?? []);
      if (raw !== existing.displayName && raw !== existing.slug) aliases.add(raw);
      bySlug.set(slug, {
        ...existing,
        aliases: aliases.size > 0 ? [...aliases].sort() : undefined,
      });
      continue;
    }

    const hasWebp = await hasWebpCache(base.cacheDir, slug);
    bySlug.set(slug, {
      slug,
      displayName: raw.includes(' ') || /[A-Z]/.test(raw) ? raw : displayNameFromSlug(slug),
      hasSource: false,
      hasWebp,
      source: hasWebp ? 'fallback' : 'manual',
    });
  }

  return {
    ...base,
    generatedAt: new Date().toISOString(),
    players: [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
  };
}

/** Build name/alias → slug map for board lookups. */
export function buildNameToSlugMap(players: readonly AvatarPlayerEntry[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of players) {
    map[p.slug] = p.slug;
    map[normalizePlayerSlug(p.displayName)] = p.slug;
    for (const a of p.aliases ?? []) {
      map[normalizePlayerSlug(a)] = p.slug;
    }
  }
  return map;
}

/** Plain object for JSON write (stable field order + clean maps). */
export function toAvatarIndexDoc(index: AvatarIndex): object {
  const bySlug: Record<string, AvatarPlayerEntry> = {};
  for (const p of index.players) bySlug[p.slug] = p;
  return {
    schemaVersion: index.schemaVersion,
    kind: index.kind,
    generatedAt: index.generatedAt,
    sourceDir: index.sourceDir,
    cacheDir: index.cacheDir,
    players: index.players.map(p => {
      const row: Record<string, unknown> = {
        slug: p.slug,
        displayName: p.displayName,
        hasSource: p.hasSource,
        hasWebp: p.hasWebp,
        source: p.source,
      };
      if (p.aliases?.length) row.aliases = p.aliases;
      if (p.competitorIds?.length) row.competitorIds = p.competitorIds;
      if (p.sourceExt) row.sourceExt = p.sourceExt;
      return row;
    }),
    bySlug,
    nameToSlug: buildNameToSlugMap(index.players),
  };
}

/** Resolve display name or slug → avatar slug. */
export function resolveAvatarSlug(nameOrSlug: string, nameToSlug: Record<string, string>): string {
  const raw = String(nameOrSlug ?? '').trim();
  if (!raw) return 'demo-player';
  if (nameToSlug[raw]) return nameToSlug[raw]!;
  const n = normalizePlayerSlug(raw);
  return nameToSlug[n] ?? n;
}
