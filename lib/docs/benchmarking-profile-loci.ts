// @see https://bun.com/docs/project/benchmarking#cpu-profiling — --cpu-prof
// @see https://bun.com/docs/project/benchmarking#markdown-output — --cpu-prof-md
// @see https://bun.com/docs/project/benchmarking#heap-profiling — --heap-prof
// @see https://bun.com/docs/project/benchmarking#markdown-output-1 — --heap-prof-md
// @see https://bun.com/blog/bun-v1.3.2#cpu-profiling-with-cpu-prof — ship
// @see https://bun.com/blog/bun-v1.4#cpu-prof-md — ship
// @see https://bun.com/blog/bun-v1.4#heap-prof — ship
// @see https://bun.com/blog/bun-v1.4#heap-prof-md — ship
/**
 * Official Bun benchmarking docs + ship loci for Observability profile flags.
 *
 * Planes:
 *   docs how-to (unversioned) — Mintlify `#markdown-output` / `#markdown-output-1`
 *   ship evidence (versioned blog) — `#cpu-prof-md` / `#heap-prof-md` (stable)
 *
 * Mintlify auto-slugs both "Markdown output" h3s; the second collision becomes
 * `#markdown-output-1`. Keep that suffix here; ratchet with
 * `tests/bun-benchmarking-profile-loci.test.ts`.
 */
import { blogUrlForReleaseVersion } from './bun-blog-url.ts';
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

/** Versioned blog section anchors (ship plane — stable ids). */
export const BENCHMARKING_PROFILE_SHIP = {
  cpuProf: { version: '1.3.2', blogAnchor: 'cpu-profiling-with-cpu-prof' },
  cpuProfMd: { version: '1.4.0', blogAnchor: 'cpu-prof-md' },
  heapProf: { version: '1.4.0', blogAnchor: 'heap-prof' },
  heapProfMd: { version: '1.4.0', blogAnchor: 'heap-prof-md' },
  memoryPressure: { version: '1.4.0', blogAnchor: 'process-on-memorypressure' },
  metafileMd: { version: '1.4.0', blogAnchor: 'metafile-md' },
  observability: { version: '1.4.0', blogAnchor: 'observability' },
} as const;

export type BenchmarkingProfileShipKey = keyof typeof BENCHMARKING_PROFILE_SHIP;

export function benchmarkingDocsUrl(anchor?: BenchmarkingProfileAnchor): string {
  return bunDocs(BENCHMARKING_DOCS_PATH, anchor);
}

