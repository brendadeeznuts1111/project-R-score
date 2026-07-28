#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/bundler/index#metafile — Bun.build metafile
// @see https://bun.com/docs/bundler/index#target — target bun
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Packages metafile audit — Glob scan + Bun.build graph classification.
 *
 * Labels:
 *   · leaves / orphans / cycles / external / hubs / fanOut
 * Entrypoints: index|cli|main|bin + package.json module|bin|exports
 *
 *   bun run audit:packages
 *   bun run audit:packages:full   # --cross-check --diff --md --map --bake
 *   bun tools/packages-metafile-audit.ts --strict
 */
import { Glob, sliceAnsi } from 'bun';
import { joinPath } from '../lib/path-bun.ts';
import { logTable } from '../lib/console-depth.ts';
import {
  buildPackageGraphMap,
  compareDeclaredWorkspaceDeps,
  enrichIntraPackageMap,
  formatPackageMapDot,
  formatPackageMapMermaid,
  resolveMetaImportPath,
  scanOutsidePackageConsumers,
  type PackageGraphMap,
} from '../lib/harness/packages-graph-map.ts';

const ROOT = joinPath(import.meta.dir, '..');

type MetaImport = { path: string; kind?: string; original?: string };
type MetaInput = { bytes?: number; imports?: MetaImport[]; format?: string };

/** In-process lock so concurrent audits (e.g. bun test --concurrency) share one Bun.build lane. */
let packagesBuildChain: Promise<unknown> = Promise.resolve();

function withPackagesBuildLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = packagesBuildChain.then(fn, fn);
  packagesBuildChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function buildPackagesMetafile(entryAbs: string[]): Promise<{
  success: boolean;
  logCount: number;
  inputs: Record<string, MetaInput>;
  note?: string;
}> {
  const attempt = async () => {
    const result = await Bun.build({
      entrypoints: entryAbs,
      metafile: true,
      write: false,
      target: 'bun',
    });
    return {
      success: result.success,
      logCount: result.logs?.length ?? 0,
      inputs: (result.metafile?.inputs ?? {}) as Record<string, MetaInput>,
    };
  };

  try {
    let out = await attempt();
    // Empty metafile with success=false or throw-like empty graph → one cold retry.
    if (!out.success || Object.keys(out.inputs).length === 0) {
      await Bun.sleep(25);
      out = await attempt();
    }
    return {
      ...out,
      note: out.success ? undefined : `Bun.build reported ${out.logCount} log(s)`,
    };
  } catch (e) {
    try {
      await Bun.sleep(25);
      const out = await attempt();
      return {
        ...out,
        note: out.success
          ? `Bun.build recovered after: ${e instanceof Error ? e.message : String(e)}`
          : `Bun.build reported ${out.logCount} log(s)`,
      };
    } catch (e2) {
      return {
        success: false,
        logCount: 0,
        inputs: {},
        note: `Bun.build threw: ${e2 instanceof Error ? e2.message : String(e2)}`,
      };
    }
  }
}

export type PackageAuditGrade = 'healthy' | 'needs-improvement' | 'critical';

export type EntrypointKind =
  | 'index'
  | 'cli'
  | 'main'
  | 'bin'
  | 'pkg-bin'
  | 'pkg-module'
  | 'pkg-exports'
  | 'explicit';

export type PackageAuditReport = {
  schemaVersion: 5;
  kind: 'packages-metafile-audit';
  generatedAt: string;
  bunVersion: string;
  root: string;
  glob: string;
  target: 'bun';
  score: number;
  grade: PackageAuditGrade;
  scanned: number;
  entrypoints: string[];
  entrypointKinds: Record<string, EntrypointKind>;
  buildSuccess: boolean;
  logCount: number;
  leaves: string[];
  entrypointRoots: string[];
  orphans: string[];
  externalInputs: string[];
  cycles: string[][];
  hubs: Array<{ path: string; inbound: number; bytes: number }>;
  fanOut: Array<{ path: string; outbound: number; bytes: number }>;
  heaviest: Array<{ path: string; bytes: number; importCount: number }>;
  /** Package-level dependency map (cross-pkg + external planes). */
  map: PackageGraphMap;
  packages: Array<{
    name: string;
    scanned: number;
    inGraph: number;
    orphans: number;
    bytes: number;
  }>;
  totals: {
    inputCount: number;
    inputBytes: number;
    orphanCount: number;
    leafCount: number;
    orphanPercent: number;
    cycleCount: number;
    hubCount: number;
    crossPackageEdges: number;
    externalEdges: number;
    mapLayers: number;
  };
  diff?: {
    previousGeneratedAt: string | null;
    previousScore: number | null;
    scoreDelta: number | null;
    orphanDelta: number;
    cycleDelta: number;
    addedOrphans: string[];
    removedOrphans: string[];
  };
  crossCheck?: {
    deadFileCount: number;
    cyclicDependencyCount: number;
    metafileOnlyOrphans: string[];
    transpilerOnlyDead: string[];
    notes: string[];
  };
  notes: string[];
  metafile?: {
    inputs: Record<string, { bytes: number; importCount: number; format?: string }>;
  };
  metafileFull?: unknown;
};

function argvFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argvValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1]!;
  return fallback;
}

function rel(absOrRel: string): string {
  const n = absOrRel.replace(/\\/g, '/');
  if (n.startsWith(ROOT + '/')) return n.slice(ROOT.length + 1);
  if (n.startsWith('./')) return n.slice(2);
  return n;
}

function packageName(path: string): string {
  const m = rel(path).match(/^packages\/([^/]+)\//);
  return m?.[1] ?? '(external)';
}

function classifyEntrypoint(path: string): EntrypointKind | null {
  const p = rel(path);
  if (/(?:^|\/)index\.(ts|tsx|js|jsx|mts|cts)$/.test(p)) return 'index';
  if (/(?:^|\/)cli\.(ts|tsx|js|jsx)$/.test(p)) return 'cli';
  if (/(?:^|\/)main\.(ts|tsx|js|jsx)$/.test(p)) return 'main';
  if (/(?:^|\/)bin\.(ts|tsx|js|jsx)$/.test(p)) return 'bin';
  return null;
}

function writeLine(s: string): void {
  console.log(sliceAnsi(s, 0, 100));
}

/** Score 0–100 · grade thresholds match monorepo-health (healthy ≥90, critical &lt;60). */
export function scorePackageAudit(input: {
  orphanCount: number;
  orphanPercent: number;
  cycleCount: number;
  buildSuccess: boolean;
}): { score: number; grade: PackageAuditGrade } {
  let score = 100;
  score -= input.orphanCount * 8;
  score -= input.orphanPercent * 0.5;
  score -= input.cycleCount * 10;
  if (!input.buildSuccess) score -= 25;
  score = Math.max(0, Math.min(100, Number(score.toFixed(1))));
  const grade: PackageAuditGrade =
    score >= 90 ? 'healthy' : score >= 60 ? 'needs-improvement' : 'critical';
  return { score, grade };
}

export function diffAgainstPrevious(
  current: Pick<PackageAuditReport, 'orphans' | 'totals' | 'score' | 'generatedAt'>,
  previous: Partial<PackageAuditReport> | null
): NonNullable<PackageAuditReport['diff']> {
  const prevOrphans = new Set(previous?.orphans ?? []);
  const curOrphans = new Set(current.orphans);
  const addedOrphans = current.orphans.filter(o => !prevOrphans.has(o));
  const removedOrphans = [...prevOrphans].filter(o => !curOrphans.has(o));
  const previousScore =
    typeof previous?.score === 'number'
      ? previous.score
      : previous?.totals
        ? scorePackageAudit({
            orphanCount: previous.totals.orphanCount ?? 0,
            orphanPercent: previous.totals.orphanPercent ?? 0,
            cycleCount: previous.totals.cycleCount ?? 0,
            buildSuccess: previous.buildSuccess !== false,
          }).score
        : null;
  return {
    previousGeneratedAt: previous?.generatedAt ?? null,
    previousScore,
    scoreDelta: previousScore == null ? null : Number((current.score - previousScore).toFixed(1)),
    orphanDelta: current.totals.orphanCount - (previous?.totals?.orphanCount ?? 0),
    cycleDelta: current.totals.cycleCount - (previous?.totals?.cycleCount ?? 0),
    addedOrphans,
    removedOrphans,
  };
}

/**
 * Count simple directed cycles (DFS back-edges) — same idea as monorepo-health.
 */
export function findImportCycles(
  adjacency: Map<string, string[]>,
  opts?: { maxCycles?: number; packagesOnly?: boolean }
): string[][] {
  const maxCycles = opts?.maxCycles ?? 20;
  const packagesOnly = opts?.packagesOnly !== false;
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const nodes = [...adjacency.keys()].filter(n =>
    packagesOnly ? n.startsWith('packages/') : true
  );

  function dfs(node: string): void {
    if (cycles.length >= maxCycles) return;
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      const i = stack.indexOf(node);
      if (i >= 0) cycles.push([...stack.slice(i), node]);
      return;
    }
    visiting.add(node);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      if (packagesOnly && !next.startsWith('packages/')) continue;
      dfs(next);
      if (cycles.length >= maxCycles) break;
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const n of nodes) dfs(n);
  return cycles;
}

