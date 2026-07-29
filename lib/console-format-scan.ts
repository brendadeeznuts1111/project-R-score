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

/** Repo-wide scan of lib/ + scripts/ + tools/ (tests and projects/ excluded). */
export async function scanConsoleFormat(root: string): Promise<ConsoleFormatViolation[]> {
  const violations: ConsoleFormatViolation[] = [];
  for (const dir of SCANNED_DIRS) {
    const glob = new Bun.Glob(`${dir}/**/*.ts`);
    for await (const file of glob.scan({ cwd: root })) {
      if (!isConsoleFormatScannable(file)) continue;
      const text = await Bun.file(`${root}/${file}`).text();
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (CONSOLE_FORMAT_SUPPRESS.test(line)) continue;
        for (const p of CONSOLE_FORMAT_PATTERNS) {
          if (p.excludeFiles?.includes(file)) continue;
          if (p.re.test(line)) {
            violations.push({ file, line: i + 1, id: p.id, hint: p.hint, text: line.trim() });
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
