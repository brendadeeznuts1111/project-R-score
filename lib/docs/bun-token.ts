/**
 * BunToken — agent-facing export contract for Bun documentation tokens.
 *
 * Interior harness: TokenRef (brands, provenance, allPages).
 * Public export: BunToken (this module).
 *
 * Flow: DocCatalogEntry → TokenRef → BunToken
 *
 * @see ./token-ref.ts
 * @see ./bun-token.schema.json
 * @see ../../docs/BUN_DOCS_OPERATE.md
 */

/** Coarse kind for agents (maps from fine catalog TokenKind). */
export type BunTokenKind = 'API' | 'CLI' | 'Config' | 'Env' | 'PackageJson' | 'Concept' | 'Other';

export type BunTokenStability = 'stable' | 'experimental' | 'deprecated';

export type BunVersionEventType = 'since' | 'fixed' | 'changed' | 'stabilized';

export type BunVersionEvent = {
  version: string;
  type: BunVersionEventType;
  /** Official release publication timestamp, or null when upstream history is unavailable. */
  date: string | null;
  note?: string;
  /** Version-specific Bun blog/GitHub evidence, or the canonical docs fallback. */
  evidenceUrl: string;
};

export type BunTokenExample = {
  lang: string;
  code: string;
  description?: string;
};

/** Agent / export northstar. */
export type BunToken = {
  name: string;
  kind: BunTokenKind;
  description: string;
  stability: BunTokenStability;
  docsLocus: {
    /** Full unversioned bun.com/docs page URL. */
    page: string;
    /** Canonical heading fragment, or null when page-level / dump. */
    anchor: string | null;
    /**
     * Rich STATUS: fragment | page | inherited | dump | reference | coincidence | unresolved
     * Colors for agents/UI: Bun.color(hsl, "hex") — see tools/_gen-locus-canvas.ts
     */
    status?:
      'fragment' | 'page' | 'inherited' | 'dump' | 'reference' | 'coincidence' | 'unresolved';
  };
  /** First attested Bun version (earliest "since" event). */
  since: string | null;
  /** RSS-validated release blog URL when known. */
  announcementUrl: string | null;
  versionEvents: BunVersionEvent[];
  examples: BunTokenExample[];
  related?: string[];
  meta?: {
    lastVerified: string;
    sourceCommit?: string;
    buildPin?: string;
  };
};

/** Overlay hit shape (from release scrape) — keep tools-independent. */
export type VersionHitLike = {
  version: string;
  url: string;
  publishedAt?: string;
  section: string;
  kind: 'ship' | 'fix' | 'chg' | 'stabilize';
};

const HIT_KIND_TO_EVENT: Record<VersionHitLike['kind'], BunVersionEventType> = {
  ship: 'since',
  fix: 'fixed',
  chg: 'changed',
  stabilize: 'stabilized',
};

/** Map fine catalog / TokenRef kind → BunToken.kind. */
export function toBunTokenKind(kind: string): BunTokenKind {
  switch (kind) {
    case 'api':
      return 'API';
    case 'cli-flag':
    case 'cli-command':
    case 'cli-option':
      return 'CLI';
    case 'config-key':
      return 'Config';
    case 'env-var':
      return 'Env';
    case 'package-json-key':
      return 'PackageJson';
    case 'concept':
    case 'guide':
    case 'tutorial':
      return 'Concept';
    default:
      return 'Other';
  }
}

/** Build timeline from overlay hits (preferred) or flat history scalars. */
export function buildVersionEvents(opts: {
  hits?: VersionHitLike[];
  introduced?: string;
  fixed?: string;
  changed?: string;
  stabilized?: string;
  changeNote?: string;
  evidenceUrl?: string;
  eventDates?: Partial<Record<BunVersionEventType, string>>;
  eventUrls?: Partial<Record<BunVersionEventType, string>>;
}): BunVersionEvent[] {
  const events: BunVersionEvent[] = [];
  const seen = new Set<string>();

  for (const hit of opts.hits ?? []) {
    const type = HIT_KIND_TO_EVENT[hit.kind];
    const key = `${type}:${hit.version}:${hit.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({
      version: hit.version,
      type,
      date: hit.publishedAt ?? opts.eventDates?.[type] ?? null,
      note: hit.section || undefined,
      evidenceUrl: hit.url,
    });
  }

  const pushScalar = (type: BunVersionEventType, version?: string, note?: string) => {
    if (!version) return;
    const key = `${type}:${version}:scalar`;
    if (seen.has(key)) return;
    // Skip if same type+version already from a hit
    if ([...seen].some(k => k.startsWith(`${type}:${version}:`))) return;
    seen.add(key);
    events.push({
      version,
      type,
      date: opts.eventDates?.[type] ?? null,
      ...(note ? { note } : {}),
      evidenceUrl: opts.eventUrls?.[type] ?? opts.evidenceUrl ?? 'https://bun.com/docs',
    });
  };

  pushScalar('since', opts.introduced);
  pushScalar('fixed', opts.fixed, opts.changeNote);
  pushScalar('changed', opts.changed, opts.changeNote);
  pushScalar('stabilized', opts.stabilized);

  return events.sort((a, b) => compareLooseSemver(a.version, b.version));
}

function compareLooseSemver(a: string, b: string): number {
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

/** Earliest "since" event version, else null. */
export function sinceFromEvents(events: BunVersionEvent[]): string | null {
  const since = events.filter(e => e.type === 'since');
  if (since.length === 0) return null;
  return since.reduce((earliest, e) =>
    compareLooseSemver(e.version, earliest.version) < 0 ? e : earliest
  ).version;
}

/** Prefer earliest "since" event with a /blog/ evidence URL; else catalog blogUrl. */
export function announcementUrlFromEvents(
  events: BunVersionEvent[],
  fallback?: string | null
): string | null {
  const blogSince = events.filter(e => e.type === 'since' && e.evidenceUrl?.includes('/blog/'));
  if (blogSince.length > 0) {
    const earliest = blogSince.reduce((a, b) =>
      compareLooseSemver(a.version, b.version) < 0 ? a : b
    );
    return earliest.evidenceUrl ?? null;
  }
  if (fallback?.includes('/blog/')) return fallback;
  return fallback ?? null;
}
