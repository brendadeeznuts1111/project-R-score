// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
/**
 * Docs coverage report — RSS index freshness, reference index, canonical alignment.
 *
 * @see tools/bun-docs-releases.ts — release-index.json
 * @see tools/bun-docs-reference-index.ts — reference-index.json
 * @see tools/canonical-helpers.ts — getCanonicalEntry
 */
import { getCanonicalEntry } from '../../tools/canonical-helpers.ts';
import { resolveApiAlias } from '../../tools/bun-doc-refs.ts';
import {
  referenceIndexHasUrl,
  type ReferenceIndexFile,
  type ReferencePageEntry,
} from '../../tools/bun-docs-reference-index.ts';
import type { ReleaseIndexFile } from '../../tools/bun-docs-releases.ts';
import type {
  SemanticTags,
  VerificationLinks,
  VerificationSubsystem,
} from '../verification/types.ts';

export const DOCS_COVERAGE_PROOF_REPORT_PATH = '/registry/docs-coverage-proof.json';
export const DOCS_COVERAGE_VERIFY_SOURCE = 'tools/verify-docs-coverage.ts';
export const DOCS_COVERAGE_DOCS =
  'https://github.com/brendadeeznuts1111/project-R-score/blob/main/docs/BUN_DOCS_OPERATE.md';

export type DocsCoverageLane = {
  name: string;
  passed: boolean;
  subsystem: VerificationSubsystem;
  expected: string;
  actual: string;
};

export type CatalogEntryLike = {
  name: string;
  canonicalPage?: string;
  docsUrl?: string;
  locusStatus?: string;
};

export type OverlayFileLike = {
  entries: Array<{ name: string }>;
};

export type ReviewRow = {
  version: string;
  url: string;
  section: string;
  candidate: string;
};

export type DocsCoverageAllowlist = {
  reviewCandidates?: string[];
  overlayTokens?: string[];
  catalogTokens?: string[];
  reason?: string;
};

export type CoverageCheckResult = {
  total: number;
  tracked: number;
  missing: string[];
};

export function loadAllowlist(raw: DocsCoverageAllowlist): {
  review: Set<string>;
  overlay: Set<string>;
  catalog: Set<string>;
} {
  return {
    review: new Set(raw.reviewCandidates ?? []),
    overlay: new Set(raw.overlayTokens ?? []),
    catalog: new Set(raw.catalogTokens ?? []),
  };
}

/** Token resolves in canonical maps, catalog docs, or allowlist. */
export function isTokenTracked(
  key: string,
  catalogByName: Map<string, CatalogEntryLike>,
  allowlist?: Set<string>
): boolean {
  if (allowlist?.has(key)) return true;
  if (getCanonicalEntry(key)) return true;
  const aliased = resolveApiAlias(key);
  if (aliased !== key && getCanonicalEntry(aliased)) return true;
  const cat = catalogByName.get(key);
  if (cat && (cat.canonicalPage || cat.docsUrl)) return true;
  return false;
}

export function checkCanonicalCoverage(
  keys: readonly string[],
  catalogByName: Map<string, CatalogEntryLike>,
  allowlist?: Set<string>
): CoverageCheckResult {
  const missing: string[] = [];
  let tracked = 0;
  for (const key of keys) {
    if (isTokenTracked(key, catalogByName, allowlist)) tracked++;
    else missing.push(key);
  }
  return { total: keys.length, tracked, missing };
}

export function collectCatalogReferenceTokens(entries: CatalogEntryLike[]): string[] {
  const names = new Set<string>();
  for (const e of entries) {
    const isRef =
      e.locusStatus === 'reference' ||
      (typeof e.canonicalPage === 'string' && e.canonicalPage.includes('/reference/'));
    if (isRef) names.add(e.name);
  }
  return [...names].sort();
}

export function collectOverlayTokens(overlay: OverlayFileLike): string[] {
  return overlay.entries.map(e => e.name).sort();
}

export function parseReviewJsonl(text: string): ReviewRow[] {
  const rows: ReviewRow[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed) as ReviewRow;
      if (row.version && row.candidate) rows.push(row);
    } catch {
      /* skip malformed */
    }
  }
  return rows;
}

/** Newest N semver release versions from release index (descending). */
export function newestReleaseVersions(releaseIndex: ReleaseIndexFile, limit = 3): string[] {
  const sorted = [...releaseIndex.entries].sort((a, b) =>
    a.pubDate < b.pubDate ? 1 : a.pubDate > b.pubDate ? -1 : 0
  );
  return sorted.slice(0, limit).map(e => e.version);
}

