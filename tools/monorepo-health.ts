#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#terminal-pty-support — Bun.Terminal
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Monorepo health score CLI (0–100).
 *
 *   bun tools/monorepo-health.ts
 *   bun tools/monorepo-health.ts --json
 *   bun tools/monorepo-health.ts --no-build
 *   bun tools/monorepo-health.ts --with-tests
 *   bun tools/monorepo-health.ts --with-coverage
 *   bun tools/monorepo-health.ts --archive
 *   bun tools/monorepo-health.ts --watch --interval=30
 *   bun tools/monorepo-health.ts --interactive
 *   bun tools/monorepo-health.ts --inspect
 *   bun run monorepo:health
 *
 * Formula + collect: lib/harness/monorepo-health.ts
 * Host TTY chrome: process.stdout/stderr (spinners). Child PTY: lib/terminal.ts (Bun.Terminal).
 */
import {
  collectMonorepoHealth,
  writeMonorepoHealthArtifacts,
  type MonorepoHealthReport,
} from '../lib/harness/monorepo-health.ts';
import { appendHealthHistory, type HealthTrend } from '../lib/harness/monorepo-health-history.ts';
import {
  checkBunVersion,
  clearScreen,
  formatTrendLine,
  printHealthInspect,
  printMetricTable,
  probeExternalTools,
  promptLine,
  sleepMs,
  startSpinner,
  parseHealthReportSchemaIssues,
} from '../lib/harness/monorepo-health-ui.ts';
import { getConsoleDepth } from '../lib/console-depth.ts';

const argv = process.argv.slice(2);

function flag(name: string): boolean {
  return argv.includes(name);
}

function flagValue(name: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = argv.indexOf(name);
  if (i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith('-')) return argv[i + 1];
  return undefined;
}

const asJson = flag('--json');
const noBuild = flag('--no-build');
const withTests = flag('--with-tests');
const withCoverage = flag('--with-coverage');
const archive = flag('--archive');
const watch = flag('--watch');
const interactive = flag('--interactive') || flag('-i');
const inspectMode = flag('--inspect');
const noHistory = flag('--no-history');
const validateOnly = flag('--validate');
const help = flag('--help') || flag('-h');
const intervalSec = Math.max(5, Number(flagValue('--interval') ?? '30') || 30);

function printHelp(): void {
  process.stdout.write(`Usage: bun tools/monorepo-health.ts [options]

  --json              print report JSON only (no spinner / tables)
  --no-build          skip Bun.build metafile (dead code / cycles)
  --with-tests        focused bun test sample for failure rate
  --with-coverage     tests + bun --coverage; parse All-files line %
  --archive           tar report via Bun.Archive when available
  --watch             re-run every --interval seconds (TTY clear)
  --interval=N        watch interval seconds (default 30, min 5)
  --interactive, -i   after run, prompt for apply-ish follow-ups
  --inspect           also dump metrics via Bun.inspect (depth/colors)
  --no-history        skip SQLite history / trend
  --validate PATH     validate an existing report JSON schema and exit
  --help, -h          this message

I/O model:
  · process.stdout / stderr  — tables, spinner, watch chrome
  · Bun.inspect / .table     — structured dumps (BUN_CONSOLE_DEPTH)
  · Bun.Terminal             — PTY for child processes only (lib/terminal.ts)
  · bun:sqlite               — reports/monorepo-health-history.sqlite trends

Health = 100 − 2·dupDeps − 0.5·dead% − 1·large% − 5·testFail% − 1.5·cycles + 0.2·coverage%
Target ≥ 90 (healthy). Critical grade exits 1.
`);
}

if (help) {
  printHelp();
  process.exit(0);
}

if (validateOnly) {
  const path = flagValue('--validate') ?? argv[argv.indexOf('--validate') + 1];
  if (!path) {
    process.stderr.write('--validate requires a path\n');
    process.exit(2);
  }
  const raw = await Bun.file(path).json();
  const errs = parseHealthReportSchemaIssues(raw);
  if (errs.length) {
    process.stderr.write(`schema invalid (${errs.length}):\n`);
    for (const e of errs) process.stderr.write(`  · ${e}\n`);
    process.exit(1);
  }
  process.stdout.write(`schema ok · ${path}\n`);
  process.exit(0);
}

const bunCheck = checkBunVersion();
if (!bunCheck.ok) {
  process.stderr.write(`⚠ ${bunCheck.message}\n`);
}

async function runOnce(): Promise<{
  report: MonorepoHealthReport;
  jsonPath: string;
  archivePath?: string;
  trend?: HealthTrend;
  historyPath?: string;
  schemaErrors: string[];
}> {
  const spinner = asJson ? null : startSpinner('scanning monorepo…');
  try {
    spinner?.update('collect metrics (glob · deps · graph)…');
    const report = await collectMonorepoHealth({
      withBuild: !noBuild,
      withTests: withTests || withCoverage,
      withCoverage,
    });
    spinner?.update('write artifacts…');
    const { jsonPath, archivePath } = await writeMonorepoHealthArtifacts(report, {
      archive,
    });
    const schemaErrors = parseHealthReportSchemaIssues(report);
    let trend: HealthTrend | undefined;
    let historyPath: string | undefined;
    if (!noHistory) {
      spinner?.update('append SQLite history…');
      const hist = await appendHealthHistory(report);
      trend = hist.trend;
      historyPath = hist.historyPath;
    }
    spinner?.stop(`score ${report.score}/100 · ${report.grade}`);
    return { report, jsonPath, archivePath, trend, historyPath, schemaErrors };
  } catch (e) {
    spinner?.stop('failed');
    throw e;
  }
}

