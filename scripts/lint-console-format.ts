#!/usr/bin/env bun
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
  stripConsoleFormatLine,
  summarizeConsoleFormat,
  type ConsoleFormatSummary,
  type ConsoleFormatViolation,
} from '../lib/console-format-scan.ts';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { withIndexTree } from './lib/index-tree.ts';

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

const TEST_CONSOLE_CALL =
  /\bconsole\.(log|info|warn|error|debug|table|dir|trace|assert|time|timeEnd|timeLog|group|groupEnd|groupCollapsed|count|countReset|clear|profile|profileEnd)\s*\(/;
const TEST_CONSOLE_ALLOW = /\/\/\s*test-console-ok:\s*(\S.*)$/;

export type TestConsoleCall = {
  file: string;
  line: number;
  method: string;
  text: string;
  allowReason?: string;
  invalidAllowReason?: string;
};

export type TestConsoleBaselineEntry = {
  file: string;
  count: number;
  reason: string;
};

export type TestConsoleBaseline = {
  schemaVersion: 1;
  entries: TestConsoleBaselineEntry[];
};

/** Keep one-word acknowledgements from turning into a blanket exemption. */
export function isSpecificTestConsoleReason(reason: string): boolean {
  return reason.trim().length >= 16 && reason.trim().split(/\s+/).length >= 3;
}

/** Scan actual test call sites; quoted fixture source and comments are ignored. */
export function scanTestConsoleSource(file: string, text: string): TestConsoleCall[] {
  const calls: TestConsoleCall[] = [];
  let inTemplate = false;
  let inBlockComment = false;
  for (const [index, raw] of text.split('\n').entries()) {
    let code = '';
    let inString: string | null = null;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i]!;
      const next = raw[i + 1];
      const prev = raw[i - 1];
      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          i++;
        }
        continue;
      }
      if (inTemplate) {
        if (ch === '`' && prev !== '\\') inTemplate = false;
        continue;
      }
      if (inString) {
        if (ch === inString && prev !== '\\') inString = null;
        continue;
      }
      if (ch === '/' && next === '/') break;
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      if (ch === '`') {
        inTemplate = true;
        continue;
      }
      if (ch === "'" || ch === '"') {
        inString = ch;
        continue;
      }
      code += ch;
    }
    const match = TEST_CONSOLE_CALL.exec(code);
    if (!match) continue;
    const marker = TEST_CONSOLE_ALLOW.exec(raw);
    const markerReason = marker?.[1]?.trim();
    calls.push({
      file,
      line: index + 1,
      method: match[1]!,
      text: raw.trim(),
      ...(markerReason && isSpecificTestConsoleReason(markerReason)
        ? { allowReason: markerReason }
        : markerReason
          ? { invalidAllowReason: markerReason }
          : {}),
    });
  }
  return calls;
}

export function summarizeLegacyTestConsole(calls: TestConsoleCall[]): Map<string, number> {
  const summary = new Map<string, number>();
  for (const call of calls) {
    if (call.allowReason) continue;
    summary.set(call.file, (summary.get(call.file) ?? 0) + 1);
  }
  return summary;
}

export function validateTestConsoleBaseline(
  calls: TestConsoleCall[],
  baseline: TestConsoleBaseline
): string[] {
  const failures: string[] = [];
  const expected = new Map<string, number>();
  for (const call of calls) {
    if (call.invalidAllowReason) {
      failures.push(`${call.file}:${call.line} test-console-ok needs a specific reason`);
    }
  }
  for (const entry of baseline.entries) {
    if (!entry.file || !Number.isInteger(entry.count) || entry.count < 1) {
      failures.push(`invalid baseline entry for ${entry.file || '(missing file)'}`);
      continue;
    }
    if (!entry.reason.trim() || entry.reason.startsWith('TODO:')) {
      failures.push(`baseline entry ${entry.file} needs a specific non-TODO reason`);
      continue;
    }
    if (expected.has(entry.file)) failures.push(`baseline has duplicate entry for ${entry.file}`);
    expected.set(entry.file, entry.count);
  }
  const actual = summarizeLegacyTestConsole(calls);
  for (const [file, count] of actual) {
    const allowed = expected.get(file) ?? 0;
    if (count > allowed)
      failures.push(
        `${file}: ${count} unannotated direct console call(s), baseline allows ${allowed}`
      );
  }
  return failures;
}

export function buildTestConsoleBaselineCandidate(calls: TestConsoleCall[]): TestConsoleBaseline {
  return {
    schemaVersion: 1,
    entries: [...summarizeLegacyTestConsole(calls)]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, count]) => ({
        file,
        count,
        reason: 'TODO: explain why this legacy test requires direct console output',
      })),
  };
}

async function scanTestConsole(root: string): Promise<TestConsoleCall[]> {
  const calls: TestConsoleCall[] = [];
  for (const suffix of ['test.ts', 'spec.ts']) {
    const glob = new Bun.Glob(`tests/**/*.${suffix}`);
    for await (const file of glob.scan({ cwd: root })) {
      calls.push(...scanTestConsoleSource(file, await Bun.file(`${root}/${file}`).text()));
    }
  }
  return calls;
}

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

/** Violations in added lines of the staged diff (hunk-aware, no baseline). */
async function stagedViolations(): Promise<ConsoleFormatViolation[]> {
  const proc = Bun.spawn(['git', 'diff', '--cached', '-U0', '--diff-filter=ACM', '--', '*.ts'], {
    cwd: ROOT,
    stdout: 'pipe',
  });
  const diff = await new Response(proc.stdout).text();
  await proc.exited;
  const violations: ConsoleFormatViolation[] = [];
  let file = '';
  let newLine = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ b/')) {
      file = raw.slice('+++ b/'.length);
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      const line = raw.slice(1);
      if (isConsoleFormatScannable(file) && !CONSOLE_FORMAT_SUPPRESS.test(line)) {
        const code = stripConsoleFormatLine(line);
        if (code !== null) {
          for (const p of CONSOLE_FORMAT_PATTERNS) {
            if (p.excludeFiles?.includes(file)) continue;
            if (p.re.test(code)) {
              violations.push({ file, line: newLine, id: p.id, hint: p.hint, text: line.trim() });
            }
          }
        }
      }
      newLine++;
    }
  }
  return violations;
}

async function main(): Promise<void> {
  if (TEST_BASELINE_UPDATE) {
    await writeTestConsoleBaselineCandidate(ROOT);
    return;
  }

  if (STAGED) {
    const violations = await stagedViolations();
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
