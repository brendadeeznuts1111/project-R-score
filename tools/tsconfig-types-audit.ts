#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/typescript-6 — types allowlist audit for TS6/7
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
/**
 * Audit monorepo tsconfig*.json for TypeScript 6+ types discovery.
 *
 *   bun run check:tsconfig-types
 *   bun run check:tsconfig-types --strict   # exit 1 if monorepo-owned configs lack "bun"
 *
 * TS 6 defaults compilerOptions.types to [] (no auto @types/*). Apps/scripts need "bun".
 *
 * @see https://bun.com/docs/typescript-6
 */
import { Glob } from 'bun';
import { logTable } from '../lib/console-depth';
import { dirnamePath, resolvePath } from '../lib/path-bun';

type TsConfig = {
  compilerOptions?: { types?: string[]; lib?: string[] };
  extends?: string | string[];
  files?: string[];
  references?: unknown[];
};

type Row = {
  path: string;
  types: string;
  typesSource: 'local' | 'extends' | 'omit';
  lib: string;
  notes: string;
};

const cache = new Map<string, TsConfig | null>();

/** Strip line/block comments so JSONC tsconfigs parse (Bun.file.json rejects comments). */
export function stripJsonc(text: string): string {
  let out = '';
  let i = 0;
  let inStr = false;
  let strQ = '';
  while (i < text.length) {
    const c = text[i]!;
    const n = text[i + 1];
    if (inStr) {
      out += c;
      if (c === '\\' && i + 1 < text.length) {
        out += text[i + 1]!;
        i += 2;
        continue;
      }
      if (c === strQ) inStr = false;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      strQ = c;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && n === '/') {
      i += 2;
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export async function loadConfig(absPath: string): Promise<TsConfig | null> {
  if (cache.has(absPath)) return cache.get(absPath)!;
  if (!(await Bun.file(absPath).exists())) {
    cache.set(absPath, null);
    return null;
  }
  try {
    const raw = await Bun.file(absPath).text();
    const j = JSON.parse(stripJsonc(raw)) as TsConfig;
    cache.set(absPath, j);
    return j;
  } catch {
    cache.set(absPath, null);
    return null;
  }
}

/** Walk extends; local `types` wins (including empty array for clean .d.ts emit). */
export async function resolveTypes(
  absPath: string,
  seen = new Set<string>()
): Promise<{ types: string[] | null; source: 'local' | 'extends' | 'omit' }> {
  if (seen.has(absPath)) return { types: null, source: 'omit' };
  seen.add(absPath);
  const cfg = await loadConfig(absPath);
  if (!cfg) return { types: null, source: 'omit' };

  if (cfg.compilerOptions && 'types' in (cfg.compilerOptions as object)) {
    const t = cfg.compilerOptions.types;
    return {
      types: Array.isArray(t) ? t.map(String) : null,
      source: 'local',
    };
  }

  const ext = cfg.extends;
  const list = ext == null ? [] : Array.isArray(ext) ? ext : [ext];
  for (const rel of list) {
    const withJson = rel.endsWith('.json') ? rel : `${rel}.json`;
    const parent = resolvePath(dirnamePath(absPath), withJson);
    const hit = await resolveTypes(parent, seen);
    if (hit.types !== null) return { types: hit.types, source: 'extends' };
  }
  return { types: null, source: 'omit' };
}

/** Monorepo-owned paths that must resolve "bun" (or intentional empty emit). */
export function isMonorepoOwnedTsconfig(rel: string): boolean {
  if (rel.startsWith('packages/') && rel.endsWith('tsconfig.json')) return true;
  if (rel === 'tools/tsconfig.json') return true;
  if (rel.startsWith('tests/tsconfig.') && rel.endsWith('.json')) return true;
  if (
    rel === 'tsconfig.base.json' ||
    rel === 'tsconfig.bun.json' ||
    rel === 'tsconfig.check.json' ||
    rel === 'tsconfig.lint.json'
  ) {
    return true;
  }
  return false;
}

/** Intentional empty types for public declaration emit (no Bun globals in consumers). */
export function isIntentionalEmptyTypes(rel: string): boolean {
  return rel === 'packages/registry-client/tsconfig.json';
}

function isGitIgnored(rel: string, root: string): boolean {
  const proc = Bun.spawnSync(['git', 'check-ignore', '-q', '--', rel], {
    cwd: root,
    stdout: 'ignore',
    stderr: 'ignore',
  });
  return proc.exitCode === 0;
}

export async function auditTsconfigTypes(root = resolvePath(import.meta.dir, '..')): Promise<{
  rows: Row[];
  summary: {
    total: number;
    omit: number;
    bunTypes: number;
    bunOk: number;
    okExtends: number;
    refsOk: number;
    emitClean: number;
    monorepoRisk: number;
  };
  monorepoRisk: Row[];
}> {
  cache.clear();
  const rows: Row[] = [];
  const glob = new Glob('**/tsconfig*.json');

  for await (const rel of glob.scan({ cwd: root, onlyFiles: true })) {
    if (rel.includes('node_modules') || rel.includes('.git/') || rel.startsWith('.tmp/')) continue;
    if (isGitIgnored(rel, root)) continue;
    const abs = resolvePath(root, rel);
    try {
      const cfg = await loadConfig(abs);
      if (!cfg) {
        rows.push({
          path: rel,
          types: '(parse-error)',
          typesSource: 'omit',
          lib: '',
          notes: 'unreadable',
        });
        continue;
      }
      const isProjectRefsOnly =
        Array.isArray(cfg.files) &&
        cfg.files.length === 0 &&
        Array.isArray(cfg.references) &&
        cfg.references.length > 0 &&
        !(cfg.compilerOptions && 'types' in (cfg.compilerOptions as object));

      const resolved = await resolveTypes(abs);
      const typesArr = resolved.types;
      const typesStr = isProjectRefsOnly
        ? '(project-refs)'
        : typesArr
          ? JSON.stringify(typesArr)
          : '(omit)';
      const lib =
        cfg.compilerOptions?.lib?.join(',') ?? (cfg.extends ? '(via extends)' : '(default)');

      let notes = '';
      if (isProjectRefsOnly) notes = 'refs-ok';
      else if (typesArr && typesArr.length === 0 && isIntentionalEmptyTypes(rel))
        notes = 'emit-clean';
      else if (typesArr && typesArr.includes('bun-types')) notes = 'rename→bun';
      else if (typesArr && typesArr.some(t => t.includes('workers'))) notes = 'workers-ok';
      else if (typesArr === null) notes = 'TS6-risk';
      else if (typesArr.includes('bun'))
        notes = resolved.source === 'extends' ? 'ok-extends' : 'ok';
      else notes = 'other-types';

      rows.push({
        path: rel,
        types: typesStr,
        typesSource: isProjectRefsOnly ? 'omit' : resolved.source,
        lib,
        notes,
      });
    } catch (e) {
      rows.push({
        path: rel,
        types: '(parse-error)',
        typesSource: 'omit',
        lib: '',
        notes: String(e),
      });
    }
  }

  rows.sort((a, b) => a.path.localeCompare(b.path));
  const omit = rows.filter(r => r.notes === 'TS6-risk');
  const monorepoRisk = omit.filter(r => isMonorepoOwnedTsconfig(r.path));
  const bunTypes = rows.filter(r => r.types.includes('bun-types'));
  const bunOk = rows.filter(
    r =>
      r.notes === 'ok' ||
      r.notes === 'ok-extends' ||
      r.notes === 'refs-ok' ||
      r.notes === 'emit-clean'
  );

  const summary = {
    total: rows.length,
    omit: omit.length,
    bunTypes: bunTypes.length,
    bunOk: bunOk.length,
    okExtends: rows.filter(r => r.notes === 'ok-extends').length,
    refsOk: rows.filter(r => r.notes === 'refs-ok').length,
    emitClean: rows.filter(r => r.notes === 'emit-clean').length,
    monorepoRisk: monorepoRisk.length,
  };

  return { rows, summary, monorepoRisk };
}

if (import.meta.main) {
  const strict =
    Bun.argv.includes('--strict') ||
    Bun.env.CI === 'true' ||
    Bun.env.CI === '1' ||
    Bun.env.GITHUB_ACTIONS === 'true';

  const { rows, summary, monorepoRisk } = await auditTsconfigTypes();
  const outPath = resolvePath(import.meta.dir, '../.tmp/tsconfig-types-audit.json');
  await Bun.write(
    outPath,
    `${JSON.stringify({ generated: new Date().toISOString(), summary, rows }, null, 2)}\n`
  );

  logTable([{ ...summary }], undefined, { colors: true });
  console.log(`wrote ${outPath}`);

  console.log('\nTS6-risk (omit after extends walk):');
  for (const r of rows.filter(x => x.notes === 'TS6-risk')) {
    const tag = isMonorepoOwnedTsconfig(r.path) ? ' [monorepo]' : '';
    console.log(`  ${r.path}${tag}`);
  }
  console.log('\nbun-types rename candidates:');
  for (const r of rows.filter(x => x.notes === 'rename→bun')) console.log(`  ${r.path}`);
  console.log('\nemit-clean (intentional empty types):');
  for (const r of rows.filter(x => x.notes === 'emit-clean')) console.log(`  ${r.path}`);

  if (strict && monorepoRisk.length > 0) {
    console.error(
      `\ntsconfig-types: result=fail  monorepo_risk=${monorepoRisk.length}  (add "types": ["bun"] or fix extends)`
    );
    for (const r of monorepoRisk) console.error(`  ${r.path}`);
    process.exit(1);
  }
  console.log(
    `\ntsconfig-types: result=ok  monorepo_risk=${summary.monorepoRisk}  bun_ok=${summary.bunOk}`
  );
  process.exit(0);
}
