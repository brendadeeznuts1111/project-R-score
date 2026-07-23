#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/typescript-6 — types allowlist audit for TS6/7
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
import { Glob } from 'bun';
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

async function loadConfig(absPath: string): Promise<TsConfig | null> {
  if (cache.has(absPath)) return cache.get(absPath)!;
  if (!(await Bun.file(absPath).exists())) {
    cache.set(absPath, null);
    return null;
  }
  try {
    const j = (await Bun.file(absPath).json()) as TsConfig;
    cache.set(absPath, j);
    return j;
  } catch {
    cache.set(absPath, null);
    return null;
  }
}

/** Walk extends (string or array); later local compilerOptions win — we merge types from first hit. */
async function resolveTypes(
  absPath: string,
  seen = new Set<string>()
): Promise<{ types: string[] | null; source: 'local' | 'extends' | 'omit' }> {
  if (seen.has(absPath)) return { types: null, source: 'omit' };
  seen.add(absPath);
  const cfg = await loadConfig(absPath);
  if (!cfg) return { types: null, source: 'omit' };

  if (cfg.compilerOptions?.types) {
    return { types: cfg.compilerOptions.types, source: 'local' };
  }

  const ext = cfg.extends;
  const list = ext == null ? [] : Array.isArray(ext) ? ext : [ext];
  for (const rel of list) {
    const parent = resolvePath(dirnamePath(absPath), rel.endsWith('.json') ? rel : `${rel}.json`);
    // also try without forcing .json if already has it
    const candidates = [parent];
    if (!rel.endsWith('.json')) {
      candidates.push(resolvePath(dirnamePath(absPath), rel));
    }
    for (const p of candidates) {
      const hit = await resolveTypes(p, seen);
      if (hit.types) return { types: hit.types, source: 'extends' };
    }
  }
  return { types: null, source: 'omit' };
}

const rows: Row[] = [];
const glob = new Glob('**/tsconfig*.json');
const root = resolvePath(import.meta.dir, '..');

for await (const rel of glob.scan({ cwd: root, onlyFiles: true })) {
  if (rel.includes('node_modules') || rel.includes('.git/')) continue;
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
      !cfg.compilerOptions?.types;

    const resolved = await resolveTypes(abs);
    const typesStr = isProjectRefsOnly
      ? '(project-refs)'
      : resolved.types
        ? JSON.stringify(resolved.types)
        : '(omit)';
    const lib =
      cfg.compilerOptions?.lib?.join(',') ?? (cfg.extends ? '(via extends)' : '(default)');
    let notes = '';
    if (isProjectRefsOnly) notes = 'refs-ok';
    else if (typesStr.includes('bun-types')) notes = 'rename→bun';
    else if (typesStr.includes('workers')) notes = 'workers-ok';
    else if (typesStr === '(omit)') notes = 'TS6-risk';
    else if (typesStr.includes('"bun"'))
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
const bunTypes = rows.filter(r => r.types.includes('bun-types'));
const bunOk = rows.filter(
  r => r.notes === 'ok' || r.notes === 'ok-extends' || r.notes === 'refs-ok'
);

const summary = {
  total: rows.length,
  omit: omit.length,
  bunTypes: bunTypes.length,
  bunOk: bunOk.length,
  okExtends: rows.filter(r => r.notes === 'ok-extends').length,
  refsOk: rows.filter(r => r.notes === 'refs-ok').length,
};

const outPath = resolvePath(root, '.tmp/tsconfig-types-audit.json');
await Bun.write(
  outPath,
  `${JSON.stringify({ generated: new Date().toISOString(), summary, rows }, null, 2)}\n`
);

console.log(Bun.inspect.table([{ ...summary }], undefined, { colors: true }));
console.log(`wrote ${outPath}`);

if (import.meta.main) {
  console.log('\nTS6-risk (omit after extends walk):');
  for (const r of omit) {
    if (r.path.includes('node_modules')) continue;
    console.log(`  ${r.path}`);
  }
  console.log('\nbun-types rename candidates:');
  for (const r of bunTypes) console.log(`  ${r.path}`);
}
