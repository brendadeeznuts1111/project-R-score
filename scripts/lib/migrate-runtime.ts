// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Phase 9 runtime rewrites (process.env → Bun.env, which, inspect, hrtime).
 *
 * @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
 * @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
 * @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
 * @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
 * @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
 */
import { VALIDATE_WHITELIST, type UsageHit } from '../bun-migrate.ts';
import { resolvePath } from './fs-bun';

const REPO_ROOT = resolvePath(import.meta.dir, '../..');

export const RUNTIME_APPLY_SKIP = VALIDATE_WHITELIST;

export type RuntimeApplyResult = {
  file: string;
  changes: string[];
  before: string;
  after: string;
  skipped?: string;
};

function isCatalogOrSampleLine(line: string): boolean {
  if (/pattern:\s*['"]/.test(line)) return true;
  if (/examples?:\s*\[/.test(line)) return true;
  if (/example:\s*["'`]/.test(line)) return true;
  if (/^\s*['"].*\b(process\.env|util\.inspect|which)\b/.test(line)) return true;
  if (/\bnode:\s*\[|\bbun:\s*\[/.test(line)) return true;
  if (/code:\s*`/.test(line) && /process\.env/.test(line)) return true;
  if (/note:\s*['"]/.test(line) && /process\.env/.test(line)) return true;
  if (/name:\s*['"]process\.env['"]/.test(line)) return true;
  return false;
}

function mapCodeLines(source: string, map: (line: string) => string): string {
  return source
    .split('\n')
    .map(line => (isCatalogOrSampleLine(line) ? line : map(line)))
    .join('\n');
}

function stripUnusedImports(text: string): string {
  let out = text;

  // Drop which package imports when Bun.which is used and which() isn't
  if (/\bBun\.which\b/.test(out) && !/(?<!Bun\.)\bwhich\s*\(/.test(out)) {
    out = out
      .replace(/^import\s+which\s+from\s+['"]which['"]\s*;?\s*\n/gm, '')
      .replace(/^import\s*\{[^}]*\bwhich\b[^}]*\}\s*from\s*['"]which['"]\s*;?\s*\n/gm, '')
      .replace(/^const\s+which\s*=\s*require\s*\(\s*['"]which['"]\s*\)\s*;?\s*\n/gm, '');
  }

  // Drop util.inspect-only imports
  if (/\bBun\.inspect\b/.test(out) && !/(?<!Bun\.)\binspect\s*\(/.test(out)) {
    out = out.replace(
      /^import\s*\{([^}]+)\}\s*from\s*['"](?:node:)?util['"]\s*;?\s*$/gm,
      (full, body: string) => {
        const kept = body
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .filter(n => {
            const base = n.replace(/\s+as\s+\w+$/, '').trim();
            return base !== 'inspect';
          });
        if (kept.length === 0) return '';
        return `import { ${kept.join(', ')} } from 'util';`;
      }
    );
  }

  return out;
}

function ensureRuntimeSee(text: string, changes: string[]): string {
  const sees: string[] = [];
  if (changes.some(c => c.includes('Bun.env')) && !text.includes('bun-env')) {
    sees.push('// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env');
  }
  if (changes.some(c => c.includes('Bun.which')) && !text.includes('bun-which')) {
    sees.push('// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which');
  }
  if (changes.some(c => c.includes('Bun.inspect')) && !text.includes('bun-inspect')) {
    sees.push('// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect');
  }
  if (changes.some(c => c.includes('nanoseconds')) && !text.includes('bun-nanoseconds')) {
    sees.push('// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds');
  }
  if (sees.length === 0) return text;

  const lines = text.split('\n');
  let end = 0;
  if (lines[0]?.startsWith('#!')) end = 1;
  while (end < lines.length && /^\s*(?:\/\/|\/\*|\*|$)/.test(lines[end] ?? '')) end++;
  lines.splice(end, 0, ...sees);
  return lines.join('\n');
}

/** Mechanical Node runtime → Bun-native replacements. */
export function applyRuntimeTransforms(source: string): { text: string; changes: string[] } {
  let text = source;
  const changes: string[] = [];

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(/\bglobalThis\.process\.env\b/g, 'Bun.env')
        .replace(/\bprocess\.env\b/g, 'Bun.env')
    );
    if (text !== before) changes.push('process.env→Bun.env');
  }

  {
    const before = text;
    text = mapCodeLines(text, line => line.replace(/\butil\.inspect\s*\(/g, 'Bun.inspect('));
    // Named import inspect from util — rewrite call sites only when util import present
    if (
      /from\s+['"](?:node:)?util['"]/.test(source) ||
      /require\s*\(\s*['"](?:node:)?util['"]/.test(source)
    ) {
      text = mapCodeLines(text, line =>
        line
          .replace(
            /(?<![.\w])inspect\s*\(\s*([^,)]+)\s*\)/g,
            'Bun.inspect($1, { colors: true, depth: 4 })'
          )
          .replace(/(?<![.\w])inspect\s*\(\s*([^,]+?)\s*,\s*\{/g, 'Bun.inspect($1, {')
      );
    }
    if (text !== before) changes.push('util.inspect→Bun.inspect');
  }

  {
    const hasWhichPkg =
      /from\s+['"]which['"]/.test(source) || /require\s*\(\s*['"]which['"]\s*\)/.test(source);
    const hasBunWhichImport = /\{[^}]*\bwhich\b[^}]*\}\s*from\s*['"]bun['"]/.test(source);
    if (hasWhichPkg && !hasBunWhichImport) {
      const before = text;
      text = mapCodeLines(text, line => {
        if (/\bBun\.which\b/.test(line)) return line;
        return line.replace(/(?<![.\w])which\s*\(/g, 'Bun.which(');
      });
      if (text !== before) changes.push('which→Bun.which');
    }
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(/\bprocess\.hrtime\.bigint\s*\(\s*\)/g, 'BigInt(Bun.nanoseconds())')
        .replace(/\bprocess\.hrtime\s*\(\s*\)/g, 'Bun.nanoseconds()')
    );
    if (text !== before) changes.push('process.hrtime→Bun.nanoseconds');
  }

  const beforeStrip = text;
  text = stripUnusedImports(text);
  if (text !== beforeStrip) changes.push('strip-runtime-imports');

  text = ensureRuntimeSee(text, changes);
  return { text, changes };
}

export async function applyRuntimeSection(opts: {
  hits: UsageHit[];
  write: boolean;
}): Promise<RuntimeApplyResult[]> {
  const byFile = new Map<string, UsageHit[]>();
  for (const h of opts.hits) {
    if (h.migrateSection !== 'runtime') continue;
    if (RUNTIME_APPLY_SKIP.has(h.file)) continue;
    const list = byFile.get(h.file) ?? [];
    list.push(h);
    byFile.set(h.file, list);
  }

  const results: RuntimeApplyResult[] = [];

  for (const [file, fileHits] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const abs = resolvePath(REPO_ROOT, file);
    const before = await Bun.file(abs).text();
    const { text: after, changes } = applyRuntimeTransforms(before);

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
