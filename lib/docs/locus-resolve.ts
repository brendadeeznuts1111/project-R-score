/**
 * Verified doc locus resolution for catalog tokens.
 *
 * Prefers CANONICAL_REFS, then index anchors, then verified existing fragments.
 *
 * @see ./token-ref.ts
 */
import type { Locus, Provenance } from './token-ref.ts';

export type LocusInput = {
  name: string;
  canonicalPage: string;
  anchor?: string;
};

export type PageAnchorIndex = Map<string, Set<string>>;

export type ResolveLocusOptions = {
  /** Map aliases (Bun.redis → RedisClient) before CANONICAL_REFS lookup. */
  resolveName?: (name: string) => string;
};

export function buildPageAnchorIndex(
  entries: Array<{ url: string; anchors?: string[] }>
): PageAnchorIndex {
  const index = new Map<string, Set<string>>();
  for (const e of entries) {
    const page = e.url.replace(/\.md$/, '').split('#')[0]!;
    const set = index.get(page) ?? new Set<string>();
    for (const a of e.anchors ?? []) set.add(a);
    index.set(page, set);
  }
  return index;
}

export function slugifyTokenName(text: string): string {
  return text
    .toLowerCase()
    .replace(/^bun\./i, 'bun-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseCanonicalUrl(url: string): { page: string; fragment?: string } {
  const [page, fragment] = url.split('#');
  return { page: page!, ...(fragment ? { fragment } : {}) };
}

/** Resolve verified locus for a typed token. */
export function resolveVerifiedLocus(
  input: LocusInput,
  canonicalRefs: Record<string, string>,
  pageAnchors: PageAnchorIndex,
  observedAt: string,
  opts?: ResolveLocusOptions
): { locus: Locus; provenance: Provenance } {
  const page = input.canonicalPage.replace(/\.md$/, '').split('#')[0]!;
  const anchors = pageAnchors.get(page) ?? new Set<string>();

  const refKey = opts?.resolveName?.(input.name) ?? input.name;
  const canonical = canonicalRefs[refKey] ?? canonicalRefs[input.name];
  if (canonical?.startsWith('https://')) {
    const parsed = parseCanonicalUrl(canonical);
    // Verify fragment against the *canonical* page's anchors, not the scrape page.
    const canonicalAnchors = pageAnchors.get(parsed.page) ?? new Set<string>();
    if (parsed.fragment && canonicalAnchors.has(parsed.fragment)) {
      return {
        locus: { page: parsed.page, fragment: parsed.fragment, unresolved: false },
        provenance: { source: 'canonical-refs', confidence: 1, observedAt },
      };
    }
    if (parsed.fragment) {
      return {
        locus: { page: parsed.page, fragment: parsed.fragment, unresolved: false },
        provenance: { source: 'canonical-refs', confidence: 0.9, observedAt },
      };
    }
    return {
      locus: { page: parsed.page, unresolved: true },
      provenance: { source: 'canonical-refs', confidence: 0.85, observedAt },
    };
  }

  if (input.anchor && anchors.has(input.anchor)) {
    return {
      locus: { page, fragment: input.anchor, unresolved: false },
      provenance: { source: 'docs-index', confidence: 0.95, observedAt },
    };
  }

  const nameSlug = slugifyTokenName(input.name);
  if (nameSlug && anchors.has(nameSlug)) {
    return {
      locus: { page, fragment: nameSlug, unresolved: false },
      provenance: { source: 'docs-index', confidence: 0.8, observedAt },
    };
  }

  const bunSlug = `bun-${slugifyTokenName(input.name.replace(/^Bun\./i, ''))}`;
  if (bunSlug && anchors.has(bunSlug)) {
    return {
      locus: { page, fragment: bunSlug, unresolved: false },
      provenance: { source: 'docs-index', confidence: 0.75, observedAt },
    };
  }

  if (input.anchor) {
    return {
      locus: { page, unresolved: true },
      provenance: { source: 'catalog-scrape', confidence: 0.4, observedAt },
    };
  }

  return {
    locus: { page, unresolved: true },
    provenance: { source: 'catalog-scrape', confidence: 0.5, observedAt },
  };
}

export type AnchorSuggestion = {
  page: string;
  fragment: string;
  score: number;
  url: string;
};

/**
 * Rank candidate (page, fragment) pairs from the docs index for a token name.
 * Used by `bun-doc-refs locus --depth=N` to surface poor-anchor repairs.
 */
export function suggestAnchorsForToken(
  name: string,
  pageAnchors: PageAnchorIndex,
  opts?: { pages?: string[]; limit?: number }
): AnchorSuggestion[] {
  const limit = opts?.limit ?? 5;
  const nameSlug = slugifyTokenName(name);
  const bare = slugifyTokenName(name.replace(/^Bun\./i, '').replace(/^--/, ''));
  const bunSlug = bare ? `bun-${bare}` : '';
  const pages = opts?.pages?.map(p => p.replace(/\.md$/, '').split('#')[0]!) ?? [
    ...pageAnchors.keys(),
  ];

  const scored: AnchorSuggestion[] = [];
  for (const page of pages) {
    const set = pageAnchors.get(page);
    if (!set) continue;
    for (const fragment of set) {
      let score = 0;
      if (fragment === nameSlug || fragment === bunSlug || fragment === bare) score = 100;
      else if (bunSlug && fragment.startsWith(`${bunSlug}-`)) score = 85;
      else if (bare && (fragment === bare || fragment.startsWith(`${bare}-`))) score = 80;
      else if (bare && fragment.includes(bare) && bare.length >= 4) score = 50;
      else if (nameSlug && fragment.includes(nameSlug) && nameSlug.length >= 4) score = 45;
      else continue;
      // Prefer dedicated API pages over the bun-apis dump / guides
      if (page.includes('/runtime/bun-apis')) score -= 40;
      if (page.includes('/guides/')) score -= 20;
      if (page.includes('/reference/')) score += 10;
      scored.push({
        page,
        fragment,
        score,
        url: `${page}#${fragment}`,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
  const seen = new Set<string>();
  const out: AnchorSuggestion[] = [];
  for (const s of scored) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

/** True when fragment is missing or not present on the entry's page in the index. */
export function isPoorLocus(
  canonicalPage: string,
  anchor: string | undefined,
  locusUnresolved: boolean | undefined,
  pageAnchors: PageAnchorIndex
): { poor: boolean; reason: 'unresolved' | 'coincidence' | 'page-only' | null } {
  const page = canonicalPage.replace(/\.md$/, '').split('#')[0]!;
  if (locusUnresolved || !anchor) {
    return { poor: true, reason: locusUnresolved || !anchor ? 'unresolved' : 'page-only' };
  }
  const set = pageAnchors.get(page);
  if (set && !set.has(anchor)) {
    return { poor: true, reason: 'coincidence' };
  }
  if (!set) {
    // Page not in index — treat as poor so audit surfaces it
    return { poor: true, reason: 'coincidence' };
  }
  return { poor: false, reason: null };
}

/**
 * Agent-facing locus STATUS (richer than resolved/unresolved).
 *
 * | status       | meaning |
 * |--------------|---------|
 * | fragment     | verified page + #heading |
 * | page         | right docs page; no dedicated heading (OK) |
 * | inherited    | child should use parent section (family) |
 * | dump         | stuck on zero-anchor dump (e.g. bun-apis) |
 * | reference    | bun.com/reference — outside docs index |
 * | coincidence  | fragment does not exist on that page |
 * | unresolved   | no usable page/fragment story yet |
 */
export type LocusStatus =
  | 'fragment'
  | 'page'
  | 'inherited'
  | 'dump'
  | 'reference'
  | 'coincidence'
  | 'unresolved';

export function isDumpDocPage(page: string, pageAnchors: PageAnchorIndex): boolean {
  const p = page.replace(/\.md$/, '').split('#')[0]!;
  if (/\/runtime\/bun-apis\/?$/.test(p) || p.endsWith('/runtime/bun-apis')) return true;
  const set = pageAnchors.get(p);
  return set !== undefined && set.size === 0;
}

export function classifyLocusStatus(input: {
  name: string;
  canonicalPage: string;
  anchor?: string;
  locusUnresolved?: boolean;
  pageAnchors: PageAnchorIndex;
  /** Longest parent token that already has a verified fragment (family inheritance). */
  parentFragment?: { name: string; page: string; fragment: string };
}): LocusStatus {
  const page = input.canonicalPage.replace(/\.md$/, '').split('#')[0]!;
  const isRef =
    page.includes('bun.com/reference') ||
    /\/reference\//.test(page) ||
    page.startsWith('https://bun.com/reference');

  if (input.anchor && !input.locusUnresolved) {
    const set = input.pageAnchors.get(page);
    if (set && !set.has(input.anchor)) return 'coincidence';
    if (!set && isRef) return 'reference';
    if (!set) return 'coincidence';
    return 'fragment';
  }

  if (input.parentFragment) return 'inherited';
  if (isRef) return 'reference';
  if (isDumpDocPage(page, input.pageAnchors)) return 'dump';

  const set = input.pageAnchors.get(page);
  if (set && set.size > 0) return 'page';

  return 'unresolved';
}

/** Find longest catalog parent with a verified fragment (e.g. Bun.readableStreamTo*). */
export function findParentWithFragment(
  name: string,
  byName: Map<
    string,
    { name: string; canonicalPage: string; anchor?: string; locusUnresolved?: boolean }
  >
): { name: string; page: string; fragment: string } | undefined {
  const candidates: string[] = [];

  // Dotted peel: Bun.CSRF.generate → Bun.CSRF → Bun
  let dotted = name;
  while (dotted.includes('.')) {
    dotted = dotted.slice(0, dotted.lastIndexOf('.'));
    if (dotted.length >= 3) candidates.push(dotted);
  }

  // CamelCase peel: Bun.readableStreamToBytes → Bun.readableStreamTo → …
  // Guard: some titles match [a-z][A-Z] mid-string but have no trailing Capital peel
  // (e.g. "…Files.length") — break when the replace is a no-op.
  let camel = name;
  while (/[a-z0-9][A-Z]/.test(camel)) {
    const next = camel.replace(/[A-Z][a-z0-9]*$/, '');
    if (next === camel || next.length < 5 || next === 'Bun') break;
    camel = next;
    candidates.push(camel);
  }

  for (const c of [...new Set(candidates)].sort((a, b) => b.length - a.length)) {
    const p = byName.get(c);
    if (p?.anchor && !p.locusUnresolved) {
      return {
        name: p.name,
        page: p.canonicalPage.replace(/\.md$/, '').split('#')[0]!,
        fragment: p.anchor,
      };
    }
  }
  return undefined;
}
