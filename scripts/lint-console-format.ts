#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/api/glob — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Console-format ratchet: structured console output must go through the
 * lib/console-depth.ts wrappers (logTable / logDepth), not raw
 * `console.table` calls or pretty-JSON dumps (`console.log(JSON.stringify(x, null, N))`).
 *
 *   bun run check:console-format                      # repo-wide ratchet (counts may only go down)
 *   bun scripts/lint-console-format.ts --staged       # ADDED lines only (pre-commit runs this)
 *   bun scripts/lint-console-format.ts --write-baseline   # owners: re-pin after burn-down
 *
 * Scope: lib/ + scripts/ + tools/ *.ts (tests and projects/ excluded — nested
 * products are separate artifacts). Suppress an intentional machine-output
 * line (e.g. a new --json branch) with `// console-ok` on that line.
 *
 * Baseline: scripts/console-format-baseline.json (staged mode ignores it —
 * new code is always held to the rule).
 */
export {};

const ROOT = process.cwd();
const BASELINE_PATH = `${ROOT}/scripts/console-format-baseline.json`;
const WRITE_BASELINE = Bun.argv.includes('--write-baseline');
const STAGED = Bun.argv.includes('--staged');

const SCANNED_DIRS = ['lib', 'scripts', 'tools'];

type PatternId = 'console-table' | 'pretty-json-console';

const PATTERNS: Array<{ id: PatternId; re: RegExp; hint: string }> = [
  {
    id: 'console-table',
    re: /console\.table\(/,
    hint: 'use logTable(data, columns) from lib/console-depth.ts',
  },
  {
    id: 'pretty-json-console',
    re: /console\.(?:log|info)\(\s*JSON\.stringify\([^)]*,\s*null,\s*\d/,
    hint: 'default human output belongs in logDepth/logTable; machine output needs a --json branch (add // console-ok)',
  },
];

const SUPPRESS = /\/\/\s*console-ok\b/;

type Violation = { file: string; line: number; id: PatternId; hint: string; text: string };

function isScannable(path: string): boolean {
  const n = path.replace(/^\.\//, '');
  if (!n.endsWith('.ts')) return false;
  if (n.endsWith('.test.ts') || n.endsWith('.spec.ts') || n.endsWith('.d.ts')) return false;
  return SCANNED_DIRS.some(d => n === d || n.startsWith(`${d}/`));
}

async function repoViolations(): Promise<Violation[]> {
  const violations: Violation[] = [];
  for (const dir of SCANNED_DIRS) {
    const glob = new Bun.Glob(`${dir}/**/*.ts`);
    for await (const file of glob.scan({ cwd: ROOT })) {
      if (!isScannable(file)) continue;
      const text = await Bun.file(`${ROOT}/${file}`).text();
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (SUPPRESS.test(line)) continue;
        for (const p of PATTERNS) {
          if (p.re.test(line)) {
            violations.push({ file, line: i + 1, id: p.id, hint: p.hint, text: line.trim() });
          }
        }
      }
    }
  }
  return violations;
}

/** Violations in added lines of the staged diff (hunk-aware, no baseline). */
async function stagedViolations(): Promise<Violation[]> {
  const proc = Bun.spawn(['git', 'diff', '--cached', '-U0', '--diff-filter=ACM', '--', '*.ts'], {
    cwd: ROOT,
    stdout: 'pipe',
  });
  const diff = await new Response(proc.stdout).text();
  await proc.exited;
  const violations: Violation[] = [];
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
      if (isScannable(file) && !SUPPRESS.test(line)) {
        for (const p of PATTERNS) {
          if (p.re.test(line)) {
            violations.push({ file, line: newLine, id: p.id, hint: p.hint, text: line.trim() });
          }
        }
      }
      newLine++;
    }
  }
  return violations;
}

type Baseline = { total: number; byPattern: Record<string, number>; files: Record<string, number> };

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

const violations = await repoViolations();
const byPattern: Record<string, number> = {};
const files: Record<string, number> = {};
for (const v of violations) {
  byPattern[v.id] = (byPattern[v.id] ?? 0) + 1;
  files[v.file] = (files[v.file] ?? 0) + 1;
}
const total = violations.length;

if (WRITE_BASELINE) {
  const current: Baseline = { total, byPattern, files };
  await Bun.write(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
  console.info(
    `console-format baseline written: ${total} hits (${Object.entries(byPattern)
      .map(([k, n]) => `${k}=${n}`)
      .join(', ')}) across ${Object.keys(files).length} files`
  );
  process.exit(0);
}

let baseline: Baseline = { total: 0, byPattern: {}, files: {} };
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