export function collectReviewCandidates(rows: ReviewRow[], versions: readonly string[]): string[] {
  const versionSet = new Set(versions);
  const candidates = new Set<string>();
  for (const row of rows) {
    if (!versionSet.has(row.version)) continue;
    candidates.add(row.candidate);
  }
  return [...candidates].sort();
}

export function checkReferenceUrlPresence(
  urls: readonly string[],
  refIndex: ReferenceIndexFile
): { catalogPagesChecked: number; missingFromIndex: string[] } {
  const urlSet = new Set(refIndex.pages.map(p => p.url));
  const missingFromIndex: string[] = [];
  for (const url of urls) {
    if (!url.includes('/reference/')) continue;
    if (!referenceIndexHasUrl(url, urlSet, refIndex.pages)) missingFromIndex.push(url);
  }
  return { catalogPagesChecked: urls.length, missingFromIndex };
}

export type RssFreshnessResult = {
  indexGenerated: string;
  newestVersion: string | null;
  newestPubDate: string | null;
  indexStale: boolean;
  liveNewestVersion: string | null;
};

/** Stale when live RSS head version differs from committed index newest (when live provided). */
export function checkRssIndexFreshness(
  localIndex: ReleaseIndexFile,
  liveNewestVersion?: string | null
): RssFreshnessResult {
  const sorted = [...localIndex.entries].sort((a, b) =>
    a.pubDate < b.pubDate ? 1 : a.pubDate > b.pubDate ? -1 : 0
  );
  const head = sorted[0];
  const indexStale =
    liveNewestVersion != null && head != null && liveNewestVersion !== head.version;
  return {
    indexGenerated: localIndex.generated,
    newestVersion: head?.version ?? null,
    newestPubDate: head?.pubDate ?? null,
    indexStale,
    liveNewestVersion: liveNewestVersion ?? null,
  };
}

export type DocsCoverageReport = {
  type: 'DocsCoverageVerificationReport';
  version: '1.0.0';
  timestamp: string;
  subsystem: 'other';
  reportPath?: typeof DOCS_COVERAGE_PROOF_REPORT_PATH;
  bunVersion: string;
  bunRevision: string;
  rss: {
    source: string;
    indexGenerated: string;
    newestVersion: string | null;
    indexStale: boolean;
  };
  reference: {
    source: string;
    indexGenerated: string;
    moduleCount: number;
    pageCount: number;
  };
  canonical: {
    catalogTotal: number;
    catalogTracked: number;
    catalogMissing: string[];
    overlayTotal: number;
    overlayTracked: number;
    overlayMissing: string[];
    reviewTotal: number;
    reviewTracked: number;
    reviewMissing: string[];
  };
  referenceUrls: {
    catalogPagesChecked: number;
    missingFromIndex: string[];
  };
  summary: {
    ok: boolean;
    missingCanonicalCount: number;
    indexStale: boolean;
  };
  /** Per-lane breakdown for portal tables + taxonomy drill-down. */
  lanes?: DocsCoverageLane[];
  semanticTags?: SemanticTags;
  _links?: VerificationLinks;
  proofHash?: string;
};

export type BuildDocsCoverageReportInput = {
  releaseIndex: ReleaseIndexFile;
  referenceIndex: ReferenceIndexFile;
  catalogEntries: CatalogEntryLike[];
  overlay: OverlayFileLike;
  reviewRows: ReviewRow[];
  allowlist: DocsCoverageAllowlist;
  liveNewestVersion?: string | null;
  recentReleaseLimit?: number;
};

