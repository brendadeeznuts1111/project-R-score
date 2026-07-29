// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/api/glob — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * console-format-scan.ts — shared scanner for the console-format ratchet.
 * Single source for patterns + repo scan, consumed by:
 *   scripts/lint-console-format.ts   (pre-commit staged gate + ratchet CLI)
 *   scripts/bake-console-format.ts   (portal board state bake)
 *
 * Rule: structured console output goes through lib/console-depth.ts wrappers
 * (logTable / logDepth / inspectTable / jsonOut), not raw console.table,
 * pretty-JSON dumps, direct Bun.inspect.table, or console.dir.
 * Suppress an intentional machine-output line with `// console-ok`.
 */

export const SCANNED_DIRS = ['lib', 'scripts', 'tools'];

export type ConsoleFormatPatternId =
  | 'console-table'
  | 'pretty-json-console'
  | 'direct-inspect-table'
  | 'console-dir';

export type ConsoleFormatPattern = {
  id: ConsoleFormatPatternId;
  re: RegExp;
  hint: string;
  excludeFiles?: string[];
};

export const CONSOLE_FORMAT_PATTERNS: ConsoleFormatPattern[] = [
  {
    id: 'console-table',
    re: /console\.table\(/,
    hint: 'use logTable(data, columns) from lib/console-depth.ts',
  },
  {
    id: 'pretty-json-console',
    re: /console\.(?:log|info)\(\s*JSON\.stringify\([^)]*,\s*null,\s*\d/,
    hint: 'default human output belongs in logDepth/logTable; machine output goes through jsonOut (or add // console-ok)',
  },
  {
    id: 'direct-inspect-table',
    re: /Bun\.inspect\.table\(/,
    hint: 'use logTable/inspectTable from lib/console-depth.ts (wrapper adds TTY-aware colors + overload safety)',
    excludeFiles: ['lib/console-depth.ts'],
  },
  {
    id: 'console-dir',
    re: /console\.dir\(/,
    hint: 'use logDepth from lib/console-depth.ts (project depth + TTY colors)',
  },
];

export const CONSOLE_FORMAT_SUPPRESS = /\/\/\s*console-ok\b/;

export type ConsoleFormatViolation = {
  file: string;
  line: number;
  id: ConsoleFormatPatternId;
  hint: string;
  text: string;
};

export function isConsoleFormatScannable(path: string): boolean {
  const n = path.replace(/^\.\//, '');
  if (!n.endsWith('.ts')) return false;
  if (n.endsWith('.test.ts') || n.endsWith('.spec.ts') || n.endsWith('.d.ts')) return false;
  return SCANNED_DIRS.some(d => n === d || n.startsWith(`${d}/`));
}

/** Object-key shape: 'Bun.inspect.table': or "console.dir": — data, not a call. */
const OBJECT_KEY = /^\s*['"][^'"]+['"]\s*:/;

/**
 * Line scanner with comment/template/string awareness — doc data, embedded
 * example code, and object keys mention the APIs without being call sites;
 * counting them pins phantom hits in the baseline forever.
 * Heuristic (documented, not a parser): tracks /* *\/ block comments and
 * unescaped-backtick template state; skips // and * comment lines, object
 * keys, and matches inside a quoted run on the same line.
 */
function* scannableLines(text: string): Generator<{ code: string; raw: string; n: number }> {
  let inTemplate = false;
  let inBlockComment = false;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    let out = '';
    let inString: string | null = null;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]!;
      const next = line[j + 1];
      const prev = line[j - 1];
      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          j++;
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
      if (ch === '/' && next === '/') break; // line comment: drop rest
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        j++;
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
      out += ch;
    }
    if (inBlockComment || inTemplate) continue;
    if (trimmed.startsWith('*')) continue; // JSDoc body line
    if (OBJECT_KEY.test(line)) continue;
    yield { code: out, raw: line, n: i + 1 };
  }
}

/** Repo-wide scan of lib/ + scripts/ + tools/ (tests and projects/ excluded). */
export async function scanConsoleFormat(root: string): Promise<ConsoleFormatViolation[]> {
  const violations: ConsoleFormatViolation[] = [];
  for (const dir of SCANNED_DIRS) {
    const glob = new Bun.Glob(`${dir}/**/*.ts`);
    for await (const file of glob.scan({ cwd: root })) {
      if (!isConsoleFormatScannable(file)) continue;
      const text = await Bun.file(`${root}/${file}`).text();
      for (const { code, raw, n } of scannableLines(text)) {
        if (CONSOLE_FORMAT_SUPPRESS.test(raw)) continue;
        for (const p of CONSOLE_FORMAT_PATTERNS) {
          if (p.excludeFiles?.includes(file)) continue;
          if (p.re.test(code)) {
            violations.push({ file, line: n, id: p.id, hint: p.hint, text: raw.trim() });
          }
        }
      }
    }
  }
  return violations;
}

export type ConsoleFormatSummary = {
  total: number;
  byPattern: Record<string, number>;
  files: Record<string, number>;
};

export function summarizeConsoleFormat(violations: ConsoleFormatViolation[]): ConsoleFormatSummary {
  const byPattern: Record<string, number> = {};
  const files: Record<string, number> = {};
  for (const v of violations) {
    byPattern[v.id] = (byPattern[v.id] ?? 0) + 1;
    files[v.file] = (files[v.file] ?? 0) + 1;
  }
  return { total: violations.length, byPattern, files };
}
