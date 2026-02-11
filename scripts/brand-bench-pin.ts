#!/usr/bin/env bun
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { BrandBenchPinnedBaseline, BrandBenchReport } from './lib/brand-bench-types';
import { createShutdown } from './lib/graceful-shutdown';

type Options = {
  fromPath: string;
  outPath: string;
  rationale: string;
};

function parseArgs(argv: string[]): Options {
  const fromPath = resolve(argv.find(a => a.startsWith('--from='))?.split('=')[1] || 'reports/brand-bench/latest.json');
  const outPath = resolve(argv.find(a => a.startsWith('--out='))?.split('=')[1] || 'reports/brand-bench/pinned-baseline.json');
  const rationale = (argv.find(a => a.startsWith('--rationale='))?.split('=')[1] || '').trim();

  if (!rationale) {
    throw new Error('Missing rationale. Pass --rationale="..." when pinning baseline.');
  }

  return { fromPath, outPath, rationale };
}

async function readExisting(path: string): Promise<BrandBenchPinnedBaseline | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as BrandBenchPinnedBaseline;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const report = JSON.parse(await readFile(options.fromPath, 'utf8')) as BrandBenchReport;
  const existing = await readExisting(options.outPath);

  const next: BrandBenchPinnedBaseline = {
    pinnedAt: new Date().toISOString(),
    baselineRunId: report.runId,
    previousBaselineRunId: existing?.baselineRunId || null,
    rationale: options.rationale,
    fromPath: options.fromPath,
    report,
  };

  await mkdir(dirname(options.outPath), { recursive: true });
  await writeFile(options.outPath, JSON.stringify(next, null, 2));
  console.log(JSON.stringify(next, null, 2));
}

if (import.meta.main) {
  const shutdown = createShutdown({ name: 'brand-bench-pin', autoExit: true });
  await main();
  shutdown.dispose();
}
