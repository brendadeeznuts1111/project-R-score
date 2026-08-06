// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
import { enrichOne } from './enrich.ts';
import { ensureEvidenceStore } from './evidence.ts';
import { ensureResearchDirs, BATCH_ENRICH_EXPORT } from './paths.ts';
import { registerTask } from './tasks.ts';
import { startWorker, getWorkerStats } from './worker-registry.ts';
import type { BatchEnrichReport, EnrichResult, SeedDomain } from './types.ts';

export type BatchEnrichOptions = {
  screenshot?: boolean;
  async?: boolean;
  parallel?: number;
  fixtureFallback?: boolean;
  store?: boolean;
  /** When true, run in-process (no Bun.spawn). Useful for constrained environments. */
  inProcess?: boolean;
  exportPath?: string;
};

export async function runBatchEnrich(
  domains: SeedDomain[],
  options: BatchEnrichOptions = {}
): Promise<BatchEnrichReport> {
  await ensureResearchDirs();
  await ensureEvidenceStore();

  const parallel = Math.max(1, options.parallel ?? 5);
  const screenshot = options.screenshot !== false;
  const fixtureFallback = options.fixtureFallback !== false;
  const store = options.store !== false;
  const inProcess = options.inProcess === true || options.async === false;

  const results: EnrichResult[] = [];

  if (inProcess) {
    // Simple concurrency pool in-process
    let idx = 0;
    const workers = Array.from({ length: Math.min(parallel, domains.length) }, async () => {
      while (idx < domains.length) {
        const i = idx++;
        const seed = domains[i]!;
        const taskId = `batch-${i}-${Bun.randomUUIDv7()}`;
        const work = enrichOne(seed, {
          screenshot,
          fixtureFallback,
          store,
          taskId,
          workerId: `inproc-${process.pid}`,
        });
        registerTask(taskId, 'enrich', work);
        results.push(await work);
      }
    });
    await Promise.all(workers);
  } else {
    const active = new Set<Promise<void>>();
    for (let i = 0; i < domains.length; i++) {
      const seed = domains[i]!;
      while (active.size >= parallel) {
        await Promise.race(active);
      }
      const taskId = `batch-${i}-${Bun.randomUUIDv7()}`;
      const entry = startWorker({
        taskId,
        seed,
        options: { screenshot, fixtureFallback, store },
      });
      registerTask(taskId, 'enrich-worker', entry.result);
      const done = entry.result
        .then(r => {
          results.push(r);
        })
        .catch(async err => {
          // Fallback to in-process on spawn/IPC failure
          const r = await enrichOne(seed, {
            screenshot,
            fixtureFallback,
            store,
            taskId,
            workerId: `fallback-${process.pid}`,
          });
          r.error = err instanceof Error ? err.message : String(err);
          results.push(r);
        })
        .finally(() => {
          active.delete(done);
        });
      active.add(done);
    }
    await Promise.all([...active]);
  }

  results.sort((a, b) => a.host.localeCompare(b.host));

  const report: BatchEnrichReport = {
    generatedAt: new Date().toISOString(),
    bunVersion: Bun.version,
    parallel,
    screenshot,
    fixtureFallback,
    count: results.length,
    results,
  };

  const exportPath = options.exportPath ?? BATCH_ENRICH_EXPORT;
  await Bun.write(exportPath, JSON.stringify(report, null, 2));
  console.error(
    `[batch-enrich] ${results.length} domains parallel=${parallel} workers=${JSON.stringify(getWorkerStats())} → ${exportPath}`
  );
  return report;
}
