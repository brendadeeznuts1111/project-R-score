#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * bake-console-format.ts — bake console-format ratchet state →
 * public/registry/console-format-state.json (portal board + CI trend).
 *
 *   bun run console-format:bake            # write state JSON
 *   bun run console-format:bake -- --check # fail when hits exceed the pinned baseline
 *
 * State = current scan summary (lib/console-format-scan.ts SSOT) vs the pinned
 * baseline (scripts/console-format-baseline.json), per-pattern breakdown, and
 * the top offender files. Values only — no secrets.
 */
import {
  scanConsoleFormat,
  summarizeConsoleFormat,
  type ConsoleFormatSummary,
} from '../lib/console-format-scan.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('console-format:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ROOT = process.cwd();
const BASELINE_PATH = `${ROOT}/scripts/console-format-baseline.json`;
const OUT_PATH = `${ROOT}/public/registry/console-format-state.json`;
const CHECK = argv.includes('--check');

const violations = await scanConsoleFormat(ROOT);
const current = summarizeConsoleFormat(violations);

let baseline: ConsoleFormatSummary = { total: 0, byPattern: {}, files: {} };
let baselineError: string | null = null;
try {
  baseline = { ...baseline, ...(await Bun.file(BASELINE_PATH).json()) };
} catch (e) {
  baselineError = e instanceof Error ? e.message : String(e);
}

const topFiles = Object.entries(current.files)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .map(([file, hits]) => ({
    file,
    hits,
    baseline: baseline.files[file] ?? 0,
  }));

const gateOk = baselineError === null && current.total <= baseline.total;

const state = {
  kind: 'console-format-state',
  schemaVersion: 1,
  bakedAt: new Date().toISOString(),
  gate: gateOk ? 'pass' : 'fail',
  current,
  baseline: baselineError ? null : { total: baseline.total, byPattern: baseline.byPattern },
  baselineError,
  deltaVsBaseline: baselineError ? null : current.total - baseline.total,
  topFiles,
  patterns: [
    { id: 'console-table', rule: 'no raw console.table — use logTable' },
    { id: 'pretty-json-console', rule: 'no pretty-JSON console dumps — use jsonOut / logDepth' },
    {
      id: 'direct-inspect-table',
      rule: 'no direct Bun.inspect.table — use logTable / inspectTable',
    },
    { id: 'console-dir', rule: 'no console.dir — use logDepth' },
  ],
  links: {
    scanner: 'lib/console-format-scan.ts',
    ratchet: 'scripts/lint-console-format.ts',
    baseline: 'scripts/console-format-baseline.json',
    wrappers: 'lib/console-depth.ts',
  },
};

await Bun.write(OUT_PATH, `${JSON.stringify(state, null, 2)}\n`);
console.info(
  `console-format-state.json baked: ${current.total} hits (baseline ${baseline.total}, gate ${state.gate})`
);

if (CHECK && !gateOk) {
  console.error(
    baselineError
      ? `❌ baseline unreadable: ${baselineError}`
      : `❌ console-format hits exceed baseline: ${current.total} > ${baseline.total}`
  );
  process.exit(1);
}
