#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-18 · https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/hashing — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/transpiler — Bun.Transpiler.scanImports
import { mkdir } from 'node:fs/promises'; // eslint-disable-line no-restricted-imports -- Bun has no directory-creation API
import { buildFileRemovalReport } from '../lib/harness/file-removal-inventory.ts';
import { jsonOut, logTable } from '../lib/console-depth.ts';
import type {
  FileRemovalReport,
  RemovalAction,
  RemovalVerdict,
} from '../lib/harness/file-removal-types.ts';
import { dirnamePath, joinPath, normalizePath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');
const DEFAULT_REPORT = 'reports/file-removal-candidates.json';

type CliOptions = {
  json: boolean;
  writePath: string | null;
  limit: number;
  verdict: RemovalVerdict | null;
  action: RemovalAction | null;
  largeLineThreshold: number;
  largeByteThreshold: number;
  duplicateByteThreshold: number;
};

function positiveInteger(raw: string, flag: string): number {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`${flag} requires a positive integer`);
  return value;
}

export function parseFileRemovalArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    json: false,
    writePath: null,
    limit: 40,
    verdict: null,
    action: null,
    largeLineThreshold: 200,
    largeByteThreshold: 256 * 1024,
    duplicateByteThreshold: 4 * 1024,
  };
  const verdicts = new Set<RemovalVerdict>([
    'protected',
    'retain',
    'review',
    'safe-review',
    'very-safe-review',
  ]);
  const actions = new Set<RemovalAction>([
    'retain',
    'split',
    'deduplicate',
    'wire-or-remove',
    'verify-generator',
  ]);
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]!;
    if (arg === '--json') options.json = true;
    else if (arg === '--write') options.writePath = DEFAULT_REPORT;
    else if (arg.startsWith('--write=')) options.writePath = arg.slice('--write='.length);
    else if (arg === '--limit') options.limit = positiveInteger(argv[++index] ?? '', arg);
    else if (arg === '--min-lines')
      options.largeLineThreshold = positiveInteger(argv[++index] ?? '', arg);
    else if (arg === '--min-bytes')
      options.largeByteThreshold = positiveInteger(argv[++index] ?? '', arg);
    else if (arg === '--min-duplicate-bytes') {
      options.duplicateByteThreshold = positiveInteger(argv[++index] ?? '', arg);
    } else if (arg === '--verdict') {
      const value = argv[++index] as RemovalVerdict | undefined;
      if (!value || !verdicts.has(value))
        throw new Error(`${arg} requires ${[...verdicts].join('|')}`);
      options.verdict = value;
    } else if (arg === '--action') {
      const value = argv[++index] as RemovalAction | undefined;
      if (!value || !actions.has(value))
        throw new Error(`${arg} requires ${[...actions].join('|')}`);
      options.action = value;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else throw new Error(`unknown option: ${arg}`);
  }
  if (options.writePath) {
    const normalized = normalizePath(options.writePath);
    if (!normalized.startsWith('reports/'))
      throw new Error('--write path must stay under reports/');
    options.writePath = normalized;
  }
  return options;
}

function printHelp(): void {
  console.info(`Usage: bun run files:rate-removal -- [options]

Advisory only: grades evidence and writes no source changes. There is no delete mode.

  --json                       print complete JSON report
  --write[=reports/name.json]  save content-addressed evidence under reports/
  --limit N                    human rows to show (default 40)
  --verdict NAME               filter human rows by verdict
  --action NAME                filter human rows by recommended action
  --min-lines N                large text threshold (default 200)
  --min-bytes N                large byte threshold (default 262144)
  --min-duplicate-bytes N      exact-duplicate floor (default 4096)`);
}

function humanReport(report: FileRemovalReport, options: CliOptions): void {
  const s = report.summary;
  console.info(
    `file-removal · ${s.filesScanned} files · ${s.candidates} candidates · ` +
      `${s.duplicateGroups} duplicate groups · ${s.exactDuplicateBytes} theoretical bytes · ` +
      `${s.ownershipScopedDuplicateBytes} owner-scoped bytes · ` +
      `${s.safeReviewDuplicateBytes} safe-review bytes`
  );
  console.info('advisoryOnly=true · autoDeleteAllowed=false');
  const rows = report.candidates
    .filter(
      row =>
        (!options.verdict || row.verdict === options.verdict) &&
        (!options.action || row.action === options.action)
    )
    .slice(0, options.limit)
    .map(row => ({
      verdict: row.verdict,
      score: row.removalConfidence,
      action: row.action,
      bytes: row.bytes,
      lines: row.lines ?? '—',
      refs: row.inboundReferences.length + row.importedBy.length,
      owner: row.ownership.boundary,
      path: row.path,
    }));
  logTable(rows);
}

async function main(): Promise<void> {
  const options = parseFileRemovalArgs(Bun.argv.slice(2));
  const report = await buildFileRemovalReport(ROOT, options);
  if (options.writePath) {
    const absolute = joinPath(ROOT, options.writePath);
    await mkdir(dirnamePath(absolute), { recursive: true });
    await Bun.write(absolute, `${JSON.stringify(report, null, 2)}\n`);
    console.error(`[files:rate-removal] wrote ${options.writePath}`);
  }
  if (options.json) jsonOut(report);
  else humanReport(report, options);
}

if (import.meta.main) {
  await main().catch(error => {
    console.error(`[files:rate-removal] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
