#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @updated Bun.write · fixed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.write · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated Bun.write · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.write · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated Bun.write · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.write · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.write · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.write · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.write · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.write · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.write · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.write · changed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.write · changed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.write · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.write · fixed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.write · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.write · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.write · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/reference/bun/Transpiler — Bun.Transpiler
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/transpiler — Bun.Transpiler
// @see https://bun.com/docs/runtime/transpiler#scanimports — .scanImports()
/**
 * Import-graph gate: file-level import cycles + deep-relative-import ratchet.
 *
 *   bun run check:import-graph                 # enforce (pre-commit + ci:core run this)
 *   bun scripts/check-import-graph.ts --json   # machine-readable report (agents, health tooling)
 *   bun scripts/check-import-graph.ts --write-baseline   # owners: re-pin after intentional restructuring
 *
 * Scope: lib/ + scripts/ TypeScript (same perimeter as check-bun-env).
 * Scans the git index tree (HEAD ∪ staged, via scripts/lib/index-tree.ts) —
 * NOT the worktree — so another lane's uncommitted dirty files can never
 * fail your commit. Re-pins likewise record the committed state.
 *
 *   cycles      — file-level relative-import cycles may only go DOWN vs baseline,
 *                 split strong (all-static) vs weak (≥1 lazy dynamic-import edge).
 *                 Failure output names the cheapest edge to break per cycle.
 *   deepImports — relative specs climbing 3+ levels (`../../../`) may only
 *                 go DOWN vs scripts/import-graph-baseline.json.
 *
 * Import edges via Bun.Transpiler.scanImports (ESM + require + dynamic import;
 * type-only ignored) — same SSOT as monorepo-health.
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import {
  findImportCycles,
  loaderForPath,
  scanSourceImports,
} from '../lib/harness/monorepo-health.ts';
import { materializeIndexTree, removeIndexTreeSync } from './lib/index-tree.ts';

export {};

const ROOT = process.cwd();
const BASELINE_PATH = `${ROOT}/scripts/import-graph-baseline.json`;
const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('check:import-graph', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const WRITE_BASELINE = argv.includes('--write-baseline');
const JSON_OUT = argv.includes('--json');

// Index tree (HEAD ∪ staged) — worktree dirt from other lanes cannot leak in.
// Sync cleanup on exit covers the early process.exit paths below.
const tree = await materializeIndexTree(['lib', 'scripts']);
const SCAN_ROOT = tree.dir;
process.on('exit', () => removeIndexTreeSync(tree.dir));

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
  for (const rel of new Bun.Glob(`${dir}/**/*.ts`).scanSync({ cwd: SCAN_ROOT, onlyFiles: true })) {
    if (rel.includes('node_modules') || rel.endsWith('.test.ts') || rel.endsWith('.d.ts')) continue;
    const abs = `${SCAN_ROOT}/${rel}`;
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

// ── Cycle detection (shared with monorepo-health score) ──────────────────
const cycleInventory = findImportCycles(
  new Map([...files.entries()].map(([file, rec]) => [file, rec.relImports]))
);
const cycles = cycleInventory.map(item => item.cycle);
const strongCycles = cycleInventory.filter(item => !item.weak).map(item => item.cycle);
const weakCycles = cycleInventory.filter(item => item.weak).map(item => item.cycle);

// ── Break hints: cheapest edge = the one whose target has fewest inbound importers ──
const inboundCount = new Map<string, number>();
for (const rec of files.values()) {
  for (const e of rec.relImports) inboundCount.set(e.target, (inboundCount.get(e.target) ?? 0) + 1);
}
function breakHint(cycle: string[]): string {
  let best: { from: string; to: string; score: number } | null = null;
  for (let i = 0; i < cycle.length - 1; i++) {
    const score = inboundCount.get(cycle[i + 1]) ?? 0;
    if (!best || score < best.score) best = { from: cycle[i], to: cycle[i + 1], score };
  }
  if (!best) return '';
  return `     hint: break \`${best.from} → ${best.to}\` (${best.to} has ${best.score} inbound importer(s) — cheapest edge)`;
}

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

const strongExceeded = strongCycles.length > strongBaseline;
const weakExceeded = weakCycles.length > weakBaseline;
const deepExceeded = deepRelativeImports > baseline.deepRelativeImports;
failed = strongExceeded || weakExceeded || deepExceeded;

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        ok: !failed,
        strongCycles: strongCycles.map(c => ({ cycle: c, hint: breakHint(c).trim() })),
        weakCycles: weakCycles.map(c => ({ cycle: c, hint: breakHint(c).trim() })),
        deepRelativeImports,
        deepImportFiles,
        baseline: {
          strongCycles: strongBaseline,
          weakCycles: weakBaseline,
          deepRelativeImports: baseline.deepRelativeImports,
        },
        exceeded: { strong: strongExceeded, weak: weakExceeded, deep: deepExceeded },
      },
      null,
      2
    )
  );
  process.exit(failed ? 1 : 0);
}

if (strongExceeded) {
  console.error(
    `strong import cycles ratchet: ${strongCycles.length} > baseline ${strongBaseline} (all-static edges; may only go down):`
  );
  for (const c of strongCycles.slice(0, 10)) {
    console.error(`  🔄 ${c.join(' → ')}`);
    console.error(breakHint(c));
  }
  console.error(
    'Break via a shared leaf module or dependency inversion; lazy import() is the last resort.'
  );
}

if (weakExceeded) {
  console.error(
    `weak import cycles ratchet: ${weakCycles.length} > baseline ${weakBaseline} (contains lazy dynamic-import edge; may only go down):`
  );
  for (const c of weakCycles.slice(0, 10)) {
    console.error(`  🔄 ${c.join(' → ')}`);
    console.error(breakHint(c));
  }
}

if (deepExceeded) {
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
