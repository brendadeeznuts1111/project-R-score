// @see https://bun.com/docs/project/benchmarking#cpu-profiling
// @see https://bun.com/docs/project/benchmarking#markdown-output
// @see https://bun.com/docs/project/benchmarking#heap-profiling
// @see https://bun.com/docs/project/benchmarking#heap-profiling
// @see https://bun.com/blog/bun-v1.4#cpu-prof-md
// @see https://bun.com/blog/bun-v1.4#heap-prof-md
/**
 * Ratchet the addressable heap `--heap-prof-md` parent locus and
 * docs↔ship plane pairing for Observability profile flags.
 */
import { describe, expect, test } from 'bun:test';
import {
  assertBenchmarkingProfileLocusOrder,
  assertBenchmarkingProfileLocusSemantics,
  BENCHMARKING_PROFILE_ANCHORS,
  BENCHMARKING_PROFILE_ANNOUNCEMENT_URLS,
  BENCHMARKING_PROFILE_CANONICAL_REFS,
  BENCHMARKING_PROFILE_DOCS_URLS,
  BENCHMARKING_PROFILE_PLANE_PAIRS,
  BENCHMARKING_PROFILE_SHIP,
  extractHtmlIds,
  htmlSectionAfterId,
  htmlSnippetAfterId,
} from '../lib/docs/benchmarking-profile-loci.ts';
import { CLICategory, CLI_DOCUMENTATION_URLS, CLI_PROFILE_ANNOUNCEMENT_URLS } from '../lib/docs/constants/cli.ts';
import { CANONICAL_REFS } from '../tools/bun-doc-refs.ts';
import { changelogFor } from '../tools/bun-docs-changelog.ts';
import catalog from '../tools/bun-docs-catalog.json';

const FIXTURE = `
<section>
  <h2 id="cpu-profiling">CPU profiling</h2>
  <h3 id="markdown-output">Markdown output</h3>
  <p>Use <code>--cpu-prof-md</code> for LLM-friendly CPU profiles.</p>
  <h2 id="heap-profiling">Heap profiling</h2>
  <h3 id="markdown-output">Markdown output</h3>
  <p>Use <code>--heap-prof-md</code> for CLI heap analysis.</p>
</section>
`;

async function benchmarkingReachable(): Promise<boolean> {
  try {
    const r = await fetch(BENCHMARKING_PROFILE_DOCS_URLS.cpuProf.split('#')[0]!, {
      signal: AbortSignal.timeout(2000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

const online = await benchmarkingReachable();

describe('benchmarking profile loci SSOT', () => {
  test('CANONICAL_REFS and CLI paths use the addressable heap parent', () => {
    expect(BENCHMARKING_PROFILE_ANCHORS.heapProfMd).toBe('heap-profiling');
    expect(BENCHMARKING_PROFILE_ANCHORS.cpuProfMd).toBe('markdown-output');

    expect(CANONICAL_REFS['--heap-prof-md']).toBe(BENCHMARKING_PROFILE_DOCS_URLS.heapProfMd);
    expect(CANONICAL_REFS['--cpu-prof-md']).toBe(BENCHMARKING_PROFILE_DOCS_URLS.cpuProfMd);
    for (const [flag, url] of Object.entries(BENCHMARKING_PROFILE_CANONICAL_REFS)) {
      expect(CANONICAL_REFS[flag]).toBe(url);
    }

    const debug = CLI_DOCUMENTATION_URLS[CLICategory.DEBUGGING];
    expect(debug.HEAP_PROF_MD).toContain(`#${BENCHMARKING_PROFILE_ANCHORS.heapProfMd}`);
    expect(debug.CPU_PROF_MD).toContain(`#${BENCHMARKING_PROFILE_ANCHORS.cpuProfMd}`);
  });

  test('CLI announcement URLs are the ship-plane SSOT', () => {
    expect(CLI_PROFILE_ANNOUNCEMENT_URLS).toEqual(BENCHMARKING_PROFILE_ANNOUNCEMENT_URLS);
    expect(CLI_PROFILE_ANNOUNCEMENT_URLS.HEAP_PROF_MD).toBe(
      'https://bun.com/blog/bun-v1.4#heap-prof-md'
    );
    expect(CLI_PROFILE_ANNOUNCEMENT_URLS.CPU_PROF).toBe(
      'https://bun.com/blog/bun-v1.3.2#cpu-profiling-with-cpu-prof'
    );
  });

  test('docs↔ship plane pairs match catalog docsUrl + blogUrl', () => {
    for (const pair of BENCHMARKING_PROFILE_PLANE_PAIRS) {
      const entry = (
        catalog as {
          entries: Array<{ name: string; docsUrl?: string; blogUrl?: string }>;
        }
      ).entries.find(e => e.name === pair.flag);
      expect(entry, pair.flag).toBeTruthy();
      expect(entry!.docsUrl).toBe(pair.docsUrl);
      expect(entry!.blogUrl).toBe(pair.shipUrl);

      const cl = changelogFor(pair.flag);
      expect(cl.releasedIn).toBe(BENCHMARKING_PROFILE_SHIP[pair.shipKey].version);
      expect(cl.blogAnchor).toBe(BENCHMARKING_PROFILE_SHIP[pair.shipKey].blogAnchor);
    }
  });

  test('fixture HTML keeps CPU markdown before the addressable heap parent', () => {
    expect(extractHtmlIds(FIXTURE)).toEqual([
      'cpu-profiling',
      'markdown-output',
      'heap-profiling',
    ]);
    expect(() => assertBenchmarkingProfileLocusOrder(FIXTURE)).not.toThrow();
    expect(() => assertBenchmarkingProfileLocusSemantics(FIXTURE)).not.toThrow();
    expect(htmlSnippetAfterId(FIXTURE, 'markdown-output')).toContain('--cpu-prof-md');
    expect(htmlSnippetAfterId(FIXTURE, 'heap-profiling')).toContain('--heap-prof-md');
    expect(htmlSectionAfterId(FIXTURE, 'markdown-output')).not.toContain('--heap-prof-md');
  });

  test('fixture fails closed when the addressable heap parent disappears', () => {
    const broken = FIXTURE.replace('id="heap-profiling"', 'id="heap-profile"');
    expect(() => assertBenchmarkingProfileLocusOrder(broken)).toThrow(/heap-profiling/);
  });

  test('fixture fails closed when section bodies swap flag names', () => {
    const swapped = FIXTURE.replace('--cpu-prof-md', '--HEAP_TMP')
      .replace('--heap-prof-md', '--cpu-prof-md')
      .replace('--HEAP_TMP', '--heap-prof-md');
    expect(() => assertBenchmarkingProfileLocusSemantics(swapped)).toThrow(
      /missing --cpu-prof-md|missing --heap-prof-md|mentions --cpu-prof-md first|mentions --heap-prof-md first/
    );
  });

  test.skipIf(!online)(
    'live benchmarking page still exposes ordered markdown sections with matching flags',
    async () => {
      const page = BENCHMARKING_PROFILE_DOCS_URLS.cpuProf.split('#')[0]!;
      const res = await fetch(page, { signal: AbortSignal.timeout(15_000) });
      expect(res.ok).toBe(true);
      const html = await res.text();
      expect(() => assertBenchmarkingProfileLocusSemantics(html)).not.toThrow();
    },
    { timeout: 20_000 }
  );
});
