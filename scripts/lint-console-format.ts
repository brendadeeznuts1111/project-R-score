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
const argv = applyUnknownLongOptionGuardFor('check:console-format', Bun.argv.slice(2));
const WRITE_BASELINE = argv.includes('--write-baseline');
const STAGED = argv.includes('--staged');

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
  process.exit(0);
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
  process.exit(0);
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