/** Resolve package.json module / bin / exports → absolute TS/JS paths under packages/. */
export async function discoverPackageJsonEntrypoints(
  packagesRoot = joinPath(ROOT, 'packages')
): Promise<Array<{ abs: string; kind: EntrypointKind }>> {
  const out: Array<{ abs: string; kind: EntrypointKind }> = [];
  const g = new Glob('*/package.json');
  for await (const pkgRel of g.scan({ cwd: packagesRoot, absolute: false, onlyFiles: true })) {
    const pkgDir = joinPath(packagesRoot, pkgRel.replace(/\/package\.json$/, ''));
    let pkg: {
      module?: string;
      main?: string;
      bin?: string | Record<string, string>;
      exports?: unknown;
    };
    try {
      pkg = (await Bun.file(joinPath(packagesRoot, pkgRel)).json()) as typeof pkg;
    } catch {
      continue;
    }

    const tryAdd = async (spec: string | undefined, kind: EntrypointKind) => {
      if (!spec || typeof spec !== 'string') return;
      const cleaned = spec.replace(/^\.\//, '');
      let abs = joinPath(pkgDir, cleaned);
      // Prefer src over dist when package.json points at dist but src exists
      if (/\/dist\//.test(abs) || /\/dist\//.test(cleaned)) {
        const srcCand = abs.replace(/\/dist\//, '/src/').replace(/\.js$/, '.ts');
        if (await Bun.file(srcCand).exists()) abs = srcCand;
      }
      if (await Bun.file(abs).exists()) out.push({ abs, kind });
    };

    await tryAdd(pkg.module, 'pkg-module');
    await tryAdd(typeof pkg.main === 'string' ? pkg.main : undefined, 'pkg-module');

    if (typeof pkg.bin === 'string') {
      await tryAdd(pkg.bin, 'pkg-bin');
    } else if (pkg.bin && typeof pkg.bin === 'object') {
      for (const v of Object.values(pkg.bin)) await tryAdd(v, 'pkg-bin');
    }

    const exportsField = pkg.exports;
    if (typeof exportsField === 'string') {
      await tryAdd(exportsField, 'pkg-exports');
    } else if (exportsField && typeof exportsField === 'object') {
      const rec = exportsField as Record<string, unknown>;
      const root = rec['.'] ?? rec['./'];
      if (typeof root === 'string') await tryAdd(root, 'pkg-exports');
      else if (root && typeof root === 'object') {
        const r = root as Record<string, unknown>;
        const cand = r.import ?? r.default ?? r.require;
        if (typeof cand === 'string') await tryAdd(cand, 'pkg-exports');
      }
    }
  }
  return out;
}

export function formatAuditMarkdown(report: PackageAuditReport): string {
  const lines = [
    `# Packages metafile audit`,
    ``,
    `- Generated: ${report.generatedAt}`,
    `- Bun: ${report.bunVersion}`,
    `- Score: **${report.score}/100** (${report.grade})`,
    `- Scanned: ${report.scanned} · Entrypoints: ${report.entrypoints.length}`,
    `- Orphans: ${report.totals.orphanCount} (${report.totals.orphanPercent}%) · Cycles: ${report.totals.cycleCount}`,
    ``,
  ];
  if (report.diff) {
    lines.push(
      `## Diff`,
      ``,
      `- Score Δ: ${report.diff.scoreDelta ?? 'n/a'} (prev ${report.diff.previousScore ?? '—'})`,
      `- Orphan Δ: ${report.diff.orphanDelta} · Cycle Δ: ${report.diff.cycleDelta}`,
      report.diff.addedOrphans.length
        ? `- Added orphans: ${report.diff.addedOrphans.join(', ')}`
        : `- Added orphans: —`,
      report.diff.removedOrphans.length
        ? `- Removed orphans: ${report.diff.removedOrphans.join(', ')}`
        : `- Removed orphans: —`,
      ``
    );
  }
  lines.push(
    `## Packages`,
    ``,
    `| Package | Scanned | InGraph | Orphans | KiB |`,
    `|---|---:|---:|---:|---:|`
  );
  for (const p of report.packages) {
    lines.push(
      `| ${p.name} | ${p.scanned} | ${p.inGraph} | ${p.orphans} | ${(p.bytes / 1024).toFixed(1)} |`
    );
  }
  if (report.map.packageEdges.length || report.map.externalEdges.length || report.map.intra) {
    lines.push(``, `## Package map`, ``);
    lines.push(`Layers: ${report.map.layers.map((L, i) => `${i}:[${L.join(', ')}]`).join(' · ')}`);
    lines.push(``, `### Cross-package edges`, ``);
    if (!report.map.packageEdges.length) lines.push(`_(none — packages are isolated)_`, ``);
    for (const e of report.map.packageEdges) {
      lines.push(`- \`${e.from}\` → \`${e.to}\` (weight ${e.weight})`);
    }
    lines.push(``, `### External edges`, ``);
    for (const e of report.map.externalEdges.slice(0, 20)) {
      lines.push(`- \`${e.fromPackage}\` → \`${e.targetPrefix}\` (${e.plane}, w=${e.weight})`);
    }
  }
  if (report.map.intra && Object.keys(report.map.intra).length) {
    lines.push(``, `### Intra-package depth`, ``);
    const rows = Object.entries(report.map.intra).sort((a, b) => b[1].depth - a[1].depth);
    for (const [name, info] of rows.slice(0, 12)) {
      lines.push(`- \`${name}\`: depth ${info.depth} · ${info.fileCount} files`);
    }
  }
  if (report.map.outsideConsumers?.length) {
    lines.push(``, `### Outside consumers`, ``);
    for (const c of report.map.outsideConsumers.slice(0, 12)) {
      lines.push(`- \`${c.package}\`: ${c.count} file(s) — ${c.consumers.slice(0, 4).join(', ')}`);
    }
  }
  if (report.map.declared?.length) {
    const missing = report.map.declared.filter(d => d.missingInPackageJson.length);
    const rootListed = report.map.declared.filter(d => d.inRootWorkspaceDeps);
    lines.push(
      ``,
      `### Declared vs actual`,
      ``,
      `- Root workspace deps: ${rootListed.length}/${report.map.declared.length}`,
      `- Packages with undeclared cross-imports: ${missing.length}`,
      ``
    );
    for (const d of missing.slice(0, 10)) {
      lines.push(`- \`${d.package}\` missing: ${d.missingInPackageJson.join(', ')}`);
    }
  }
  if (report.orphans.length) {
    lines.push(``, `## Orphans`, ``, ...report.orphans.map(o => `- \`${o}\``));
  }
  if (report.cycles.length) {
    lines.push(``, `## Cycles`, ``, ...report.cycles.map(c => `- ${c.join(' → ')}`));
  }
  lines.push(``, `## Notes`, ``, ...report.notes.map(n => `- ${n}`), ``);
  return lines.join('\n');
}

export async function runPackagesMetafileAudit(opts?: {
  glob?: string;
  fullMetafile?: boolean;
  includeTests?: boolean;
  crossCheck?: boolean;
  extraEntrypoints?: string[];
  packageJsonEntrypoints?: boolean;
  previous?: PackageAuditReport | Partial<PackageAuditReport> | null;
  /** Intra-package layers + outside consumers + declared-vs-actual (default true). */
  deepMap?: boolean;
}): Promise<PackageAuditReport> {
  const globPat = opts?.glob ?? 'packages/*/src/**/*.{ts,tsx}';
  const g = new Glob(globPat);
  const scannedAbs: string[] = [];
  for await (const f of g.scan({ cwd: ROOT, absolute: true, onlyFiles: true })) {
    scannedAbs.push(f);
  }
  const includeTests = opts?.includeTests === true;
  const filteredAbs = includeTests
    ? scannedAbs
    : scannedAbs.filter(f => !/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f));
  const scannedRel = filteredAbs.map(rel).sort();

  const entrypointKinds: PackageAuditReport['entrypointKinds'] = {};
  const entryAbsSet = new Set<string>();

  for (const abs of filteredAbs) {
    const kind = classifyEntrypoint(abs);
    if (!kind) continue;
    entryAbsSet.add(abs);
    entrypointKinds[rel(abs)] = kind;
  }

  if (opts?.packageJsonEntrypoints !== false) {
    for (const { abs, kind } of await discoverPackageJsonEntrypoints()) {
      if (!entryAbsSet.has(abs)) {
        entryAbsSet.add(abs);
        entrypointKinds[rel(abs)] = kind;
      }
    }
  }

  for (const extra of opts?.extraEntrypoints ?? []) {
    const abs = extra.startsWith('/') ? extra : joinPath(ROOT, extra);
    if (await Bun.file(abs).exists()) {
      entryAbsSet.add(abs);
      entrypointKinds[rel(abs)] = 'explicit';
    }
  }

  const entryAbs = [...entryAbsSet].sort();
  const entryRel = entryAbs.map(rel);

  const notes: string[] = [];
  if (entryAbs.length === 0) {
    notes.push('No entrypoints under packages/*/src — graph empty');
  } else {
    const kinds = Object.values(entrypointKinds);
    const count = (k: EntrypointKind) => kinds.filter(x => x === k).length;
    notes.push(
      `Entrypoints: ${count('index')} index · ${count('cli')} cli · ${count('main') + count('bin')} main/bin · ${count('pkg-module') + count('pkg-bin') + count('pkg-exports')} package.json`
    );
  }

  let buildSuccess = true;
  let logCount = 0;
  let inputsRaw: Record<string, MetaInput> = {};

  if (entryAbs.length > 0) {
    // Serialize + one retry: concurrent Bun.build under bun test can flake empty metafiles.
    const built = await withPackagesBuildLock(() => buildPackagesMetafile(entryAbs));
    buildSuccess = built.success;
    logCount = built.logCount;
    inputsRaw = built.inputs;
    if (built.note) notes.push(built.note);
  }

  const inputs = new Map<string, { bytes: number; imports: string[]; format?: string }>();
  const inbound = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const [key, meta] of Object.entries(inputsRaw)) {
    const from = rel(key);
    const imports: string[] = [];
    for (const im of meta.imports ?? []) {
      const resolved = resolveMetaImportPath(from, im.path, ROOT);
      if (!resolved) continue;
      if (resolved.kind === 'bare') {
        imports.push(resolved.name); // bare — mapper classifies as bare:
        continue;
      }
      imports.push(resolved.path);
    }
    inputs.set(from, {
      bytes: meta.bytes ?? 0,
      imports,
      format: meta.format,
    });
    adjacency.set(from, imports);
    for (const to of imports) {
      if (to.startsWith('packages/') || to.startsWith('lib/') || to.startsWith('config/')) {
        inbound.set(to, (inbound.get(to) ?? 0) + 1);
      }
    }
  }

  const inGraph = new Set(inputs.keys());
  const orphans = scannedRel.filter(f => !inGraph.has(f));
  const leaves = [...inputs.entries()]
    .filter(([, m]) => m.imports.length === 0)
    .map(([p]) => p)
    .sort();
  const entrypointRoots = entryRel.filter(e => inGraph.has(e));
  const externalInputs = [...inGraph].filter(p => !p.startsWith('packages/')).sort();
  const cycles = findImportCycles(adjacency, { maxCycles: 20, packagesOnly: true });
  let map = buildPackageGraphMap(adjacency, { root: ROOT });

  if (opts?.deepMap !== false) {
    map = enrichIntraPackageMap(map, adjacency, { minFiles: 2 });
    map = {
      ...map,
      outsideConsumers: await scanOutsidePackageConsumers(ROOT, map.packages),
      declared: await compareDeclaredWorkspaceDeps(ROOT, map),
    };
  }

  const hubs = [...inbound.entries()]
    .filter(([p]) => p.startsWith('packages/'))
    .map(([path, count]) => ({
      path,
      inbound: count,
      bytes: inputs.get(path)?.bytes ?? 0,
    }))
    .sort((a, b) => b.inbound - a.inbound || b.bytes - a.bytes)
    .slice(0, 10);

  const fanOut = [...inputs.entries()]
    .filter(([p]) => p.startsWith('packages/'))
    .map(([path, m]) => ({ path, outbound: m.imports.length, bytes: m.bytes }))
    .filter(r => r.outbound > 0)
    .sort((a, b) => b.outbound - a.outbound || b.bytes - a.bytes)
    .slice(0, 10);

  const heaviest = [...inputs.entries()]
    .filter(([p]) => p.startsWith('packages/'))
    .map(([path, m]) => ({ path, bytes: m.bytes, importCount: m.imports.length }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);

  const pkgMap = new Map<
    string,
    { scanned: number; inGraph: number; orphans: number; bytes: number }
  >();
  for (const f of scannedRel) {
    const name = packageName(f);
    const row = pkgMap.get(name) ?? { scanned: 0, inGraph: 0, orphans: 0, bytes: 0 };
    row.scanned++;
    if (inGraph.has(f)) {
      row.inGraph++;
      row.bytes += inputs.get(f)?.bytes ?? 0;
    } else row.orphans++;
    pkgMap.set(name, row);
  }

  const packages = [...pkgMap.entries()]
    .map(([name, r]) => ({ name, ...r }))
    .sort((a, b) => b.orphans - a.orphans || a.name.localeCompare(b.name));

  const inputBytes = [...inputs.values()].reduce((n, m) => n + m.bytes, 0);
  const orphanPercent = scannedRel.length ? (orphans.length / scannedRel.length) * 100 : 0;
  const { score, grade } = scorePackageAudit({
    orphanCount: orphans.length,
    orphanPercent,
    cycleCount: cycles.length,
    buildSuccess,
  });

  notes.push(
    'leaves = zero outbound imports (not dead). orphans = scanned but unreachable from entrypoints.'
  );
  if (externalInputs.length) {
    notes.push(
      `${externalInputs.length} external input(s) pulled into graph (lib/, config/, …) — expected for workspace edges.`
    );
  }
  if (cycles.length) {
    notes.push(`${cycles.length} import cycle(s) detected in packages/ metafile graph`);
  }
  notes.push(`score ${score}/100 (${grade})`);

  let crossCheck: PackageAuditReport['crossCheck'];
  if (opts?.crossCheck) {
    const { analyzeImportGraph, scanSourceImports, resolveRelativeImport } = await import(
      '../lib/harness/monorepo-health.ts'
    );
    const absScanned = scannedRel.map(p => joinPath(ROOT, p));
    const absEntries = entryRel.map(p => joinPath(ROOT, p));
    const graph = await analyzeImportGraph(absScanned, absEntries);
    const fileSet = new Set(absScanned);
    const imported = new Set<string>();
    for (const file of absScanned) {
      let text: string;
      try {
        text = await Bun.file(file).text();
      } catch {
        continue;
      }
      const loader = file.endsWith('.tsx') ? 'tsx' : 'ts';
      for (const im of scanSourceImports(text, loader)) {
        if (!im.path.startsWith('.')) continue;
        const resolved = await resolveRelativeImport(file, im.path);
        if (resolved && fileSet.has(resolved)) imported.add(resolved);
      }
    }
    const transpilerDead = new Set<string>();
    for (const f of absScanned) {
      if (!imported.has(f)) transpilerDead.add(rel(f));
    }
    const transpilerOrphans = [...transpilerDead].filter(p => !entrypointKinds[p]);
    const metaOrphanSet = new Set(orphans);
    const transpilerOrphanSet = new Set(transpilerOrphans);
    crossCheck = {
      deadFileCount: graph.deadFileCount,
      cyclicDependencyCount: graph.cyclicDependencyCount,
      metafileOnlyOrphans: orphans.filter(o => !transpilerOrphanSet.has(o)),
      transpilerOnlyDead: transpilerOrphans.filter(o => !metaOrphanSet.has(o)),
      notes: [
        ...graph.notes,
        'Cross-check excludes entrypoints from Transpiler “dead” (roots are never imported).',
      ],
    };
    notes.push(
      `cross-check: metafile orphans=${orphans.length} · transpiler orphans(excl entry)=${transpilerOrphans.length} · cycles(transpiler)=${graph.cyclicDependencyCount}`
    );
  }

  if (map.packageEdges.length === 0) {
    notes.push('Package map: no cross-package edges (packages are isolated islands)');
  } else {
    notes.push(
      `Package map: ${map.packageEdges.length} cross-pkg edges · ${map.externalEdges.length} external · ${map.layers.length} layers`
    );
  }
  if (map.packageCycles.length) {
    notes.push(`${map.packageCycles.length} cross-package cycle(s)`);
  }
  if (map.outsideConsumers?.length) {
    const top = map.outsideConsumers
      .slice(0, 3)
      .map(c => `${c.package}:${c.count}`)
      .join(', ');
    notes.push(`Outside consumers (lib/tools/scripts/tests): ${top}`);
  }
  if (map.declared) {
    const missing = map.declared.filter(d => d.missingInPackageJson.length);
    const rootListed = map.declared.filter(d => d.inRootWorkspaceDeps).length;
    notes.push(
      `Declared: ${rootListed}/${map.packages.length} in root workspace deps · ${missing.length} pkg(s) with undeclared cross-imports`
    );
  }
  if (map.intra) {
    const deepest = Object.entries(map.intra).sort((a, b) => b[1].depth - a[1].depth)[0];
    if (deepest) {
      notes.push(
        `Intra depth: deepest ${deepest[0]} depth=${deepest[1].depth} files=${deepest[1].fileCount}`
      );
    }
  }

  const report: PackageAuditReport = {
    schemaVersion: 5,
    kind: 'packages-metafile-audit',
    generatedAt: new Date().toISOString(),
    bunVersion: Bun.version,
    root: ROOT,
    glob: globPat,
    target: 'bun',
    score,
    grade,
    scanned: scannedRel.length,
    entrypoints: entryRel,
    entrypointKinds,
    buildSuccess,
    logCount,
    leaves,
    entrypointRoots,
    orphans,
    externalInputs,
    cycles,
    hubs,
    fanOut,
    heaviest,
    map,
    packages,
    totals: {
      inputCount: inputs.size,
      inputBytes,
      orphanCount: orphans.length,
      leafCount: leaves.length,
      orphanPercent: Number(orphanPercent.toFixed(2)),
      cycleCount: cycles.length,
      hubCount: hubs.length,
      crossPackageEdges: map.packageEdges.length,
      externalEdges: map.externalEdges.length,
      mapLayers: map.layers.length,
    },
    ...(crossCheck ? { crossCheck } : {}),
    notes,
  };

  if (opts?.previous !== undefined) {
    report.diff = diffAgainstPrevious(report, opts.previous);
  }

  if (opts?.fullMetafile) {
    report.metafileFull = inputsRaw;
  } else {
    const compact: PackageAuditReport['metafile'] = { inputs: {} };
    for (const [p, m] of [...inputs.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      compact!.inputs[p] = {
        bytes: m.bytes,
        importCount: m.imports.length,
        format: m.format,
      };
    }
    report.metafile = compact;
  }

  return report;
}

async function main(): Promise<void> {
  if (argvFlag('--help') || argvFlag('-h')) {
    console.log(`Usage: bun tools/packages-metafile-audit.ts [options]

  --json              print report JSON only
  --md                also write audit-report.md (or --out with .md sibling)
  --diff              compare against existing --out report before overwrite
  --out <path>        write report (default: audit-report.json)
  --glob <pattern>    override scan glob
  --full-metafile     include raw Bun.build metafile.inputs
  --include-tests     include *.test.ts / *.spec.ts in scan
  --cross-check       Bun.Transpiler.scan orphan/cycle compare
  --map               write audit-map.mmd + audit-map.dot beside --out
  --bake              write map to public/registry/packages-graph-map.json
  --shallow           skip intra/outside/declared deep-map enrichment
  --no-pkg-json       skip package.json module/bin/exports entrypoints
  --strict            exit 1 if grade=critical or orphans/cycles/build fail
  --help              this message

Score: 100 − 8·orphans − 0.5·orphan% − 10·cycles − 25·buildFail
Grade: healthy≥90 · needs-improvement≥60 · critical<60
Map v5: cross-pkg + external planes + intra depth + outside consumers + declared
`);
    return;
  }

  const outPath = argvValue('--out', joinPath(ROOT, 'audit-report.json'));
  let previous: Partial<PackageAuditReport> | null = null;
  if (argvFlag('--diff') && (await Bun.file(outPath).exists())) {
    try {
      previous = (await Bun.file(outPath).json()) as Partial<PackageAuditReport>;
    } catch {
      previous = null;
    }
  }

  const report = await runPackagesMetafileAudit({
    glob: argvFlag('--glob') ? argvValue('--glob', 'packages/*/src/**/*.{ts,tsx}') : undefined,
    fullMetafile: argvFlag('--full-metafile'),
    includeTests: argvFlag('--include-tests'),
    crossCheck: argvFlag('--cross-check'),
    packageJsonEntrypoints: !argvFlag('--no-pkg-json'),
    previous: argvFlag('--diff') ? previous : undefined,
    deepMap: !argvFlag('--shallow'),
  });

  await Bun.write(outPath, JSON.stringify(report, null, 2) + '\n');

  if (argvFlag('--md')) {
    const mdPath = outPath.replace(/\.json$/i, '.md');
    await Bun.write(mdPath, formatAuditMarkdown(report));
    if (!argvFlag('--json')) console.log(`→ ${mdPath}`);
  }

  if (argvFlag('--map')) {
    const base = outPath.replace(/\.json$/i, '');
    const mmdPath = `${base}-map.mmd`;
    const dotPath = `${base}-map.dot`;
    await Bun.write(mmdPath, formatPackageMapMermaid(report.map));
    await Bun.write(dotPath, formatPackageMapDot(report.map));
    if (!argvFlag('--json')) {
      console.log(`→ ${mmdPath}`);
      console.log(`→ ${dotPath}`);
    }
  }

  if (argvFlag('--bake')) {
    const bakePath = joinPath(ROOT, 'public/registry/packages-graph-map.json');
    const bake = {
      schemaVersion: 5,
      kind: 'packages-graph-map',
      generatedAt: report.generatedAt,
      bunVersion: report.bunVersion,
      score: report.score,
      grade: report.grade,
      map: report.map,
      packages: report.packages,
      totals: report.totals,
    };
    await Bun.write(bakePath, JSON.stringify(bake, null, 2) + '\n');
    if (!argvFlag('--json')) console.log(`→ ${bakePath}`);
  }

  if (argvFlag('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    writeLine(
      `📦 ${report.scanned} scanned · ${report.entrypoints.length} entrypoints · score ${report.score}/100 (${report.grade})`
    );
    writeLine(
      `🧹 ${report.totals.orphanCount} orphans (${report.totals.orphanPercent}%) · ${report.totals.cycleCount} cycles · ${report.totals.leafCount} leaves`
    );
    logTable(
      report.packages.map(p => ({
        Package: p.name,
        Scanned: p.scanned,
        InGraph: p.inGraph,
        Orphans: p.orphans,
        KiB: Number((p.bytes / 1024).toFixed(1)),
      })),
      ['Package', 'Scanned', 'InGraph', 'Orphans', 'KiB']
    );
    writeLine(
      `🗺️ map: ${report.totals.crossPackageEdges} cross-pkg · ${report.totals.externalEdges} external · ${report.totals.mapLayers} layers · internal file-edges ${report.map.internalEdgeCount}`
    );
    if (report.map.layers.length) {
      console.log('\nlayers (topo):');
      report.map.layers.forEach((L, i) => console.log(`  L${i}: ${L.join(', ') || '—'}`));
    }
    if (report.map.packageEdges.length) {
      console.log('\ncross-package edges:');
      for (const e of report.map.packageEdges.slice(0, 15)) {
        console.log(`  · ${e.from} → ${e.to}  w=${e.weight}`);
      }
    } else {
      console.log('\ncross-package edges: (none — isolated packages)');
    }
    if (report.map.externalEdges.length) {
      console.log('\nexternal planes:');
      for (const e of report.map.externalEdges.slice(0, 15)) {
        console.log(`  · ${e.fromPackage} → ${e.targetPrefix}  [${e.plane}] w=${e.weight}`);
      }
    }
    if (report.map.intra) {
      const rows = Object.entries(report.map.intra).sort((a, b) => b[1].depth - a[1].depth);
      if (rows.length) {
        console.log('\nintra-package depth:');
        for (const [name, info] of rows.slice(0, 8)) {
          console.log(`  · ${name}  depth=${info.depth}  files=${info.fileCount}`);
        }
      }
    }
    if (report.map.outsideConsumers?.length) {
      console.log('\noutside consumers:');
      for (const c of report.map.outsideConsumers.slice(0, 8)) {
        console.log(`  · ${c.package}  ×${c.count}`);
      }
    }
    if (report.map.declared) {
      const missing = report.map.declared.filter(d => d.missingInPackageJson.length);
      const rootN = report.map.declared.filter(d => d.inRootWorkspaceDeps).length;
      console.log(
        `\ndeclared: ${rootN}/${report.map.declared.length} in root workspace · ${missing.length} undeclared cross-imports`
      );
    }
    if (report.diff) {
      console.log('\ndiff vs previous:');
      console.log(
        `  score Δ=${report.diff.scoreDelta ?? 'n/a'} · orphan Δ=${report.diff.orphanDelta} · cycle Δ=${report.diff.cycleDelta}`
      );
      if (report.diff.addedOrphans.length)
        console.log(`  +orphans: ${report.diff.addedOrphans.join(', ')}`);
      if (report.diff.removedOrphans.length)
        console.log(`  -orphans: ${report.diff.removedOrphans.join(', ')}`);
    }
    if (report.fanOut.length) {
      console.log('\nfan-out (most outbound):');
      for (const h of report.fanOut.slice(0, 5)) {
        console.log(`  · ${h.path}  outbound=${h.outbound}`);
      }
    }
    if (report.hubs.length) {
      console.log('\nhubs (most inbound):');
      for (const h of report.hubs.slice(0, 5)) {
        console.log(`  · ${h.path}  inbound=${h.inbound}  ${h.bytes}B`);
      }
    }
    if (report.heaviest.length) {
      console.log('\nheaviest:');
      for (const h of report.heaviest.slice(0, 5)) {
        console.log(`  · ${h.path}  ${(h.bytes / 1024).toFixed(1)}KiB  imports=${h.importCount}`);
      }
    }
    if (report.orphans.length) {
      console.log('\norphans:');
      for (const o of report.orphans.slice(0, 30)) console.log(`  · ${o}`);
    }
    if (report.cycles.length) {
      console.log('\ncycles:');
      for (const c of report.cycles.slice(0, 5)) console.log(`  · ${c.join(' → ')}`);
    }
    if (report.crossCheck) {
      console.log('\ncross-check (Transpiler.scan):');
      console.log(
        `  deadFileCount=${report.crossCheck.deadFileCount} cycles=${report.crossCheck.cyclicDependencyCount}`
      );
      console.log(
        `  metafile-only: ${report.crossCheck.metafileOnlyOrphans.length} · transpiler-only: ${report.crossCheck.transpilerOnlyDead.length}`
      );
    }
    for (const n of report.notes) console.log(`note: ${n}`);
    console.log(`\n✅ ${outPath}`);
  }

  if (argvFlag('--strict')) {
    if (
      !report.buildSuccess ||
      report.totals.orphanCount > 0 ||
      report.totals.cycleCount > 0 ||
      report.grade === 'critical'
    ) {
      process.exitCode = 1;
    }
  }
}

if (import.meta.main) {
  await main();
}
