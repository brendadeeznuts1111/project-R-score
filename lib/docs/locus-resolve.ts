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

function slugify(text: string): string {
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
  observedAt: string
): { locus: Locus; provenance: Provenance } {
  const page = input.canonicalPage.replace(/\.md$/, '').split('#')[0]!;
  const anchors = pageAnchors.get(page) ?? new Set<string>();

  const canonical = canonicalRefs[input.name];
  if (canonical?.startsWith('https://')) {
    const parsed = parseCanonicalUrl(canonical);
    if (parsed.fragment && anchors.has(parsed.fragment)) {
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

  const nameSlug = slugify(input.name);
  if (nameSlug && anchors.has(nameSlug)) {
    return {
      locus: { page, fragment: nameSlug, unresolved: false },
      provenance: { source: 'docs-index', confidence: 0.8, observedAt },
    };
  }

  const bunSlug = `bun-${slugify(input.name.replace(/^Bun\./i, ''))}`;
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
