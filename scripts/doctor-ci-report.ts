#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Portal doctor CI report — one process: plain log + JSON artifact + step summary.
 *
 *   bun scripts/doctor-ci-report.ts
 *   bun scripts/doctor-ci-report.ts --out reports/portal-doctor-ci.json
 *   bun run portal:doctor:ci:report
 *
 * Env:
 *   GITHUB_STEP_SUMMARY — when set, append concise markdown forensics
 *
 * Exit: report.ok ? 0 : 1
 *
 * Matches portal:doctor:ci: env=ci · skip live Access · no bake write · plain CI text.
 *
 * @see tools/lib/portal-cli-doctor.ts
 * @see docs/UNIFIED.md
 */

import { dirnamePath, ensureDir, resolvePath } from './lib/fs-bun.ts';
import {
  formatPortalDoctorPlain,
  runPortalDoctor,
  type PortalDoctorCheck,
  type PortalDoctorReport,
} from '../tools/lib/portal-cli-doctor.ts';

export const DEFAULT_REPORT_REL = 'reports/portal-doctor-ci.json';

export type DoctorCiReportOpts = {
  cwd?: string;
  outPath?: string;
  /**
   * Process-like env for machine bunfig / BUN_INSTALL_* probes (default Bun.env).
   * Distinct from doctor --env ci (envScope filter).
   */
  machineEnv?: Record<string, string | undefined>;
  /** When true, skip writing GITHUB_STEP_SUMMARY even if env is set. */
  noSummary?: boolean;
  /** When true, skip writing JSON report file. */
  noJson?: boolean;
  /**
   * When true, do not print plain doctor text / report path lines
   * (library callers / tests). CLI main leaves this false.
   */
  quiet?: boolean;
};

function parseArgs(argv: string[]): DoctorCiReportOpts {
  let outPath: string | undefined;
  let noSummary = false;
  let noJson = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--help' || a === '-h') {
      console.log(`Usage: bun scripts/doctor-ci-report.ts [options]

  --out <path>   JSON report path (default: ${DEFAULT_REPORT_REL})
  --no-summary   Do not write GITHUB_STEP_SUMMARY
  --no-json      Do not write JSON report file
  --help         Show this help

Env: GITHUB_STEP_SUMMARY — append markdown when set.
Exit: 0 when doctor ok, 1 on fatal failure.
`);
      process.exit(0);
    }
    if (a === '--no-summary') {
      noSummary = true;
      continue;
    }
    if (a === '--no-json') {
      noJson = true;
      continue;
    }
    if (a === '--out' && argv[i + 1]) {
      outPath = argv[++i];
      continue;
    }
    if (a.startsWith('--out=')) {
      outPath = a.slice('--out='.length);
      continue;
    }
    // Positional out path (optional)
    if (!a.startsWith('-') && outPath == null) {
      outPath = a;
      continue;
    }
    console.error(`Unknown arg: ${a}`);
    process.exit(2);
  }
  return { outPath, noSummary, noJson };
}

function resolveOutPath(cwd: string, outPath?: string): string {
  const rel = outPath?.trim() || DEFAULT_REPORT_REL;
  return rel.startsWith('/') ? rel : resolvePath(cwd, rel);
}

/** Concise markdown for GitHub Actions job summary. */
export function formatDoctorStepSummary(report: PortalDoctorReport): string {
  const s = report.summary;
  const result = report.ok ? 'ok' : 'fail';
  const lines: string[] = [
    '## Portal doctor (CI)',
    '',
    `| Field | Value |`,
    `| --- | --- |`,
    `| result | \`${result}\` |`,
    `| checks passed | ${s.passed}/${s.checkCount} |`,
    `| checks failed | ${s.failed} |`,
    `| fatal_failed | ${s.failedFatal} |`,
    `| warn_failed | ${s.failedWarn} |`,
    `| schema | ${report.schemaVersion} |`,
    `| env | ${report.env ?? 'all'} |`,
    `| liveAccess | ${report.liveAccess ? 'yes' : 'no'} |`,
    '',
  ];

  const fails = report.checks.filter((c: PortalDoctorCheck) => !c.ok);
  if (fails.length === 0) {
    lines.push('_No failing checks._');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('### FAIL checks');
  lines.push('');
  for (const c of fails) {
    lines.push(`- **\`${c.id}\`** (\`${c.level}\` · ${c.group}) — ${c.message}`);
    if (c.fixCommand) {
      lines.push(`  - fix: \`${c.fixCommand}\``);
    }
  }
  lines.push('');

  if (s.suggested.length > 0) {
    lines.push('### Suggested fixes');
    lines.push('');
    for (const cmd of s.suggested) {
      lines.push(`- \`${cmd}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function writeDoctorCiReport(
  report: PortalDoctorReport,
  opts: DoctorCiReportOpts = {}
): Promise<{ jsonPath?: string; summaryWritten: boolean }> {
  const cwd = opts.cwd ?? process.cwd();
  let jsonPath: string | undefined;
  let summaryWritten = false;

  if (!opts.noJson) {
    jsonPath = resolveOutPath(cwd, opts.outPath);
    await ensureDir(dirnamePath(jsonPath));
    // Bun.write creates intermediate dirs; ensureDir is belt-and-suspenders
    await Bun.write(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (!opts.noSummary) {
    const summaryPath = Bun.env.GITHUB_STEP_SUMMARY;
    if (summaryPath && summaryPath.length > 0) {
      const md = formatDoctorStepSummary(report);
      const existing = (await Bun.file(summaryPath).exists())
        ? await Bun.file(summaryPath).text()
        : '';
      const sep = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
      await Bun.write(summaryPath, `${existing}${sep}${md}`);
      summaryWritten = true;
    }
  }

  return { jsonPath, summaryWritten };
}

export async function runDoctorCiReport(opts: DoctorCiReportOpts = {}): Promise<{
  report: PortalDoctorReport;
  exitCode: number;
  jsonPath?: string;
  summaryWritten: boolean;
  plain: string;
}> {
  const cwd = opts.cwd ?? process.cwd();
  const report = await runPortalDoctor({
    cwd,
    env: 'ci',
    skipLiveAccess: true,
    format: 'plain',
    machineEnv: opts.machineEnv,
  });

  const plain = formatPortalDoctorPlain(report);
  // Plain CI stdout (same shape as portal:doctor:ci without TTY chrome)
  if (!opts.quiet) {
    console.log(plain);
  }

  const written = await writeDoctorCiReport(report, { ...opts, cwd });
  if (!opts.quiet) {
    if (written.jsonPath) {
      console.log(`report  ${written.jsonPath}`);
    }
    if (written.summaryWritten) {
      console.log('summary  GITHUB_STEP_SUMMARY updated');
    }
  }

  return {
    report,
    exitCode: report.ok ? 0 : 1,
    jsonPath: written.jsonPath,
    summaryWritten: written.summaryWritten,
    plain,
  };
}

async function main(): Promise<number> {
  const opts = parseArgs(Bun.argv.slice(2));
  const { exitCode } = await runDoctorCiReport(opts);
  return exitCode;
}

if (import.meta.main) {
  process.exit(await main());
}
