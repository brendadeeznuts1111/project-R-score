#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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
  console.log(`
Search Benchmark Baseline Governance

USAGE:
  bun run scripts/search-benchmark-baseline-governance.ts [--json]
`);
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateBaseline(path: string, baseline: PinnedBaseline): ValidationResult {
  const errors: string[] = [];

  if (baseline.version !== 1) {
    errors.push('version must be 1');
  }
  if (!hasNonEmptyString(baseline.snapshot?.id)) {
    errors.push('snapshot.id is required');
  }
  if (!hasNonEmptyString(baseline.snapshot?.queryPack)) {
    errors.push('snapshot.queryPack is required');
  }
  if (!baseline.strict || typeof baseline.strict !== 'object') {
    errors.push('strict metrics are required');
  }
  if (!baseline.coverage || typeof baseline.coverage !== 'object') {
    errors.push('coverage metrics are required');
  }

  if (!hasNonEmptyString(baseline.rationale)) {
    errors.push('rationale is required');
  } else if (String(baseline.rationale).trim() === 'bootstrap_missing_baseline') {
    errors.push('rationale cannot be bootstrap_missing_baseline for committed baselines');
  }

  if (!hasNonEmptyString(baseline.pinnedBy)) {
    errors.push('pinnedBy is required');
  } else {
    const pinnedBy = String(baseline.pinnedBy).trim().toLowerCase();
    if (pinnedBy === 'unknown') {
      errors.push('pinnedBy cannot be "unknown"');
    }
  }

  if (!('previousSnapshotId' in baseline)) {
    errors.push('previousSnapshotId field is required (string or null)');
  } else if (!(baseline.previousSnapshotId === null || hasNonEmptyString(baseline.previousSnapshotId))) {
    errors.push('previousSnapshotId must be string or null');
  }

  return {
    path,
    ok: errors.length === 0,
    errors,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    return;
  }

  const asJson = args.includes('--json');
  const root = resolve('.search');
  if (!existsSync(root)) {
    throw new Error('.search directory not found');
  }

  const entries = await readdir(root);
  const baselineFiles = entries
    .filter((name) => /^search-benchmark-pinned-baseline(\..+)?\.json$/i.test(name))
    .map((name) => resolve(root, name))
    .sort();

  if (baselineFiles.length === 0) {
    throw new Error('No search benchmark pinned baseline files found under .search/');
  }

  const results: ValidationResult[] = [];
  for (const path of baselineFiles) {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as PinnedBaseline;
    results.push(validateBaseline(path, parsed));
  }

  const failed = results.filter((r) => !r.ok);
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          ok: failed.length === 0,
          checked: results.length,
          failed: failed.length,
          results,
        },
        null,
        2
      )
    );
  } else {
    for (const result of results) {
      if (result.ok) {
        console.log(`[search:bench:baseline:verify] ok ${result.path}`);
      } else {
        console.log(`[search:bench:baseline:verify] fail ${result.path}`);
        for (const error of result.errors) {
          console.log(`  - ${error}`);
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
