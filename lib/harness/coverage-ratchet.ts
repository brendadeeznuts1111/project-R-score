// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/guides/test/coverage-threshold — coverage thresholds
// @see https://bun.com/docs/test/code-coverage — Bun test --coverage
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Code-coverage ratchet for the harness surface (lib/harness).
 *
 * Runs a fixed probe suite with `bun test --coverage`, parses the text table,
 * and fails if lib/harness aggregate lines/funcs fall below coverage-baseline.json.
 *
 * @see ./code-quality.ts
 * @see ./coverage-baseline.json
 */
import { joinPath } from '../path-bun';

export type CoverageTotals = {
  funcsPct: number;
  linesPct: number;
};

export type CoverageBaseline = {
  minLinesPct: number;
  minFuncsPct: number;
  scope: string;
  probe: string;
};

/** Cheap tests that exercise lib/harness without live spine proofs / WebView. */
export const HARNESS_COVERAGE_PROBE = [
  'tests/harness-coverage-probe.test.ts',
  'tests/spine-tenants.test.ts',
  'tests/harness-cron-contract.test.ts',
] as const;

export async function loadCoverageBaseline(root: string): Promise<CoverageBaseline> {
  const path = joinPath(root, 'lib/harness/coverage-baseline.json');
  const raw = (await Bun.file(path).json()) as CoverageBaseline;
  if (typeof raw.minLinesPct !== 'number' || typeof raw.minFuncsPct !== 'number') {
    throw new Error(`invalid coverage baseline at ${path}`);
  }
  return raw;
}

/** Parse Bun `--coverage-reporter=text` aggregate row. */
export function parseCoverageTotals(text: string): CoverageTotals | undefined {
  const m = text.match(/All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/);
  if (!m) return undefined;
  return { funcsPct: Number(m[1]), linesPct: Number(m[2]) };
}

export async function runHarnessCoverageProbe(
  root: string
): Promise<{ totals: CoverageTotals; stdout: string }> {
  const proc = Bun.spawn(
    ['bun', 'test', '--coverage', '--coverage-reporter=text', ...HARNESS_COVERAGE_PROBE],
    { cwd: root, stdout: 'pipe', stderr: 'pipe' }
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const combined = `${stdout}\n${stderr}`;
  if (code !== 0) {
    throw new Error(`coverage probe tests failed (exit ${code})\n${combined.slice(-2000)}`);
  }
  const totals = parseCoverageTotals(combined);
  if (!totals) {
    throw new Error(`could not parse coverage totals from probe output`);
  }
  return { totals, stdout: combined };
}

/** Fail closed: harness coverage ≥ baseline floors. */
export async function assertHarnessCoverageBaseline(root: string): Promise<string[]> {
  const baseline = await loadCoverageBaseline(root);
  const { totals } = await runHarnessCoverageProbe(root);
  const failures: string[] = [];
  if (totals.linesPct < baseline.minLinesPct) {
    failures.push(
      `lib/harness lines ${totals.linesPct}% < floor ${baseline.minLinesPct}% (${baseline.probe})`
    );
  }
  if (totals.funcsPct < baseline.minFuncsPct) {
    failures.push(
      `lib/harness funcs ${totals.funcsPct}% < floor ${baseline.minFuncsPct}% (${baseline.probe})`
    );
  }
  if (failures.length === 0) {
    console.info(
      `✅ coverage ratchet · lines ${totals.linesPct}% · funcs ${totals.funcsPct}% ` +
        `(floors ${baseline.minLinesPct}/${baseline.minFuncsPct})`
    );
  }
  return failures;
}
