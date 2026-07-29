// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/runtime/nodejs-compat#nodetty — process.stdout TTY
/**
 * TTY chrome for monorepo-health CLI.
 *
 * process.stdout: spinner / clear / progress (host TTY control).
 * Bun.inspect / inspect.table: structured dumps (depth + colors via console-depth).
 * Bun.Terminal (lib/terminal.ts): PTY for *child* processes — not host spinners.
 */
import {
  getConsoleDepth,
  inspect,
  inspectTable,
  shouldColor,
  termWidth,
} from '../console-depth.ts';
import type { MonorepoHealthReport } from './monorepo-health.ts';
import type { HealthTrend } from './monorepo-health-history.ts';

/** Minimum Bun runtime for monorepo-health features used here. */
export const MONOREPO_HEALTH_MIN_BUN = '1.3.0';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

export function isInteractiveTty(): boolean {
  return process.stdout.isTTY === true && process.stdin.isTTY === true;
}

export function supportsSpinner(): boolean {
  return process.stderr.isTTY === true && !Bun.env.CI && Bun.env.NO_SPINNER !== '1';
}

export type SpinnerHandle = {
  update: (label: string) => void;
  stop: (finalLabel?: string) => void;
};

/**
 * Host-process spinner on stderr (does not use Bun.Terminal — that is PTY for children).
 * Falls back to plain label lines when not a TTY.
 */
export function startSpinner(label: string): SpinnerHandle {
  if (!supportsSpinner()) {
    process.stderr.write(`… ${label}\n`);
    return {
      update: next => {
        process.stderr.write(`… ${next}\n`);
      },
      stop: finalLabel => {
        if (finalLabel) process.stderr.write(`✓ ${finalLabel}\n`);
      },
    };
  }

  let i = 0;
  let current = label;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const frame = SPINNER_FRAMES[i % SPINNER_FRAMES.length]!;
    i++;
    process.stderr.write(`\r\x1b[K${frame} ${current}`);
  };
  tick();
  const id = setInterval(tick, 80);

  return {
    update: next => {
      current = next;
    },
    stop: finalLabel => {
      if (stopped) return;
      stopped = true;
      clearInterval(id);
      process.stderr.write(`\r\x1b[K✓ ${finalLabel ?? current}\n`);
    },
  };
}

