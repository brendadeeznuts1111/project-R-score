/**
 * TokenRef — institutional knowledge-unit schema for Bun doc tokens.
 *
 * Operate adapters (RSS, scrape, catalog JSON) map into this shape.
 * Agents import types from here; JSON Schema lives alongside for interop.
 *
 * @see ./token-ref.schema.json
 * @see ../../docs/BUN_DOCS_OPERATE.md
 */
import type { DocTokenId } from '../types/branded/documents.ts';

/** Product area for a token (mirrors catalog section). */
export type TokenKind =
  | 'api'
  | 'cli-command'
  | 'cli-flag'
  | 'cli-option'
  | 'config-key'
  | 'package-json-key'
  | 'env-var'
  | 'concept'
  | 'guide'
  | 'blog'
  | 'reference'
  | 'error'
  | 'tutorial'
  | 'spec'
  | 'other';

export type TokenStability = 'stable' | 'experimental' | 'deprecated';

/** Verified docs pointer: page URL + optional canonical heading fragment. */
export type Locus = {
  /** Unversioned bun.com/docs page URL (no .md, no fragment). */
  page: string;
  /** Canonical heading fragment without #; omitted when unresolved. */
  fragment?: string;
  /** True when no verified fragment could be resolved. */
  unresolved?: boolean;
};

export type ProvenanceSource =
  | 'canonical-refs'
  | 'docs-index'
  | 'catalog-scrape'
  | 'release-scrape'
  | 'curated'
  | 'supplement'
  | 'manual';

export type Provenance = {
  source: ProvenanceSource;
  /** 0–1 confidence in this field binding. */
  confidence: number;
  /** ISO-8601 when this binding was last observed. */
  observedAt: string;
};

/** Attested release timeline for a token. */
export type VersionEvidence = {
  introduced?: string;
  changed?: string;
  fixed?: string;
  stabilized?: string;
  changeNote?: string;
  /** GitHub commit when known. */
  commit?: string;
  /** Evidence URL (blog post, release, or docs). */
  evidenceUrl?: string;
  provenance?: Provenance;
};

/** Language-tagged usage example from official docs. */
export type TokenExample = {
  lang: string;
  body: string;
  /** Optional sub-locus within the doc page. */
  fragment?: string;
};

export type RelationKind = 'alias' | 'related' | 'seeAlso';

export type Relation = {
  kind: RelationKind;
  /** Target token name (wire); interior code uses DocTokenId after parse. */
  target: string;
};

/** Self-contained knowledge unit — the Bun token northstar record. */
export type TokenRef = {
  id: DocTokenId;
  /** Wire/display name (e.g. Bun.serve, --filter). */
  name: string;
  kind: TokenKind;
  stability: TokenStability;
  /** Human note / description. */
  note?: string;
  locus: Locus;
  examples: TokenExample[];
  history: VersionEvidence;
  relations: Relation[];
  /** All known doc pages (no fragments), canonical first. */
  allPages: string[];
  section: string;
  /** Catalog build pin (verification context, not coverage window). */
  buildPin?: string;
  provenance?: Provenance[];
};

/** Wire JSON shape (id as string before boundary parse). */
export type TokenRefWire = Omit<TokenRef, 'id'> & { id: string }; // brand-ok — JSON wire before parseDocTokenId

export function locusUrl(locus: Locus): string {
  return locus.fragment ? `${locus.page}#${locus.fragment}` : locus.page;
}

export function historyAttested(history: VersionEvidence): boolean {
  return !!(history.introduced || history.changed || history.fixed || history.stabilized);
}

export function locusResolved(locus: Locus): boolean {
  return !!locus.fragment && !locus.unresolved;
}
