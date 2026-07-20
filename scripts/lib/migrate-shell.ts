// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Phase 8 shell rewrites (child_process → Bun.$ / Bun.spawn).
 *
 * @see https://bun.com/docs/runtime/shell — Bun.$
 * @see https://bun.com/docs/runtime/child-process — Bun.spawn
 */
import { resolve } from 'node:path';
import { VALIDATE_WHITELIST, type UsageHit } from '../bun-migrate.ts';

const REPO_ROOT = resolve(import.meta.dir, '../..');

export const SHELL_APPLY_SKIP = VALIDATE_WHITELIST;

export type ShellApplyResult = {
  file: string;
  changes: string[];
  before: string;
  after: string;
  skipped?: string;
};

function isCatalogOrSampleLine(line: string): boolean {
  if (/pattern:\s*['"]/.test(line)) return true;
  if (/examples:\s*\[/.test(line)) return true;
  if (/example:\s*["'`]/.test(line)) return true;
  if (/^\s*['"].*\b(child_process|execSync|spawn)\b/.test(line)) return true;
  if (/\bnode:\s*\[/.test(line)) return true;
  if (/require\s*\(\s*['"]child_process['"]\s*\)/.test(line) && /`/.test(line)) return true;
  return false;
}

function mapCodeLines(source: string, map: (line: string) => string): string {
  return source
    .split('\n')
    .map(line => (isCatalogOrSampleLine(line) ? line : map(line)))
    .join('\n');
}

function mapStdioOptions(text: string): string {
  return text.replace(
    /stdio:\s*\[\s*['"]pipe['"]\s*,\s*['"]pipe['"]\s*,\s*['"]pipe['"]\s*\]/g,
    "stdout: 'pipe', stderr: 'pipe', stdin: 'pipe'"
  );
}

function ensureShellImports(text: string, changes: string[]): string {
  const needsDollar = changes.some(c => c.includes('Bun.$') || c.includes('$`'));
  const hasDollar = /\bimport\s*\{[^}]*\$[^}]*\}\s*from\s*['"]bun['"]/.test(text);
  if (needsDollar && !hasDollar) {
    const imp = "import { $ } from 'bun';\n";
    if (text.startsWith('#!')) {
      const nl = text.indexOf('\n');
      return text.slice(0, nl + 1) + imp + text.slice(nl + 1);
    }
    return imp + text;
  }
  return text;
}

function stripChildProcessImports(text: string): string {
  const drop = new Set(['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'fork']);
  let out = text.replace(
    /^import\s*\{([^}]+)\}\s*from\s*['"](?:node:)?child_process['"]\s*;?\s*$/gm,
    (full, body: string) => {
      const kept = body
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .filter(n => {
          const base = n.replace(/\s+as\s+\w+$/, '').trim();
          if (!drop.has(base)) return true;
          const rest = text.replace(full, '');
          return new RegExp(`\\b${base}\\b`).test(rest);
        });
      if (kept.length === 0) return '';
      return `import { ${kept.join(', ')} } from 'child_process';`;
    }
  );
  out = out
    .replace(/^import\s+[^;{\n]*\s+from\s+['"](?:node:)?child_process['"]\s*;?\s*\n/gm, '')
    .replace(/^import\s*\*\s*as\s+\w+\s*from\s*['"](?:node:)?child_process['"]\s*;?\s*\n/gm, '');
  return out;
}

function ensureSpawnSee(text: string, changes: string[]): string {
  if (!changes.some(c => c.includes('spawn') || c.includes('Bun.$'))) return text;
  if (text.includes('bun.com/docs/runtime/child-process')) return text;
  const see = '// @see https://bun.com/docs/runtime/child-process — Bun.spawn\n';
  if (text.startsWith('#!')) {
    const nl = text.indexOf('\n');
    return text.slice(0, nl + 1) + see + text.slice(nl + 1);
  }
  const lines = text.split('\n');
  let end = 0;
  if (lines[0]?.startsWith('#!')) end = 1;
  while (end < lines.length && /^\s*(?:\/\/|\/\*|\*|$)/.test(lines[end] ?? '')) end++;
  lines.splice(end, 0, see.trimEnd());
  return lines.join('\n');
}

/** Mechanical child_process → Bun shell/spawn replacements. */
export function applyShellTransforms(source: string): { text: string; changes: string[] } {
  let text = source;
  const changes: string[] = [];

  {
    const before = text;
    text = text.replace(/\(Bun as Record<string, unknown>\)\.spawnSync/g, 'Bun.spawnSync');
    text = text.replace(/\(Bun as Record<string, unknown>\)\.spawn/g, 'Bun.spawn');
    if (text !== before) changes.push('cast-Bun.spawn→Bun.spawn');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line.replace(
        /execSync\s*\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,\s*\{\s*encoding:\s*['"]utf-?8['"]\s*\}\s*\)\.trim\(\)/g,
        'new TextDecoder().decode(Bun.spawnSync(["sh", "-c", $1]).stdout).trim()'
      )
    );
    text = mapCodeLines(text, line =>
      line.replace(
        /execSync\s*\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,\s*\{\s*stdio:\s*['"]inherit['"]\s*\}\s*\)/g,
        'Bun.spawnSync(["sh", "-c", $1], { stdout: "inherit", stderr: "inherit", stdin: "inherit" })'
      )
    );
    text = mapCodeLines(text, line =>
      line.replace(
        /execSync\s*\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,\s*\{\s*encoding:\s*['"]utf-?8['"]\s*\}\s*\)/g,
        'new TextDecoder().decode(Bun.spawnSync(["sh", "-c", $1]).stdout)'
      )
    );
    if (text !== before) changes.push('execSync→Bun.spawnSync');
  }

  {
    const before = text;
    text = mapCodeLines(text, line => line.replace(/(?<![.\w])spawnSync\s*\(/g, 'Bun.spawnSync('));
    if (text !== before) changes.push('spawnSync→Bun.spawnSync');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line.replace(/(?<![.\w])spawn\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,/g, 'Bun.spawn([$1, ...$2],')
    );
    text = mapCodeLines(text, line =>
      line.replace(/(?<![.\w])spawn\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'Bun.spawn([$1, ...$2])')
    );
    text = mapCodeLines(text, line =>
      line.replace(/(?<![.\w])spawn\s*\(\s*\[([^\]]+)\]/g, 'Bun.spawn([$1]')
    );
    text = mapCodeLines(text, line => line.replace(/(?<![.\w])spawn\s*\(/g, 'Bun.spawn('));
    text = mapStdioOptions(text);
    if (text !== before) changes.push('spawn→Bun.spawn');
  }

  {
    const before = text;
    text = mapCodeLines(text, line => line.replace(/(?<![.\w])fork\s*\(/g, "Bun.spawn(['bun', "));
    if (text !== before) changes.push('fork→Bun.spawn');
  }

  {
    const before = text;
    text = mapCodeLines(text, line => line.replace(/(?<![.\w])execFile\s*\(/g, 'Bun.spawn('));
    if (text !== before) changes.push('execFile→Bun.spawn');
  }

  text = stripChildProcessImports(text);
  if (text !== source && !/from\s+['"](?:node:)?child_process['"]/.test(text)) {
    changes.push('strip-child_process-imports');
  }

  text = ensureShellImports(text, changes);
  text = ensureSpawnSee(text, changes);

  return { text, changes };
}

export async function applyShellSection(opts: {
  hits: UsageHit[];
  write: boolean;
}): Promise<ShellApplyResult[]> {
  const byFile = new Map<string, UsageHit[]>();
  for (const h of opts.hits) {
    if (h.migrateSection !== 'shell') continue;
    if (SHELL_APPLY_SKIP.has(h.file)) continue;
    const list = byFile.get(h.file) ?? [];
    list.push(h);
    byFile.set(h.file, list);
  }

  const results: ShellApplyResult[] = [];

  for (const [file, fileHits] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const abs = resolve(REPO_ROOT, file);
    const before = await Bun.file(abs).text();
    const { text: after, changes } = applyShellTransforms(before);

    if (changes.length === 0) {
      results.push({
        file,
        changes: [],
        before,
        after: before,
        skipped: `no-safe-rewrite (${fileHits.map(h => h.nodePattern).join(', ')})`,
      });
      continue;
    }

    if (after === before) {
      results.push({ file, changes, before, after, skipped: 'transform-no-op' });
      continue;
    }

    if (opts.write) await Bun.write(abs, after);
    results.push({ file, changes, before, after });
  }

  return results;
}
