#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Import-graph gate: file-level import cycles + deep-relative-import ratchet.
 *
 *   bun run check:import-graph                 # enforce (pre-commit runs this)
 *   bun scripts/check-import-graph.ts --write-baseline   # owners: re-pin after intentional restructuring
 *
 * Scope: lib/ + scripts/ TypeScript (same perimeter as check-bun-env).
 *
 *   cycles      — any file-level relative-import cycle fails (invariant: 0).
 *   deepImports — `from '../../../...'` (3+ levels up) occurrences may only
 *                 go DOWN vs scripts/import-graph-baseline.json.
 */
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
  return out.join('/');
}

const files = new Map<string, FileRec>();
const deepImportFiles: Record<string, number> = {};
let deepRelativeImports = 0;

for (const dir of ['lib', 'scripts'] as const) {
  for (const rel of new Bun.Glob(`${dir}/**/*.ts`).scanSync({ cwd: ROOT, onlyFiles: true })) {
    if (rel.includes('node_modules') || rel.endsWith('.test.ts') || rel.endsWith('.d.ts')) continue;
    const code = await Bun.file(`${ROOT}/${rel}`).text();
    const relImports: string[] = [];
    // Static `import/export ... from '...'` plus side-effect `import '...'`.
    for (const m of code.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)) {
      const r = resolveRel(rel, m[1]);
      if (r) relImports.push(r);
    }
    files.set(rel.replace(/\.ts$/, ''), { relImports });
    const deep = (code.match(/from\s+['"](?:\.\.\/){3,}/g) || []).length;
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
    `import cycles detected (${cycles.length}, baseline ${baseline.cycles}) — invariant is 0:`
  );
  for (const c of cycles.slice(0, 10)) console.error(`  🔄 ${c.join(' → ')}`);
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
  `import-graph OK: ${cycles.length} cycles, ${deepRelativeImports}/${baseline.deepRelativeImports} deep relative imports`
);
