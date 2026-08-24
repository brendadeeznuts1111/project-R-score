// @see https://bun.com/docs/project/benchmarking#cpu-profiling
// @see https://bun.com/docs/project/benchmarking#markdown-output
// @see https://bun.com/docs/project/benchmarking#heap-profiling
// @see https://bun.com/docs/project/benchmarking#markdown-output-1
/**
 * Ratchet Mintlify collision for heap `--heap-prof-md` how-to locus.
 * Offline fixture + live fetch when bun.com is reachable.
 */
import { describe, expect, test } from 'bun:test';
import {
  assertBenchmarkingProfileLocusOrder,
  BENCHMARKING_PROFILE_ANCHORS,
  BENCHMARKING_PROFILE_CANONICAL_REFS,
  BENCHMARKING_PROFILE_DOCS_URLS,
  extractHtmlIds,
} from '../lib/docs/benchmarking-profile-loci.ts';
import { CANONICAL_REFS } from '../tools/bun-doc-refs.ts';
import { CLICategory, CLI_DOCUMENTATION_URLS } from '../lib/docs/constants/cli.ts';

const FIXTURE = `
<section>
  <h2 id="cpu-profiling">CPU profiling</h2>
  <h3 id="markdown-output">Markdown output</h3>
  <h2 id="heap-profiling">Heap profiling</h2>
  <h3 id="markdown-output-1">Markdown output</h3>
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
  test('CANONICAL_REFS and CLI paths share the Mintlify heap-md collision slug', () => {
    expect(BENCHMARKING_PROFILE_ANCHORS.heapProfMd).toBe('markdown-output-1');
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

  test('fixture HTML keeps cpu markdown before heap markdown-output-1', () => {
    expect(extractHtmlIds(FIXTURE)).toEqual([
      'cpu-profiling',
      'markdown-output',
      'heap-profiling',
      'markdown-output-1',
    ]);
    expect(() => assertBenchmarkingProfileLocusOrder(FIXTURE)).not.toThrow();
  });

  test('fixture fails closed when Mintlify drops the -1 collision', () => {
    const broken = FIXTURE.replace('id="markdown-output-1"', 'id="markdown-heap"');
    expect(() => assertBenchmarkingProfileLocusOrder(broken)).toThrow(/markdown-output-1/);
  });

  test.skipIf(!online)(
    'live benchmarking page still exposes markdown-output then markdown-output-1',
    async () => {
      const page = BENCHMARKING_PROFILE_DOCS_URLS.cpuProf.split('#')[0]!;
      const res = await fetch(page, { signal: AbortSignal.timeout(15_000) });
      expect(res.ok).toBe(true);
      const html = await res.text();
      expect(() => assertBenchmarkingProfileLocusOrder(html)).not.toThrow();
    },
    { timeout: 20_000 }
  );
});