/** Build lane rows from coverage check aggregates (all `other` — cross-pillar meta gate). */
export function buildDocsCoverageLanes(input: {
  rssStale: boolean;
  newestVersion: string | null;
  referencePageCount: number;
  referenceModuleCount: number;
  catalogCheck: CoverageCheckResult;
  overlayCheck: CoverageCheckResult;
  reviewCheck: CoverageCheckResult;
}): DocsCoverageLane[] {
  const sub: VerificationSubsystem = 'other';
  return [
    {
      name: 'docs-coverage:rss',
      passed: !input.rssStale,
      subsystem: sub,
      expected: 'RSS index fresh vs live head',
      actual: input.rssStale ? 'stale' : `fresh (${input.newestVersion ?? '—'})`,
    },
    {
      name: 'docs-coverage:reference',
      passed: true,
      subsystem: sub,
      expected: 'reference index present',
      actual: `${input.referencePageCount} pages · ${input.referenceModuleCount} modules`,
    },
    {
      name: 'docs-coverage:catalog',
      passed: input.catalogCheck.missing.length === 0,
      subsystem: sub,
      expected: 'catalog tokens tracked',
      actual: `${input.catalogCheck.tracked}/${input.catalogCheck.total}`,
    },
    {
      name: 'docs-coverage:overlay',
      passed: input.overlayCheck.missing.length === 0,
      subsystem: sub,
      expected: 'overlay tokens tracked',
      actual: `${input.overlayCheck.tracked}/${input.overlayCheck.total}`,
    },
    {
      name: 'docs-coverage:review',
      passed: input.reviewCheck.missing.length === 0,
      subsystem: sub,
      expected: 'recent release review tokens tracked',
      actual: `${input.reviewCheck.tracked}/${input.reviewCheck.total}`,
    },
  ];
}

export function buildDocsCoverageReport(input: BuildDocsCoverageReportInput): DocsCoverageReport {
  const catalogByName = new Map(input.catalogEntries.map(e => [e.name, e]));
  const allow = loadAllowlist(input.allowlist);

  const catalogKeys = collectCatalogReferenceTokens(input.catalogEntries);
  const overlayKeys = collectOverlayTokens(input.overlay);
  const recentVersions = newestReleaseVersions(input.releaseIndex, input.recentReleaseLimit ?? 3);
  const reviewKeys = collectReviewCandidates(input.reviewRows, recentVersions);

  const catalogCheck = checkCanonicalCoverage(catalogKeys, catalogByName, allow.catalog);
  const overlayCheck = checkCanonicalCoverage(overlayKeys, catalogByName, allow.overlay);
  const reviewCheck = checkCanonicalCoverage(reviewKeys, catalogByName, allow.review);

  const refUrls = catalogKeys
    .map(k => catalogByName.get(k)?.canonicalPage)
    .filter((u): u is string => typeof u === 'string' && u.includes('/reference/'));
  const referenceUrls = checkReferenceUrlPresence(refUrls, input.referenceIndex);

  const rssFresh = checkRssIndexFreshness(input.releaseIndex, input.liveNewestVersion);

  const missingCanonicalCount =
    catalogCheck.missing.length + overlayCheck.missing.length + reviewCheck.missing.length;

  const ok = missingCanonicalCount === 0 && !rssFresh.indexStale;

  const lanes = buildDocsCoverageLanes({
    rssStale: rssFresh.indexStale,
    newestVersion: rssFresh.newestVersion,
    referencePageCount: input.referenceIndex.count,
    referenceModuleCount: input.referenceIndex.moduleCount,
    catalogCheck,
    overlayCheck,
    reviewCheck,
  });

  return {
    type: 'DocsCoverageVerificationReport',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    subsystem: 'other',
    reportPath: DOCS_COVERAGE_PROOF_REPORT_PATH,
    bunVersion: Bun.version,
    bunRevision: (Bun.revision || '').slice(0, 12) || 'unknown',
    rss: {
      source: input.releaseIndex.source,
      indexGenerated: input.releaseIndex.generated,
      newestVersion: rssFresh.newestVersion,
      indexStale: rssFresh.indexStale,
    },
    reference: {
      source: input.referenceIndex.source,
      indexGenerated: input.referenceIndex.generated,
      moduleCount: input.referenceIndex.moduleCount,
      pageCount: input.referenceIndex.count,
    },
    canonical: {
      catalogTotal: catalogCheck.total,
      catalogTracked: catalogCheck.tracked,
      catalogMissing: catalogCheck.missing,
      overlayTotal: overlayCheck.total,
      overlayTracked: overlayCheck.tracked,
      overlayMissing: overlayCheck.missing,
      reviewTotal: reviewCheck.total,
      reviewTracked: reviewCheck.tracked,
      reviewMissing: reviewCheck.missing,
    },
    referenceUrls,
    summary: {
      ok,
      missingCanonicalCount,
      indexStale: rssFresh.indexStale,
    },
    lanes,
    _links: {
      docs: DOCS_COVERAGE_DOCS,
      source: DOCS_COVERAGE_VERIFY_SOURCE,
      report: DOCS_COVERAGE_PROOF_REPORT_PATH,
    },
  };
}
