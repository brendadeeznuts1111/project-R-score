#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
// @see https://bun.com/docs/runtime/glob — Bun.Glob
import { jsonOut } from '../lib/console-depth';
import { dirExistsSync, joinPath, readText, resolvePath } from './lib/fs-bun';

type PinnedBaseline = {
  version?: number;
  rationale?: string;
  pinnedBy?: string;
  previousSnapshotId?: string | null;
  snapshot?: {
    id?: string;
    createdAt?: string;
    queryPack?: string;
  };
  strict?: Record<string, unknown>;
  coverage?: Record<string, unknown>;
};

type ValidationResult = {
  path: string;
  ok: boolean;
  errors: string[];
};

function usage(): void {
  console.info(`
Search Benchmark Baseline Governance

USAGE:
  bun run scripts/search-benchmark-baseline-governance.ts [--json]
`);
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateBaseline(path: string, baseline: PinnedBaseline): ValidationResult {
  const errors: string[] = [];

  if (baseline.version !== 1) {
    errors.push('version must be 1');
  }
  if (!isNonEmptyString(baseline.snapshot?.id)) {
    errors.push('snapshot.id is required');
  }
  if (!isNonEmptyString(baseline.snapshot?.queryPack)) {
    errors.push('snapshot.queryPack is required');
  }
  if (!baseline.strict || typeof baseline.strict !== 'object') {
    errors.push('strict metrics are required');
  }
  if (!baseline.coverage || typeof baseline.coverage !== 'object') {
    errors.push('coverage metrics are required');
  }

  if (!isNonEmptyString(baseline.rationale)) {
    errors.push('rationale is required');
  } else if (String(baseline.rationale).trim() === 'bootstrap_missing_baseline') {
    errors.push('rationale cannot be bootstrap_missing_baseline for committed baselines');
  }

  if (!isNonEmptyString(baseline.pinnedBy)) {
    errors.push('pinnedBy is required');
  } else {
    const pinnedBy = String(baseline.pinnedBy).trim().toLowerCase();
    if (pinnedBy === 'unknown') {
      errors.push('pinnedBy cannot be "unknown"');
    }
  }

  if (!('previousSnapshotId' in baseline)) {
    errors.push('previousSnapshotId field is required (string or null)');
  } else if (
    !(baseline.previousSnapshotId === null || isNonEmptyString(baseline.previousSnapshotId))
  ) {
    errors.push('previousSnapshotId must be string or null');
  }

  return {
    path,
    ok: errors.length === 0,
    errors,
  };
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    return;
  }

  const asJson = args.includes('--json');
  const root = resolvePath('.search');
  if (!dirExistsSync(root)) {
    throw new Error('.search directory not found');
  }

  const glob = new Bun.Glob('search-benchmark-pinned-baseline*.json');
  const baselineFiles: string[] = [];
  for await (const name of glob.scan({ cwd: root, onlyFiles: true, dot: false })) {
    if (!/^search-benchmark-pinned-baseline(\..+)?\.json$/i.test(name)) continue;
    baselineFiles.push(resolvePath(root, name));
  }
  baselineFiles.sort();

  if (baselineFiles.length === 0) {
    throw new Error('No search benchmark pinned baseline files found under .search/');
  }

  const results: ValidationResult[] = [];
  for (const path of baselineFiles) {
    const raw = await readText(path);
    const parsed = JSON.parse(raw) as PinnedBaseline;
    results.push(validateBaseline(path, parsed));
  }

  const failed = results.filter(r => !r.ok);
  if (asJson) {
    jsonOut({
      ok: failed.length === 0,
      checked: results.length,
      failed: failed.length,
      results,
    });
  } else {
    for (const result of results) {
      if (result.ok) {
        console.info(`[search:bench:baseline:verify] ok ${result.path}`);
      } else {
        console.info(`[search:bench:baseline:verify] fail ${result.path}`);
        for (const error of result.errors) {
          console.info(`  - ${error}`);
        }
      }
    }
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
