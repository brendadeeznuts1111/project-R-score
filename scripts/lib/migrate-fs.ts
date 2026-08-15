// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
/**
 * Phase 7 fs rewrites for bun-migrate apply.
 *
 * @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
 * @see https://bun.com/docs/guides/read-file/exists — Bun.file().exists()
 */
import { resolvePath } from './fs-bun';
import { VALIDATE_WHITELIST, type UsageHit } from './migrate-phases.ts';

const REPO_ROOT = resolvePath(import.meta.dir, '../..');

export const FS_APPLY_SKIP = VALIDATE_WHITELIST;

export type FsApplyResult = {
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
  if (/^\s*['"].*\b(readFile|writeFile|existsSync|node:fs)\b/.test(line)) return true;
  if (/\bexampleCode\b|\bnode:\s*\[/.test(line)) return true;
  if (/script:\s*\|/.test(line)) return true;
  if (/github-script/.test(line)) return true;
  if (/import fs from 'node:fs'/.test(line) && /template/.test(line)) return true;
  return false;
}

function isMethodDefinition(line: string): boolean {
  return /^\s*(?:static\s+|public\s+|private\s+|protected\s+)?(?:async\s+)?(?:readFile|writeFile)\s*\(/.test(
    line
  );
}

function mapCodeLines(source: string, map: (line: string) => string): string {
  return source
    .split('\n')
    .map(line => {
      if (isCatalogOrSampleLine(line) || isMethodDefinition(line)) return line;
      if (/from\s+['"]bun:fs['"]/.test(line) || /\bbun:fs\b/.test(line)) return line;
      return map(line);
    })
    .join('\n');
}

function fsImportPath(fileRel: string): string {
  const depth = fileRel.split('/').length - 1;
  if (fileRel.startsWith('scripts/')) return './lib/fs-bun';
  const up = '../'.repeat(depth);
  return `${up}scripts/lib/fs-bun`;
}

function ensureFsBunImport(text: string, fileRel: string, names: string[]): string {
  if (names.length === 0) return text;
  const from = fsImportPath(fileRel);
  const re = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"][^'"]*fs-bun['"]`);
  if (re.test(text)) {
    return text.replace(re, (_m, body: string) => {
      const existing = body
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const set = new Set([...existing, ...names]);
      return `import { ${[...set].sort().join(', ')} } from '${from}'`;
    });
  }
  const imp = `import { ${names.sort().join(', ')} } from '${from}';\n`;
  if (text.startsWith('#!')) {
    const nl = text.indexOf('\n');
    return text.slice(0, nl + 1) + imp + text.slice(nl + 1);
  }
  return imp + text;
}

function stripUnusedFsImports(text: string): string {
  const drop = new Set([
    'readFileSync',
    'writeFileSync',
    'existsSync',
    'readFile',
    'writeFile',
    'appendFile',
    'appendFileSync',
    'unlink',
    'unlinkSync',
    'rename',
    'renameSync',
  ]);
  let out = text.replace(
    /^import\s*\{([^}]+)\}\s*from\s*['"](?:node:)?fs(?:\/promises)?['"]\s*;?\s*$/gm,
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
      const mod = full.includes('promises') ? 'node:fs/promises' : 'node:fs';
      return `import { ${kept.join(', ')} } from '${mod}';`;
    }
  );
  out = out
    .replace(/^import\s+[^;{\n]*\s+from\s+['"](?:node:)?fs(?:\/promises)?['"]\s*;?\s*\n/gm, '')
    .replace(/^import\s*\*\s*as\s+fs\s+from\s+['"](?:node:)?fs['"]\s*;?\s*\n/gm, '')
    .replace(/^import\s+fs\s+from\s+['"](?:node:)?fs['"]\s*;?\s*\n/gm, '');
  return out;
}

function ensureFileIoSee(text: string, changes: string[]): string {
  if (
    !changes.some(c => c.includes('Bun.file') || c.includes('Bun.write') || c.includes('fs-bun'))
  ) {
    return text;
  }
  if (text.includes('bun.com/docs/runtime/file-io')) return text;
  const see = '// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write\n';
  if (text.startsWith('#!')) {
    const nl = text.indexOf('\n');
    return text.slice(0, nl + 1) + see + text.slice(nl + 1);
  }
  return see + text;
}

/** scripts/ — fs-bun helpers (sync-safe via Bun.peek inside helpers). */
function applyScriptFsTransforms(
  source: string,
  fileRel: string
): { text: string; changes: string[] } {
  let text = source;
  const changes: string[] = [];
  const needs = new Set<string>();

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line.replace(/(?<![\w.])existsSync\s*\(/g, 'fileExistsSync(')
    );
    if (text !== before) {
      changes.push('existsSync→fileExistsSync');
      needs.add('fileExistsSync');
    }
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line.replace(
        /JSON\.parse\s*\(\s*(?<![\w.])readFileSync\s*\(\s*([^,)]+?)\s*,\s*['"]utf-?8['"]\s*\)\s*\)/g,
        'readJsonSync($1)'
      )
    );
    if (text !== before) {
      changes.push('JSON.parse(readFileSync)→readJsonSync');
      needs.add('readJsonSync');
    }
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(
          /(?<![\w.])readFileSync\s*\(\s*([^,)]+?)\s*,\s*['"]utf-?8['"]\s*\)/g,
          'readTextSync($1)'
        )
        .replace(/(?<![\w.])readFileSync\s*\(\s*([^,)]+?)\s*\)/g, 'readTextSync($1)')
    );
    if (text !== before) {
      changes.push('readFileSync→readTextSync');
      needs.add('readTextSync');
    }
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line.replace(
        /(?<![\w.])writeFileSync\s*\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*(?:,\s*['"]utf-?8['"]\s*)?\)/g,
        'Bun.peek(Bun.write($1, $2))'
      )
    );
    if (text !== before) changes.push('writeFileSync→Bun.write');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(
          /await\s+readFile\s*\(\s*([^,)]+?)\s*,\s*['"]utf-?8['"]\s*\)/g,
          'await readText($1)'
        )
        .replace(
          /await\s+writeFile\s*\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*(?:,\s*['"]utf-?8['"]\s*)?\)/g,
          'await writeText($1, $2)'
        )
    );
    if (text !== before) {
      changes.push('await-read/write→fs-bun');
      if (/readText\s*\(/.test(text)) needs.add('readText');
      if (/writeText\s*\(/.test(text)) needs.add('writeText');
    }
  }

  text = stripUnusedFsImports(text);
  if (text !== source && !/from\s+['"](?:node:)?fs/.test(text)) {
    changes.push('strip-fs-imports');
  }

  if (needs.size > 0) text = ensureFsBunImport(text, fileRel, [...needs]);
  text = ensureFileIoSee(text, changes);

  return { text, changes };
}

/** lib / tools / packages — Bun.file / Bun.write at call site. */
function applyBunNativeFsTransforms(source: string): { text: string; changes: string[] } {
  let text = source;
  const changes: string[] = [];

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(
          /JSON\.parse\s*\(\s*fs\.readFileSync\s*\(\s*([^,)]+?)\s*,\s*['"]utf-?8['"]\s*\)\s*\)/g,
          'await Bun.file($1).json()'
        )
        .replace(
          /JSON\.parse\s*\(\s*(?<![\w.])readFileSync\s*\(\s*([^,)]+?)\s*,\s*['"]utf-?8['"]\s*\)\s*\)/g,
          'await Bun.file($1).json()'
        )
    );
    if (text !== before) changes.push('JSON.parse(readFileSync)→Bun.file.json');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(
          /\bfs\.readFileSync\s*\(\s*([^,)]+?)\s*,\s*['"]utf-?8['"]\s*\)/g,
          'Bun.peek(Bun.file($1).text()) as string'
        )
        .replace(
          /(?<![\w.])readFileSync\s*\(\s*([^,)]+?)\s*,\s*['"]utf-?8['"]\s*\)/g,
          'Bun.peek(Bun.file($1).text()) as string'
        )
        .replace(
          /\bfs\.readFileSync\s*\(\s*([^,)]+?)\s*\)/g,
          'new Uint8Array(Bun.peek(Bun.file($1).arrayBuffer()) as ArrayBuffer)'
        )
    );
    if (text !== before) changes.push('readFileSync→Bun.file');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(
          /\bfs\.writeFileSync\s*\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*(?:,\s*[^)]+)?\)/g,
          'Bun.peek(Bun.write($1, $2))'
        )
        .replace(
          /(?<![\w.])writeFileSync\s*\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*(?:,\s*[^)]+)?\)/g,
          'Bun.peek(Bun.write($1, $2))'
        )
    );
    if (text !== before) changes.push('writeFileSync→Bun.write');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(
          /\bfs\.existsSync\s*\(\s*([^)]+?)\s*\)/g,
          '(Bun.peek(Bun.file($1).exists()) === true)'
        )
        .replace(
          /(?<![\w.])existsSync\s*\(\s*([^)]+?)\s*\)/g,
          '(Bun.peek(Bun.file($1).exists()) === true)'
        )
    );
    if (text !== before) changes.push('existsSync→Bun.file.exists');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(/\bawait\s+fs\.writeFile\s*\(/g, 'await Bun.write(')
        .replace(/\bawait\s+writeFile\s*\(/g, 'await Bun.write(')
        .replace(/\bawait\s+fs\.readFile\s*\(/g, 'await Bun.file(')
        .replace(/\bawait\s+readFile\s*\(/g, 'await Bun.file(')
    );
    if (text !== before) changes.push('await-fs-prefixed→Bun');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(
          /await\s+fs\.writeFile\s*\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*\)/g,
          'await Bun.write($1, $2)'
        )
        .replace(
          /await\s+writeFile\s*\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*\)/g,
          'await Bun.write($1, $2)'
        )
        .replace(
          /await\s+readFile\s*\(\s*([^,)]+?)\s*,\s*['"]utf-?8['"]\s*\)/g,
          'await Bun.file($1).text()'
        )
    );
    if (text !== before) changes.push('await-read/write→Bun.file');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(
          /\bfs\.appendFileSync\s*\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*\)/g,
          'Bun.peek(Bun.write($1, $2, { append: true }))'
        )
        .replace(
          /await\s+appendFile\s*\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*\)/g,
          'await Bun.write($1, $2, { append: true })'
        )
    );
    if (text !== before) changes.push('appendFile→Bun.write(append)');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line
        .replace(/\bfs\.unlinkSync\s*\(\s*([^)]+?)\s*\)/g, 'Bun.peek(Bun.file($1).delete())')
        .replace(/await\s+unlink\s*\(\s*([^)]+?)\s*\)/g, 'await Bun.file($1).delete()')
    );
    if (text !== before) changes.push('unlink→Bun.file.delete');
  }

  {
    const before = text;
    text = mapCodeLines(text, line =>
      line.replace(
        /\bfs\.renameSync\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g,
        'Bun.peek(Bun.file($1).rename($2))'
      )
    );
    if (text !== before) changes.push('renameSync→Bun.file.rename');
  }

  text = stripUnusedFsImports(text);
  if (text !== source && !/from\s+['"](?:node:)?fs/.test(text)) {
    changes.push('strip-fs-imports');
  }
  text = ensureFileIoSee(text, changes);

  return { text, changes };
}

export function applyFsTransforms(
  source: string,
  fileRel: string
): { text: string; changes: string[] } {
  if (/from\s+['"]bun:fs['"]|import\s+fs\s+from\s+['"]bun:fs['"]/.test(source)) {
    return { text: source, changes: [] };
  }

  let text = source;
  const preChanges: string[] = [];

  // Multiline await writeFile(path, data) — only when 2nd arg is a simple expression
  {
    const before = text;
    text = text.replace(
      /await\s+writeFile\s*\(\s*([^,()\n]+)\s*,\s*([^;]+?)\s*\)\s*;/g,
      'await Bun.write($1, $2);'
    );
    if (text !== before) preChanges.push('await-writeFile→Bun.write');
  }

  if (fileRel.startsWith('scripts/')) {
    const r = applyScriptFsTransforms(text, fileRel);
    return { text: r.text, changes: [...preChanges, ...r.changes] };
  }
  const r = applyBunNativeFsTransforms(text);
  return { text: r.text, changes: [...preChanges, ...r.changes] };
}

export async function applyFsSection(opts: {
  hits: UsageHit[];
  write: boolean;
}): Promise<FsApplyResult[]> {
  const byFile = new Map<string, UsageHit[]>();
  for (const h of opts.hits) {
    if (h.migrateSection !== 'fs') continue;
    if (FS_APPLY_SKIP.has(h.file)) continue;
    const list = byFile.get(h.file) ?? [];
    list.push(h);
    byFile.set(h.file, list);
  }

  const results: FsApplyResult[] = [];

  for (const [file, fileHits] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const abs = resolvePath(REPO_ROOT, file);
    const before = await Bun.file(abs).text();
    const { text: after, changes } = applyFsTransforms(before, file);

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
