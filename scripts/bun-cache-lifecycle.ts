#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * CI / self-hosted Bun install cache lifecycle.
 *
 * - `--dry-run` — metrics only (safe; Bun's `pm cache rm --dry-run` still deletes on 1.4.x)
 * - `--prune`   — `bun pm cache rm` when over BUN_CACHE_PRUNE_MAX_MB (default 2048) on allowed runners
 *
 * @see docs/UNIFIED.md
 */
import { jsonOut } from '../lib/console-depth.ts';
import { runBunCacheLifecycle, type BunCacheLifecyclePlan } from './lib/bun-cache-metrics.ts';
import { collectBunPmHealth, type BunPmHealthReport } from './lib/bun-pm-health.ts';

function parseArgs(argv: string[]): {
  dryRun: boolean;
  prune: boolean;
  json: boolean;
  strict: boolean;
} {
  return {
    dryRun: argv.includes('--dry-run'),
    prune: argv.includes('--prune'),
    json: argv.includes('--json'),
    strict: argv.includes('--strict'),
  };
}

function renderPlan(plan: BunCacheLifecyclePlan, health: BunPmHealthReport): void {
  const m = plan.metrics;
  console.info(`=== Bun PM cache lifecycle (${plan.mode}) ===`);
  console.info(`project: ${health.project.name ?? '?'}@${health.project.version ?? '?'}`);
  console.info(`cacheDir: ${m.cacheDir ?? '(unset)'}`);
  console.info(`size: ${m.sizeHuman ?? 'unknown'} (${m.sizeBytes ?? '?'} bytes)`);
  console.info(`global store links: ${m.linksEntries} entries @ ${m.globalStoreLinksDir ?? 'n/a'}`);
  console.info(`lockfile: ${health.lockfile.detail}`);
  console.info(`trust: ${health.trust.detail}`);
  console.info(`bin: local=${health.bin.local ?? '?'} global=${health.bin.global ?? '?'}`);
  console.info(`wouldPrune: ${plan.wouldPrune}`);
  console.info(`pruneExecuted: ${plan.pruneExecuted}`);
  console.info(`reason: ${plan.pruneReason}`);
  console.info(`threshold: ${Math.round(plan.maxBytes / (1024 * 1024))}MB`);
  console.info(`note: ${plan.note}`);
}

async function main(): Promise<void> {
  const args = parseArgs(
    applyUnknownLongOptionGuardFor('install:cache:lifecycle', Bun.argv.slice(2))
  );
  const dryRun = args.dryRun || !args.prune;
  const [plan, health] = await Promise.all([
    runBunCacheLifecycle({ dryRun, prune: args.prune }),
    collectBunPmHealth(),
  ]);

  const payload = { lifecycle: plan, pmHealth: health };

  if (args.json) {
    jsonOut(payload);
  } else {
    renderPlan(plan, health);
  }

  let failed = 0;
  if (!health.ok) failed += health.failures.length;
  if (args.strict && health.warnings.length > 0) failed += health.warnings.length;
  if (args.prune && plan.pruneExecuted === false && plan.wouldPrune && plan.mode === 'prune') {
    failed++;
  }
  if (failed > 0 && (args.strict || !health.ok)) {
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
