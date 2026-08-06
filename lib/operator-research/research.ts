// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { runBatchEnrich } from './batch.ts';
import { generateCoverageReport } from './coverage.ts';
import { detectStackFromHtml } from './detect-stack.ts';
import { ensureEvidenceStore, resetEvidenceStore, storeStackEvidence } from './evidence.ts';
import { loadOperators, loadSeeds, seedsFromOperators } from './operators.ts';
import {
  BATCH_ENRICH_EXPORT,
  DETECT_STACK_EXPORT,
  COVERAGE_REPORT_MD,
  ensureResearchDirs,
} from './paths.ts';
import type { BatchEnrichReport, SeedDomain, StackDetection } from './types.ts';

export type ResearchFullOptions = {
  seedPath?: string;
  parallel?: number;
  screenshot?: boolean;
  fixtureFallback?: boolean;
  inProcess?: boolean;
  limit?: number;
};

export async function batchDetectStack(opts: {
  input?: string;
  store?: boolean;
}): Promise<StackDetection[]> {
  await ensureEvidenceStore();
  const inputPath = opts.input ?? BATCH_ENRICH_EXPORT;
  const batch = (await Bun.file(inputPath).json()) as BatchEnrichReport;
  const operators = await loadOperators();
  const stacks: StackDetection[] = [];

  for (const item of batch.results ?? []) {
    let html = '';
    if (item.fetch.htmlPath && (await Bun.file(item.fetch.htmlPath).exists())) {
      html = await Bun.file(item.fetch.htmlPath).text();
    }
    const stack = detectStackFromHtml(item.url, html);
    stacks.push(stack);
    if (opts.store !== false) {
      const op = operators.find(o => o.id === item.operatorId || o.host === item.host);
      storeStackEvidence(stack, op?.id ?? item.operatorId);
    }
    console.log(
      `${item.url} → ${stack.provider} (${stack.confidence}%) markets=[${stack.marketsObserved.join(',')}]`
    );
  }

  await Bun.write(
    DETECT_STACK_EXPORT,
    JSON.stringify({ generatedAt: new Date().toISOString(), count: stacks.length, stacks }, null, 2)
  );
  return stacks;
}

export async function runFullResearch(options: ResearchFullOptions = {}) {
  await ensureResearchDirs();
  await ensureEvidenceStore();
  resetEvidenceStore();

  let seeds: SeedDomain[];
  if (options.seedPath) {
    seeds = await loadSeeds(options.seedPath);
  } else {
    try {
      seeds = await loadSeeds();
    } catch {
      seeds = seedsFromOperators(await loadOperators(), options.limit ?? 20);
    }
  }
  if (options.limit) seeds = seeds.slice(0, options.limit);

  const batch = await runBatchEnrich(seeds, {
    screenshot: options.screenshot !== false,
    parallel: options.parallel ?? 5,
    fixtureFallback: options.fixtureFallback !== false,
    inProcess: options.inProcess ?? true,
    async: true,
    store: true,
  });

  await batchDetectStack({ input: BATCH_ENRICH_EXPORT, store: true });
  const coverage = await generateCoverageReport({
    detailed: true,
    outputMd: COVERAGE_REPORT_MD,
  });

  return { batch, coverage, exports: { batch: BATCH_ENRICH_EXPORT, coverage: COVERAGE_REPORT_MD } };
}
