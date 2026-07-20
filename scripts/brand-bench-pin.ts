#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
import { dirname } from 'path';
import { ensureDir, readText, writeText, resolvePath } from './lib/fs-bun';
import type { BrandBenchPinnedBaseline, BrandBenchReport } from './lib/brand-bench-types';
import { createShutdown } from './lib/graceful-shutdown';

type Options = {
  fromPath: string;
  outPath: string;
  rationale: string;
};

function parseArgs(argv: string[]): Options {
  const fromPath = resolvePath(
    argv.find(a => a.startsWith('--from='))?.split('=')[1] || 'reports/brand-bench/latest.json'
  );
  const outPath = resolvePath(
    argv.find(a => a.startsWith('--out='))?.split('=')[1] ||
      'reports/brand-bench/pinned-baseline.json'
  );
  const rationale = (argv.find(a => a.startsWith('--rationale='))?.split('=')[1] || '').trim();

  if (!rationale) {
    throw new Error('Missing rationale. Pass --rationale="..." when pinning baseline.');
  }

  return { fromPath, outPath, rationale };
}

async function readExisting(path: string): Promise<BrandBenchPinnedBaseline | null> {
  try {
    return JSON.parse(await readText(path)) as BrandBenchPinnedBaseline;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));
  const report = JSON.parse(await readText(options.fromPath)) as BrandBenchReport;
  const existing = await readExisting(options.outPath);

  const next: BrandBenchPinnedBaseline = {
    pinnedAt: new Date().toISOString(),
    baselineRunId: report.runId,
    previousBaselineRunId: existing?.baselineRunId || null,
    rationale: options.rationale,
    fromPath: options.fromPath,
    report,
  };

  await ensureDir(dirname(options.outPath));
  await writeText(options.outPath, JSON.stringify(next, null, 2));
  console.info(JSON.stringify(next, null, 2));
}

if (import.meta.main) {
  const shutdown = createShutdown({ name: 'brand-bench-pin', autoExit: true });
  await main();
  shutdown.dispose();
}