export function benchmarkingShipUrl(key: BenchmarkingProfileShipKey): string {
  const ship = BENCHMARKING_PROFILE_SHIP[key];
  return `${blogUrlForReleaseVersion(ship.version)}#${ship.blogAnchor}`;
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

/** Versioned announcement URLs (release evidence — not unversioned docs). */
export const BENCHMARKING_PROFILE_ANNOUNCEMENT_URLS = {
  CPU_PROF: benchmarkingShipUrl('cpuProf'),
  CPU_PROF_NAME: benchmarkingShipUrl('cpuProf'),
  CPU_PROF_DIR: benchmarkingShipUrl('cpuProf'),
  CPU_PROF_INTERVAL: benchmarkingShipUrl('cpuProf'),
  CPU_PROF_MD: benchmarkingShipUrl('cpuProfMd'),
  HEAP_PROF: benchmarkingShipUrl('heapProf'),
  HEAP_PROF_NAME: benchmarkingShipUrl('heapProf'),
  HEAP_PROF_DIR: benchmarkingShipUrl('heapProf'),
  HEAP_PROF_INTERVAL: benchmarkingShipUrl('heapProf'),
  HEAP_PROF_MD: benchmarkingShipUrl('heapProfMd'),
  MEMORY_PRESSURE: benchmarkingShipUrl('memoryPressure'),
  METAFILE_MD: benchmarkingShipUrl('metafileMd'),
  OBSERVABILITY: benchmarkingShipUrl('observability'),
} as const;

/** Docs how-to ↔ ship blog pairing for the four primary profile flags. */
export const BENCHMARKING_PROFILE_PLANE_PAIRS = [
  {
    flag: '--cpu-prof',
    docsUrl: BENCHMARKING_PROFILE_DOCS_URLS.cpuProf,
    shipUrl: BENCHMARKING_PROFILE_ANNOUNCEMENT_URLS.CPU_PROF,
    shipKey: 'cpuProf' as const,
  },
  {
    flag: '--cpu-prof-md',
    docsUrl: BENCHMARKING_PROFILE_DOCS_URLS.cpuProfMd,
    shipUrl: BENCHMARKING_PROFILE_ANNOUNCEMENT_URLS.CPU_PROF_MD,
    shipKey: 'cpuProfMd' as const,
  },
  {
    flag: '--heap-prof',
    docsUrl: BENCHMARKING_PROFILE_DOCS_URLS.heapProf,
    shipUrl: BENCHMARKING_PROFILE_ANNOUNCEMENT_URLS.HEAP_PROF,
    shipKey: 'heapProf' as const,
  },
  {
    flag: '--heap-prof-md',
    docsUrl: BENCHMARKING_PROFILE_DOCS_URLS.heapProfMd,
    shipUrl: BENCHMARKING_PROFILE_ANNOUNCEMENT_URLS.HEAP_PROF_MD,
    shipKey: 'heapProfMd' as const,
  },
] as const;

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

/** Slice of HTML after `id="…"` for semantic flag checks. */
export function htmlSnippetAfterId(
  html: string,
  id: string, // brand-ok — HTML fragment id from Mintlify, not domain brand
  maxLen = 1500
): string {
  const needle = `id="${id}"`;
  const alt = `id='${id}'`;
  let at = html.indexOf(needle);
  if (at < 0) at = html.indexOf(alt);
  if (at < 0) return '';
  return html.slice(at, at + maxLen);
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

/**
 * Prove each Mintlify "Markdown output" section documents the matching flag
 * (cpu section → `--cpu-prof-md`, heap collision → `--heap-prof-md`).
 */
export function assertBenchmarkingProfileLocusSemantics(html: string): void {
  assertBenchmarkingProfileLocusOrder(html);
  const cpuSnip = htmlSnippetAfterId(html, BENCHMARKING_PROFILE_ANCHORS.cpuProfMd);
  const heapSnip = htmlSnippetAfterId(html, BENCHMARKING_PROFILE_ANCHORS.heapProfMd);
  if (!cpuSnip.includes('--cpu-prof-md')) {
    throw new Error(`#${BENCHMARKING_PROFILE_ANCHORS.cpuProfMd} snippet missing --cpu-prof-md`);
  }
  if (!heapSnip.includes('--heap-prof-md')) {
    throw new Error(`#${BENCHMARKING_PROFILE_ANCHORS.heapProfMd} snippet missing --heap-prof-md`);
  }
  // Guard against swapped body text under the collision ids
  const cpuFlagAt = cpuSnip.indexOf('--cpu-prof-md');
  const cpuWrongAt = cpuSnip.indexOf('--heap-prof-md');
  if (cpuWrongAt >= 0 && cpuWrongAt < cpuFlagAt) {
    throw new Error(`#${BENCHMARKING_PROFILE_ANCHORS.cpuProfMd} mentions --heap-prof-md first`);
  }
  const heapFlagAt = heapSnip.indexOf('--heap-prof-md');
  const heapWrongAt = heapSnip.indexOf('--cpu-prof-md');
  if (heapWrongAt >= 0 && heapWrongAt < heapFlagAt) {
    throw new Error(`#${BENCHMARKING_PROFILE_ANCHORS.heapProfMd} mentions --cpu-prof-md first`);
  }
}