/** Clear scrollback region for watch mode (TTY only). */
export function clearScreen(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[2J\x1b[H');
  }
}

export function checkBunVersion(minRange = `>=${MONOREPO_HEALTH_MIN_BUN}`): {
  ok: boolean;
  version: string;
  message: string;
} {
  const version = Bun.version;
  const ok = Bun.semver.satisfies(version, minRange);
  return {
    ok,
    version,
    message: ok
      ? `Bun ${version} satisfies ${minRange}`
      : `Bun ${version} does not satisfy ${minRange} — upgrade recommended`,
  };
}

export type ToolProbe = { name: string; path: string | null };

/** Probe PATH for tools used by optional collect paths. */
export function probeExternalTools(names: string[] = ['bun', 'git', 'tar']): ToolProbe[] {
  return names.map(name => ({ name, path: Bun.which(name) }));
}

/**
 * Structural JSON schema check for MonorepoHealthReport (no external ajv).
 * Wire-edge parser: returns list of violation messages (empty = ok).
 */
export function parseHealthReportSchemaIssues(value: unknown): string[] {
  const errs: string[] = [];
  if (!value || typeof value !== 'object') {
    return ['report must be an object'];
  }
  const r = value as Record<string, unknown>;
  const num = (k: string) => {
    if (typeof r[k] !== 'number' || !Number.isFinite(r[k] as number)) {
      errs.push(`${k} must be a finite number`);
    }
  };
  const str = (k: string) => {
    if (typeof r[k] !== 'string') errs.push(`${k} must be a string`);
  };
  const bool = (k: string) => {
    if (typeof r[k] !== 'boolean') errs.push(`${k} must be a boolean`);
  };

  str('generatedAt');
  str('root');
  str('bunVersion');
  num('score');
  num('formulaVersion');
  num('fileCount');
  num('largeFileCount');
  num('deadFileCount');
  num('workspacePackageCount');
  bool('testsRun');
  bool('buildRun');

  if (!['healthy', 'needs-improvement', 'critical'].includes(String(r.grade))) {
    errs.push('grade must be healthy | needs-improvement | critical');
  }
  if (!Array.isArray(r.entrypointsUsed)) errs.push('entrypointsUsed must be an array');
  if (!Array.isArray(r.notes)) errs.push('notes must be an array');

  const metrics = r.metrics;
  if (!metrics || typeof metrics !== 'object') {
    errs.push('metrics must be an object');
  } else {
    for (const k of [
      'duplicateDepCount',
      'deadCodePercent',
      'largeFilePercent',
      'testFailureRate',
      'cyclicDependencyCount',
      'testCoveragePercent',
    ]) {
      if (typeof (metrics as Record<string, unknown>)[k] !== 'number') {
        errs.push(`metrics.${k} must be a number`);
      }
    }
  }

  const breakdown = r.breakdown;
  if (!breakdown || typeof breakdown !== 'object') {
    errs.push('breakdown must be an object');
  }

  if (typeof r.score === 'number' && (r.score < 0 || r.score > 100)) {
    errs.push('score must be 0–100');
  }

  return errs;
}

/** @deprecated use parseHealthReportSchemaIssues */
export const validateHealthReportSchema = parseHealthReportSchemaIssues;

/** Preprocess metric rows for Bun.inspect.table (fixed column order + widths via pad). */
export function metricTableRows(
  report: MonorepoHealthReport
): Array<Record<string, string | number>> {
  const rows = [
    {
      Metric: 'duplicateDepCount',
      Value: report.metrics.duplicateDepCount,
      Delta: -report.breakdown.duplicateDepPenalty,
    },
    {
      Metric: 'deadCodePercent',
      Value: Number(report.metrics.deadCodePercent.toFixed(2)),
      Delta: -Number(report.breakdown.deadCodePenalty.toFixed(2)),
    },
    {
      Metric: 'largeFilePercent',
      Value: Number(report.metrics.largeFilePercent.toFixed(2)),
      Delta: -Number(report.breakdown.largeFilePenalty.toFixed(2)),
    },
    {
      Metric: 'testFailureRate',
      Value: Number(report.metrics.testFailureRate.toFixed(2)),
      Delta: -Number(report.breakdown.testFailurePenalty.toFixed(2)),
    },
    {
      Metric: 'cyclicDependencyCount',
      Value: report.metrics.cyclicDependencyCount,
      Delta: -Number(report.breakdown.cyclePenalty.toFixed(2)),
    },
    {
      Metric: 'testCoveragePercent',
      Value: Number(report.metrics.testCoveragePercent.toFixed(2)),
      Delta: `+${report.breakdown.coverageBonus.toFixed(2)}`,
    },
  ] as Array<Record<string, string | number>>;

  // Pad metric names so inspect.table columns stay readable in narrow TTYs (never truncate).
  const w = Math.min(32, Math.max(22, Math.floor(termWidth() / 4)));
  return rows.map(row => ({
    ...row,
    Metric: String(row.Metric).padEnd(w),
  }));
}

export function formatTrendLine(trend: HealthTrend): string {
  if (trend.samples === 0) return 'trend: no history yet';
  const arrow =
    trend.direction === 'up'
      ? '↑'
      : trend.direction === 'down'
        ? '↓'
        : trend.direction === 'flat'
          ? '→'
          : '?';
  const delta =
    trend.delta == null ? 'n/a' : trend.delta > 0 ? `+${trend.delta}` : String(trend.delta);
  return `trend ${arrow} Δ${delta} · n=${trend.samples} · avg ${trend.avgScore ?? '—'} · range [${trend.minScore ?? '—'}…${trend.maxScore ?? '—'}]`;
}

export function printHealthInspect(report: MonorepoHealthReport, depth?: number): void {
  const d = depth ?? getConsoleDepth();
  process.stdout.write(
    Bun.inspect(
      {
        score: report.score,
        grade: report.grade,
        metrics: report.metrics,
        breakdown: report.breakdown,
        fileCount: report.fileCount,
        notes: report.notes.slice(0, 8),
      },
      { depth: d, colors: shouldColor(), sorted: true }
    ) + '\n'
  );
}

export function printMetricTable(report: MonorepoHealthReport): void {
  const rows = metricTableRows(report);
  // inspectTable returns a string — write to stdout for full control
  process.stdout.write(
    inspectTable(rows, ['Metric', 'Value', 'Delta'], { colors: shouldColor() }) + '\n'
  );
}

/**
 * Read a single line from Bun.stdin (interactive). Empty when not a TTY.
 */
export async function promptLine(question: string): Promise<string> {
  if (!process.stdin.isTTY) return '';
  process.stdout.write(question);
  const reader = Bun.stdin.stream().getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      if (buf.includes('\n') || buf.includes('\r')) break;
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
  return buf.replace(/\r?\n.*/, '').trim();
}

export async function sleepMs(ms: number): Promise<void> {
  await Bun.sleep(ms);
}

/** Re-export inspect helper for CLI dumps. */
export { inspect };
