#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/transpiler — Bun.Transpiler
// @see https://bun.com/docs/runtime/transpiler#scanimports — .scanImports()
/**
 * Import-graph gate: file-level import cycles + deep-relative-import ratchet.
 *
 *   bun run check:import-graph                 # enforce (pre-commit runs this)
 *   bun scripts/check-import-graph.ts --write-baseline   # owners: re-pin after intentional restructuring
 *
 * Scope: lib/ + scripts/ TypeScript (same perimeter as check-bun-env).
 *
 *   cycles      — file-level relative-import cycles may only go DOWN vs baseline
 *                 (Transpiler.scanImports is more accurate than regex; 0 is ideal).
 *   deepImports — relative specs climbing 3+ levels (`../../../`) may only
 *                 go DOWN vs scripts/import-graph-baseline.json.
 *
 * Import edges via Bun.Transpiler.scanImports (ESM + require + dynamic import;
 * type-only ignored) — same SSOT as monorepo-health.
 */
import { loaderForPath, scanSourceImports } from '../lib/harness/monorepo-health.ts';

export {};

const ROOT = process.cwd();
const BASELINE_PATH = `${ROOT}/scripts/import-graph-baseline.json`;
const WRITE_BASELINE = Bun.argv.includes('--write-baseline');

interface Baseline {
  deepRelativeImports: number;
  cycles: number;
  deepImportFiles: Record<string, number>;
}

interface FileRec {
  relImports: string[];
}

function resolveRel(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const fromDir = fromFile.split('/').slice(0, -1).join('/');
  const out: string[] = [];
  for (const p of `${fromDir}/${spec}`.split('/')) {
    if (p === '.' || p === '') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  let joined = out.join('/');
  // Normalize extensions so keys match files map (no .ts suffix)
  joined = joined
    .replace(/\.tsx?$/, '')
    .replace(/\.jsx?$/, '')
    .replace(/\.mjs$/, '')
    .replace(/\.cjs$/, '');
  return joined;
}

/** Count how many `../` segments open a relative import path. */
function upLevels(spec: string): number {
  if (!spec.startsWith('.')) return 0;
  return (spec.match(/\.\.\//g) ?? []).length;
}

function fileKey(rel: string): string {
  return rel.replace(/\.tsx?$/, '').replace(/\.jsx?$/, '');
}

const files = new Map<string, FileRec>();
const deepImportFiles: Record<string, number> = {};
let deepRelativeImports = 0;

for (const dir of ['lib', 'scripts'] as const) {
  for (const rel of new Bun.Glob(`${dir}/**/*.ts`).scanSync({ cwd: ROOT, onlyFiles: true })) {
    if (rel.includes('node_modules') || rel.endsWith('.test.ts') || rel.endsWith('.d.ts')) continue;
    const abs = `${ROOT}/${rel}`;
    const code = await Bun.file(abs).text();
    const key = fileKey(rel);
    const relImports: string[] = [];

    const imports = scanSourceImports(code, loaderForPath(rel));
    let deep = 0;
    for (const im of imports) {
      const spec = im.path;
      if (!spec.startsWith('.')) continue;
      const levels = upLevels(spec);
      if (levels >= 3) deep++;
      const r = resolveRel(rel, spec);
      if (r) relImports.push(r);
    }

    files.set(key, { relImports });
    if (deep > 0) {
      deepImportFiles[rel] = deep;
      deepRelativeImports += deep;
    }
  }
}

// ── Cycle detection (DFS over relative-import graph) ─────────────────────
const visited = new Set<string>();
const rawCycles: string[][] = [];
function dfs(node: string, path: string[]): void {
  const idx = path.indexOf(node);
  if (idx !== -1) {
    rawCycles.push([...path.slice(idx), node]);
    return;
  }
  if (visited.has(node)) return;
  visited.add(node);
  const rec = files.get(node);
  if (!rec) return;
  for (const dep of rec.relImports) dfs(dep, [...path, node]);
}
for (const key of files.keys()) dfs(key, []);
const seen = new Set<string>();
const cycles: string[][] = [];
for (const c of rawCycles) {
  const sig = c.slice(0, -1).sort().join('|');
  if (!seen.has(sig)) {
    seen.add(sig);
    cycles.push(c);
  }
}

// ── Baseline I/O ─────────────────────────────────────────────────────────
const current: Baseline = { deepRelativeImports, cycles: cycles.length, deepImportFiles };

if (WRITE_BASELINE) {
  await Bun.write(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
  console.info(
    `import-graph baseline written: ${deepRelativeImports} deep imports, ${cycles.length} cycles`
  );
  process.exit(0);
}

let baseline: Baseline = { deepRelativeImports: 0, cycles: 0, deepImportFiles: {} };
try {
  baseline = { ...baseline, ...(await Bun.file(BASELINE_PATH).json()) };
} catch {
  console.error('missing scripts/import-graph-baseline.json — run with --write-baseline');
  process.exit(1);
}

// ── Verdict ──────────────────────────────────────────────────────────────
let failed = false;

if (cycles.length > baseline.cycles) {
  failed = true;
  console.error(
    `import cycles ratchet: ${cycles.length} > baseline ${baseline.cycles} (may only go down):`
  );
  for (const c of cycles.slice(0, 10)) console.error(`  🔄 ${c.join(' → ')}`);
  console.error('Break mutual imports or re-pin with --write-baseline after intentional change.');
}

if (deepRelativeImports > baseline.deepRelativeImports) {
  failed = true;
  console.error(
    `deep relative imports ratchet: ${deepRelativeImports} > baseline ${baseline.deepRelativeImports} (../../../ may only go down):`
  );
  for (const [f, n] of Object.entries(deepImportFiles)) {
    const was = baseline.deepImportFiles[f] ?? 0;
    if (n > was) console.error(`  🔻 ${f}: ${was} → ${n}`);
  }
  console.error('Promote the shared module instead of climbing directories.');
}

if (failed) process.exit(1);
console.info(
  `import-graph OK: ${cycles.length} cycles, ${deepRelativeImports}/${baseline.deepRelativeImports} deep relative imports · Bun.Transpiler.scanImports`
);
