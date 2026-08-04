// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
/**
 * Typed Claim/Evidence reporter — Bun-first stdout (`Bun.write` · `Bun.argv`).
 *
 * Domain checkers (e.g. color-kernel) build a {@link ClaimReport}; this module
 * prints human paste or `--json` and optionally fail-closes via `process.exit`.
 */

export type ClaimStatus = 'pass' | 'fail';

export type ClaimEnv = 'test' | 'ci' | 'development';

export type ClaimCheck = {
  /** Stable machine id (e.g. `chrome.darkTokens`). */
  id: string; // brand-ok — opaque check identifier, not a domain entity id
  description: string;
  /** Floor / expected count (minimum unless domain docs say otherwise). */
  expected: number;
  actual: number;
  passed: boolean;
  /** `expected - actual` (positive ⇒ shortfall vs floor). */
  diff: number;
  details?: {
    missing?: string[];
    extra?: string[];
  };
};

export type ClaimReport = {
  claim: string;
  timestamp: string;
  status: ClaimStatus;
  checks: ClaimCheck[];
  meta: {
    env: ClaimEnv;
    source: string;
    version: string;
  };
};

export type ClaimReporterOptions = {
  /** Defaults to `Bun.argv`. */
  argv?: readonly string[];
  /** Human paste formatter (domain-specific). */
  formatHuman?: (report: ClaimReport) => string;
  /**
   * Exit 1 when `status === 'fail'`.
   * Default: true (fail-closed). Pass false when importing for inspection only.
   * `--strict` forces true; `--no-strict` forces false.
   */
  exitOnFail?: boolean;
};

function defaultHuman(report: ClaimReport): string {
  const lines = [`Claim: ${report.claim}`, `Status: ${report.status.toUpperCase()}`, 'Evidence:'];
  for (const check of report.checks) {
    const icon = check.passed ? '✓' : '✗';
    lines.push(
      `  ${icon} ${check.description}: ${check.actual}/${check.expected} (diff: ${check.diff})`
    );
    if (check.details?.missing?.length) {
      lines.push(`     Missing: ${check.details.missing.join(', ')}`);
    }
    if (check.details?.extra?.length) {
      lines.push(`     Extra: ${check.details.extra.join(', ')}`);
    }
  }
  lines.push(`Meta: version ${report.meta.version} | ${report.meta.env} | ${report.meta.source}`);
  return lines.join('\n');
}

export function resolveClaimEnv(argv: readonly string[] = Bun.argv): ClaimEnv {
  if (argv.includes('--ci') || Bun.env.CI === 'true' || Bun.env.CI === '1') return 'ci';
  if (Bun.env.NODE_ENV === 'test' || Bun.env.BUN_ENV === 'test') return 'test';
  return 'development';
}

export function mkFloorCheck(
  id: string, // brand-ok — opaque check identifier, not a domain entity id
  description: string,
  expectedMin: number,
  actual: number,
  details?: ClaimCheck['details']
): ClaimCheck {
  const passed = actual >= expectedMin;
  return {
    id,
    description,
    expected: expectedMin,
    actual,
    passed,
    diff: expectedMin - actual,
    ...(details ? { details } : {}),
  };
}

/**
 * Write ClaimReport to stdout (JSON or human) and optionally `process.exit(1)`.
 * Returns the same report for chaining / tests.
 */
export async function createClaimReporter(
  report: ClaimReport,
  opts: ClaimReporterOptions = {}
): Promise<ClaimReport> {
  const argv = opts.argv ?? Bun.argv;
  const isJson = argv.includes('--json');
  const formatHuman = opts.formatHuman ?? defaultHuman;

  let exitOnFail = opts.exitOnFail !== false;
  if (argv.includes('--no-strict')) exitOnFail = false;
  if (argv.includes('--strict')) exitOnFail = true;

  if (isJson) {
    await Bun.write(Bun.stdout, `${JSON.stringify(report, null, 2)}\n`);
  } else {
    await Bun.write(Bun.stdout, `${formatHuman(report)}\n`);
  }

  if (exitOnFail && report.status === 'fail') {
    process.exit(1);
  }

  return report;
}
