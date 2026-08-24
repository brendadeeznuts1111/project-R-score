// @see https://bun.com/docs/project/benchmarking#cpu-profiling — --cpu-prof
// @see https://bun.com/docs/project/benchmarking#markdown-output — --cpu-prof-md
// @see https://bun.com/docs/project/benchmarking#heap-profiling — --heap-prof
// @see https://bun.com/docs/project/benchmarking#markdown-output-1 — --heap-prof-md
// @see https://bun.com/blog/bun-v1.4#cpu-prof-md — ship
// @see https://bun.com/blog/bun-v1.4#heap-prof-md — ship
/**
 * Official Bun benchmarking docs loci for Observability profile flags.
 *
 * Mintlify auto-slugs both "Markdown output" h3s under CPU / Heap profiling.
 * The second collision becomes `#markdown-output-1` — fragile, but live today.
 * Keep that suffix in one place; ratchet with
 * `tests/bun-benchmarking-profile-loci.test.ts`.
 */
import { bunDocs } from './bun-site-url.ts';

/** Unversioned docs page (how-to plane). */
export const BENCHMARKING_DOCS_PATH = 'project/benchmarking' as const;

/**
 * Section anchors on the benchmarking page.
 * `heapProfMd` is Mintlify's collision suffix — do not invent a prettier slug.
 */
export const BENCHMARKING_PROFILE_ANCHORS = {
  cpuProfiling: 'cpu-profiling',
  /** CPU `--cpu-prof-md` subsection (first "Markdown output"). */
  cpuProfMd: 'markdown-output',
  heapProfiling: 'heap-profiling',
  /**
   * Heap `--heap-prof-md` subsection (second "Markdown output").
   * Mintlify collision → `-1`. If upstream renames, update here + ratchet.
   */
  heapProfMd: 'markdown-output-1',
} as const;

export type BenchmarkingProfileAnchor =
  (typeof BENCHMARKING_PROFILE_ANCHORS)[keyof typeof BENCHMARKING_PROFILE_ANCHORS];

export function benchmarkingDocsUrl(anchor?: BenchmarkingProfileAnchor): string {
  return bunDocs(BENCHMARKING_DOCS_PATH, anchor);
}

/** Institutional how-to URLs (docs plane — not ship/blog). */
export const BENCHMARKING_PROFILE_DOCS_URLS = {
  cpuProf: benchmarkingDocsUrl(BENCHMARKING_PROFILE_ANCHORS.cpuProfiling),
  cpuProfMd: benchmarkingDocsUrl(BENCHMARKING_PROFILE_ANCHORS.cpuProfMd),
  heapProf: benchmarkingDocsUrl(BENCHMARKING_PROFILE_ANCHORS.heapProfiling),
  heapProfMd: benchmarkingDocsUrl(BENCHMARKING_PROFILE_ANCHORS.heapProfMd),
} as const;

/** Relative docs paths for CLI_DOCUMENTATION_URLS / curated `path`. */
export const BENCHMARKING_PROFILE_DOCS_PATHS = {
  cpuProf: `${BENCHMARKING_DOCS_PATH}#${BENCHMARKING_PROFILE_ANCHORS.cpuProfiling}`,
  cpuProfMd: `${BENCHMARKING_DOCS_PATH}#${BENCHMARKING_PROFILE_ANCHORS.cpuProfMd}`,
  heapProf: `${BENCHMARKING_DOCS_PATH}#${BENCHMARKING_PROFILE_ANCHORS.heapProfiling}`,
  heapProfMd: `${BENCHMARKING_DOCS_PATH}#${BENCHMARKING_PROFILE_ANCHORS.heapProfMd}`,
} as const;

/** Flag → docs URL for CANONICAL_REFS family. */
export const BENCHMARKING_PROFILE_CANONICAL_REFS = {
  '--cpu-prof': BENCHMARKING_PROFILE_DOCS_URLS.cpuProf,
  '--cpu-prof-md': BENCHMARKING_PROFILE_DOCS_URLS.cpuProfMd,
  '--cpu-prof-name': BENCHMARKING_PROFILE_DOCS_URLS.cpuProf,
  '--cpu-prof-dir': BENCHMARKING_PROFILE_DOCS_URLS.cpuProf,
  '--cpu-prof-interval': BENCHMARKING_PROFILE_DOCS_URLS.cpuProf,
  '--heap-prof': BENCHMARKING_PROFILE_DOCS_URLS.heapProf,
  '--heap-prof-md': BENCHMARKING_PROFILE_DOCS_URLS.heapProfMd,
  '--heap-prof-name': BENCHMARKING_PROFILE_DOCS_URLS.heapProf,
  '--heap-prof-dir': BENCHMARKING_PROFILE_DOCS_URLS.heapProf,
  '--heap-prof-interval': BENCHMARKING_PROFILE_DOCS_URLS.heapProf,
} as const;

/** Ordered id list from HTML `id="…"` attributes (first occurrence wins). */
export function extractHtmlIds(html: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of html.matchAll(/\bid=["']([^"']+)["']/g)) {
    const id = m[1]!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Prove Mintlify collision layout: cpu `#markdown-output` appears before
 * heap `#markdown-output-1`, and both parent sections exist.
 */
export function assertBenchmarkingProfileLocusOrder(html: string): void {
  const ids = extractHtmlIds(html);
  const cpu = ids.indexOf(BENCHMARKING_PROFILE_ANCHORS.cpuProfiling);
  const cpuMd = ids.indexOf(BENCHMARKING_PROFILE_ANCHORS.cpuProfMd);
  const heap = ids.indexOf(BENCHMARKING_PROFILE_ANCHORS.heapProfiling);
  const heapMd = ids.indexOf(BENCHMARKING_PROFILE_ANCHORS.heapProfMd);

  if (cpu < 0) throw new Error(`missing #${BENCHMARKING_PROFILE_ANCHORS.cpuProfiling}`);
  if (cpuMd < 0) throw new Error(`missing #${BENCHMARKING_PROFILE_ANCHORS.cpuProfMd}`);
  if (heap < 0) throw new Error(`missing #${BENCHMARKING_PROFILE_ANCHORS.heapProfiling}`);
  if (heapMd < 0) {
    throw new Error(
      `missing #${BENCHMARKING_PROFILE_ANCHORS.heapProfMd} (Mintlify collision for heap Markdown output)`
    );
  }
  if (!(cpu < cpuMd && cpuMd < heap && heap < heapMd)) {
    throw new Error(
      `unexpected profiling heading order: cpu@${cpu} cpuMd@${cpuMd} heap@${heap} heapMd@${heapMd}`
    );
  }
}