function printHuman(
  r: MonorepoHealthReport,
  jsonPath: string,
  archivePath: string | undefined,
  trend: HealthTrend | undefined,
  historyPath: string | undefined,
  schemaErrors: string[]
): void {
  process.stdout.write(`\n🧭 Monorepo health · Bun ${r.bunVersion} · depth=${getConsoleDepth()}\n`);
  process.stdout.write(`   score ${r.score}/100 · ${r.grade} · formula v${r.formulaVersion}\n`);
  process.stdout.write(
    `   files ${r.fileCount} · workspaces ${r.workspacePackageCount} · large ${r.largeFileCount}\n`
  );
  if (r.entrypointsUsed.length) {
    process.stdout.write(
      `   entrypoints ${r.entrypointsUsed.map(e => e.replace(r.root + '/', '')).join(', ')}\n`
    );
  }

  printMetricTable(r);

  if (trend) {
    process.stdout.write(`\n${formatTrendLine(trend)}\n`);
    if (historyPath) process.stdout.write(`   history ${historyPath}\n`);
  }

  if (inspectMode) {
    process.stdout.write('\ninspect:\n');
    printHealthInspect(r);
  }

  const tools = probeExternalTools(['bun', 'git', 'tar']);
  const missing = tools.filter(t => !t.path);
  if (missing.length) {
    process.stdout.write(
      `\ntools missing on PATH: ${missing.map(t => t.name).join(', ')} (Bun.which)\n`
    );
  }

  if (schemaErrors.length) {
    process.stdout.write(`\nschema warnings:\n`);
    for (const e of schemaErrors) process.stdout.write(`  · ${e}\n`);
  }

  if (r.notes.length) {
    process.stdout.write('\nnotes:\n');
    for (const n of r.notes) process.stdout.write(`  · ${n}\n`);
  }
  process.stdout.write(`\n→ ${jsonPath}\n`);
  if (archivePath) process.stdout.write(`→ ${archivePath}\n`);
  process.stdout.write('\n');
}

async function runInteractive(report: MonorepoHealthReport): Promise<void> {
  if (!process.stdin.isTTY) {
    process.stderr.write('interactive requires a TTY\n');
    return;
  }
  process.stdout.write(`
Interactive actions:
  [r] re-run collect
  [c] re-run with --with-coverage
  [i] Bun.inspect dump
  [t] show trend line again
  [q] quit
`);
  while (true) {
    const ans = (await promptLine('health> ')).toLowerCase();
    if (!ans || ans === 'q' || ans === 'quit' || ans === 'exit') break;
    if (ans === 'i') {
      printHealthInspect(report);
      continue;
    }
    if (ans === 't') {
      process.stdout.write('(re-run to refresh trend; use without --no-history)\n');
      continue;
    }
    if (ans === 'r' || ans === 'c') {
      const spinner = startSpinner(ans === 'c' ? 'collect + coverage…' : 'collect…');
      try {
        const next = await collectMonorepoHealth({
          withBuild: !noBuild,
          withTests: true,
          withCoverage: ans === 'c' || withCoverage,
        });
        spinner.stop(`score ${next.score}/100`);
        printMetricTable(next);
        report = next;
        if (!noHistory) await appendHealthHistory(next);
      } catch (e) {
        spinner.stop('failed');
        process.stderr.write(String(e) + '\n');
      }
      continue;
    }
    process.stdout.write('unknown command — r|c|i|t|q\n');
  }
}

// --- main ---
if (watch) {
  process.stdout.write(`watch mode · interval ${intervalSec}s · Ctrl+C to stop\n`);

  while (true) {
    clearScreen();
    process.stdout.write(
      `🧭 monorepo:health watch · ${new Date().toISOString()} · every ${intervalSec}s\n`
    );
    try {
      const result = await runOnce();
      if (asJson) {
        process.stdout.write(JSON.stringify(result.report, null, 2) + '\n');
      } else {
        printHuman(
          result.report,
          result.jsonPath,
          result.archivePath,
          result.trend,
          result.historyPath,
          result.schemaErrors
        );
      }
      if (result.report.grade === 'critical') process.exitCode = 1;
      else process.exitCode = 0;
    } catch (e) {
      process.stderr.write(`watch iteration failed: ${e}\n`);
      process.exitCode = 1;
    }
    await sleepMs(intervalSec * 1000);
  }
} else {
  const result = await runOnce();
  if (asJson) {
    process.stdout.write(JSON.stringify(result.report, null, 2) + '\n');
  } else {
    printHuman(
      result.report,
      result.jsonPath,
      result.archivePath,
      result.trend,
      result.historyPath,
      result.schemaErrors
    );
  }
  if (interactive && !asJson) {
    await runInteractive(result.report);
  }
  if (result.report.grade === 'critical') process.exitCode = 1;
  if (result.schemaErrors.length && asJson) {
    // still emit JSON but fail closed if schema broken (should not happen for live collect)
    process.exitCode = process.exitCode || 1;
  }
}
