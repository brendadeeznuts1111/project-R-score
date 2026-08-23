// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/api/glob — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/console#object-inspection-depth — prefer logDepth / inspect (not raw console.log depth)
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — prefer inspectTable / logTable
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
 *
 * Policy SSOT: ./console-depth.ts · note: ./console-depth.md · hub: ./bun-runtime.md
 * Canonical depth docs: https://bun.com/docs/runtime/console#object-inspection-depth
 */

export const SCANNED_DIRS = ['lib', 'scripts', 'tools'];

export type ConsoleFormatPatternId =
  | 'console-table'
  | 'pretty-json-console'
  | 'direct-inspect-table'
  | 'console-dir'
  | 'console-object-dump';

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
    hint: 'use logTable(data, columns) from lib/console (or lib/console-depth.ts)',
  },
  {
    id: 'pretty-json-console',
    re: /console\.(?:log|info)\(\s*JSON\.stringify\([^)]*,\s*null,\s*\d/,
    hint: 'default human output: logDepth/logTable/cliOut; machine: jsonOut or cliOut({ json: true }) (// console-ok)',
  },
  {
    id: 'direct-inspect-table',
    re: /Bun\.inspect\.table\(/,
    hint: 'use logTable/inspectTable from lib/console (TTY colors + overload safety)',
    excludeFiles: ['lib/console-depth.ts'],
  },
  {
    id: 'console-dir',
    re: /console\.dir\(/,
    hint: 'use logDepth / cliOut from lib/console (project depth + TTY colors)',
  },
  {
    // Object-literal dumps, or bare dump-shaped identifiers (data/result/report/…).
    // Omits HELP/line/text string printers and array `[...].join` FPs.
    id: 'console-object-dump',
    re: /console\.(?:log|info)\(\s*(?:\{|(?:data|result|report|payload|obj|object|netReport|routeReport)\s*\))/,
    hint: 'use logDepth / cliOut / statusLine from lib/console (// console-ok to suppress)',
    excludeFiles: ['lib/console-depth.ts', 'lib/console/index.ts'],
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
 * Stateless per-line code extraction for the staged (diff) path, where
 * cross-line template/comment state is unavailable. Returns `null` for
 * comment/JSDoc-body/object-key lines, else the line with // comments,
 * strings, and same-line template literals stripped. Multi-line templates
 * remain an edge case (suppress with // console-ok).
 */
export function stripConsoleFormatLine(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.startsWith('*')) return null; // JSDoc body line
  if (OBJECT_KEY.test(line)) return null;
  let out = '';
  let inString: string | null = null;
  let inTemplate = false;
  for (let j = 0; j < line.length; j++) {
    const ch = line[j]!;
    const next = line[j + 1];
    const prev = line[j - 1];
    if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false;
      continue;
    }
    if (inString) {
      if (ch === inString && prev !== '\\') inString = null;
      continue;
    }
    if (ch === '/' && next === '/') break; // line comment: drop rest
    if (ch === '/' && next === '*') break; // block comment start: drop rest (stateless)
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
  return out;
}

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
