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
  /** Legacy field — total cycles. New baselines use strongCycles/weakCycles. */
  cycles?: number;
  strongCycles?: number;
  weakCycles?: number;
  deepImportFiles: Record<string, number>;
}

interface ImportEdge {
  target: string;
  /** dynamic import() — lazy edge; cycles containing one are 'weak'. */
  lazy: boolean;
}

interface FileRec {
  relImports: ImportEdge[];
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
      if (r) relImports.push({ target: r, lazy: im.kind === 'dynamic-import' });
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
  for (const e of rec.relImports) dfs(e.target, [...path, node]);
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

/** A cycle is 'weak' when at least one edge is a lazy dynamic import(). */
function isWeakCycle(cycle: string[]): boolean {
  for (let i = 0; i < cycle.length - 1; i++) {
    const from = files.get(cycle[i]);
    const edge = from?.relImports.find(e => e.target === cycle[i + 1]);
    if (edge?.lazy) return true;
  }
  return false;
}
const strongCycles = cycles.filter(c => !isWeakCycle(c));
const weakCycles = cycles.filter(c => isWeakCycle(c));

// ── Baseline I/O ─────────────────────────────────────────────────────────
const current: Baseline = {
  deepRelativeImports,
  cycles: cycles.length,
  strongCycles: strongCycles.length,
  weakCycles: weakCycles.length,
  deepImportFiles,
};

if (WRITE_BASELINE) {
  await Bun.write(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
  console.info(
    `import-graph baseline written: ${deepRelativeImports} deep imports, ` +
      `${strongCycles.length} strong + ${weakCycles.length} weak cycles`
  );
  process.exit(0);
}

let baseline: Baseline = { deepRelativeImports: 0, deepImportFiles: {} };
try {
  baseline = { ...baseline, ...(await Bun.file(BASELINE_PATH).json()) };
} catch {
  console.error('missing scripts/import-graph-baseline.json — run with --write-baseline');
  process.exit(1);
}
// Legacy baselines pinned only `cycles` (total) — treat as the strong ceiling.
const strongBaseline = baseline.strongCycles ?? baseline.cycles ?? 0;
const weakBaseline = baseline.weakCycles ?? 0;

// ── Verdict ──────────────────────────────────────────────────────────────
let failed = false;

if (strongCycles.length > strongBaseline) {
  failed = true;
  console.error(
    `strong import cycles ratchet: ${strongCycles.length} > baseline ${strongBaseline} (all-static edges; may only go down):`
  );
  for (const c of strongCycles.slice(0, 10)) console.error(`  🔄 ${c.join(' → ')}`);
  console.error(
    'Break via a shared leaf module or dependency inversion; lazy import() is the last resort.'
  );
}

if (weakCycles.length > weakBaseline) {
  failed = true;
  console.error(
    `weak import cycles ratchet: ${weakCycles.length} > baseline ${weakBaseline} (contains lazy dynamic-import edge; may only go down):`
  );
  for (const c of weakCycles.slice(0, 10)) console.error(`  🔄 ${c.join(' → ')}`);
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
  `import-graph OK: ${strongCycles.length}/${strongBaseline} strong + ${weakCycles.length}/${weakBaseline} weak cycles, ` +
    `${deepRelativeImports}/${baseline.deepRelativeImports} deep relative imports · Bun.Transpiler.scanImports`
);
