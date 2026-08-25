#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/environment-variables
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Console-format ratchet: structured console output must go through the
 * lib/console-depth.ts wrappers (logTable / logDepth), not raw
 * `console.table` calls, pretty-JSON dumps (`console.log(JSON.stringify(x, null, N))`),
 * direct `Bun.inspect.table` (bypasses the wrapper's TTY colors + overload safety),
 * or `console.dir`.
 *
 *   bun run check:console-format                      # repo-wide ratchet (counts may only go down)
 *   bun scripts/lint-console-format.ts --staged       # ADDED lines only (pre-commit runs this)
 *   bun scripts/lint-console-format.ts --write-baseline   # owners: re-pin after burn-down
 *
 * Ratchet mode scans the git index tree (HEAD ∪ staged, via
 * scripts/lib/index-tree.ts) — NOT the worktree — so another lane's
 * uncommitted dirty files can never fail your commit. Re-pins likewise
 * record the committed state, not local dirt.
 *
 * Scope: lib/ + scripts/ + tools/ *.ts (tests and projects/ excluded — nested
 * products are separate artifacts). Suppress an intentional machine-output
 * line (e.g. a new --json branch) with `// console-ok` on that line.
 *
 * Baseline: scripts/console-format-baseline.json (staged mode ignores it —
 * new code is always held to the rule).
 *
 * Test-console policy: config/console/test-direct-console-baseline.json keeps
 * the small, intentional legacy test output surface visible. New direct
 * console calls must use an inline `// test-console-ok: <reason>` marker.
 * The only update workflow writes a review-only candidate (never the pinned
 * baseline): `CONSOLE_TEST_BASELINE_UPDATE=confirm bun scripts/lint-console-format.ts`.
 *
 * Scanner SSOT: lib/console-format-scan.ts (shared with scripts/bake-console-format.ts).
 */
import {
  CONSOLE_FORMAT_PATTERNS,
  CONSOLE_FORMAT_SUPPRESS,
  isConsoleFormatScannable,
  scanConsoleFormat,
  summarizeConsoleFormat,
  type ConsoleFormatSummary,
} from '../lib/console-format-scan.ts';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import {
  buildTestConsoleBaselineCandidate,
  scanTestConsole,
  summarizeLegacyTestConsole,
  validateTestConsoleBaseline,
  type TestConsoleBaseline,
} from './lib/console-test-ratchet.ts';
import { stagedConsoleFormatViolations } from './lib/console-staged-violations.ts';
import { withIndexTree } from './lib/index-tree.ts';

export {
  buildTestConsoleBaselineCandidate,
  isSpecificTestConsoleReason,
  scanTestConsoleSource,
  validateTestConsoleBaseline,
  type TestConsoleBaseline,
} from './lib/console-test-ratchet.ts';

const ROOT = process.cwd();
const BASELINE_PATH = `${ROOT}/scripts/console-format-baseline.json`;
const TEST_BASELINE_PATH = 'config/console/test-direct-console-baseline.json';
const TEST_BASELINE_CANDIDATE_PATH = 'config/console/test-direct-console-baseline.candidate.json';
const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('check:console-format', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const WRITE_BASELINE = argv.includes('--write-baseline');
const STAGED = argv.includes('--staged');
const TEST_BASELINE_UPDATE = Bun.env.CONSOLE_TEST_BASELINE_UPDATE === 'confirm';

async function testConsoleTree(
  root: string
): Promise<{ calls: TestConsoleCall[]; baseline: TestConsoleBaseline }> {
  return withIndexTree(
    ['tests', 'config/console'],
    async dir => ({
      calls: await scanTestConsole(dir),
      baseline: await Bun.file(`${dir}/${TEST_BASELINE_PATH}`).json(),
    }),
    root
  );
}

async function testConsoleCallsFromIndex(root: string): Promise<TestConsoleCall[]> {
  return withIndexTree(['tests'], dir => scanTestConsole(dir), root);
}

async function runTestConsoleRatchet(root: string): Promise<boolean> {
  const { calls, baseline } = await testConsoleTree(root);
  const failures = validateTestConsoleBaseline(calls, baseline);
  if (failures.length === 0) {
    console.info(
      `✅ test-console: ${summarizeLegacyTestConsole(calls).size} legacy file(s); new calls require test-console-ok`
    );
    return true;
  }
  console.error('❌ test-console: unapproved direct console call(s) in tests');
  for (const failure of failures) console.error(`   ${failure}`);
  console.error(
    '   add // test-console-ok: <specific reason>, or create a reviewed candidate with:'
  );
  console.error('   CONSOLE_TEST_BASELINE_UPDATE=confirm bun scripts/lint-console-format.ts');
  return false;
}

async function writeTestConsoleBaselineCandidate(root: string): Promise<void> {
  const calls = await testConsoleCallsFromIndex(root);
  const candidate = buildTestConsoleBaselineCandidate(calls);
  const output = `${root}/${TEST_BASELINE_CANDIDATE_PATH}`;
  await Bun.write(output, `${JSON.stringify(candidate, null, 2)}\n`);
  console.info(`test-console candidate written: ${TEST_BASELINE_CANDIDATE_PATH}`);
  console.info(
    'Review each TODO reason, then manually update the pinned baseline; this command never changes it.'
  );
}

async function main(): Promise<void> {
  if (TEST_BASELINE_UPDATE) {
    await writeTestConsoleBaselineCandidate(ROOT);
    return;
  }

  if (STAGED) {
    const violations = await stagedConsoleFormatViolations(ROOT);
    if (violations.length > 0) {
      console.error('❌ console-format: raw structured output in staged lines');
      for (const v of violations) {
        console.error(`   ${v.file}:${v.line}  [${v.id}] ${v.text}`);
        console.error(`      → ${v.hint}`);
      }
      console.error('   suppress intentional machine output with: // console-ok');
      process.exit(1);
    }
    if (!(await runTestConsoleRatchet(ROOT))) process.exit(1);
    return;
  }

  const { total, byPattern, files, violations } = await withIndexTree(
    ['lib', 'scripts', 'tools'],
    async dir => {
      const found = await scanConsoleFormat(dir);
      return { ...summarizeConsoleFormat(found), violations: found };
    }
  );

  if (WRITE_BASELINE) {
    const current: ConsoleFormatSummary = { total, byPattern, files };
    await Bun.write(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
    console.info(
      `console-format baseline written: ${total} hits (${Object.entries(byPattern)
        .map(([k, n]) => `${k}=${n}`)
        .join(', ')}) across ${Object.keys(files).length} files`
    );
    return;
  }

  let baseline: ConsoleFormatSummary = { total: 0, byPattern: {}, files: {} };
  try {
    baseline = { ...baseline, ...(await Bun.file(BASELINE_PATH).json()) };
  } catch {
    console.error('missing scripts/console-format-baseline.json — run with --write-baseline');
    process.exit(1);
  }

  const failed = total > baseline.total;
  if (failed) {
    console.error(
      `❌ console-format hits grew: ${total} > baseline ${baseline.total} — convert to logTable/logDepth or re-pin`
    );
    for (const v of violations) {
      if ((baseline.files[v.file] ?? 0) < files[v.file]!) {
        console.error(`   ${v.file}:${v.line}  [${v.id}] ${v.text}`);
      }
    }
    process.exit(1);
  }
  console.info(
    `✅ console-format: ${total} hit(s) (baseline ${baseline.total}; ${
      Object.entries(byPattern)
        .map(([k, n]) => `${k}=${n}`)
        .join(', ') || 'clean'
    })`
  );
  if (!(await runTestConsoleRatchet(ROOT))) process.exit(1);
}

if (import.meta.main) await main();
