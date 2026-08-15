// @see https://bun.com/docs/test/code-coverage#enabling-coverage — --coverage
// @updated --coverage · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated --coverage · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @verified --coverage · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/test/code-coverage#enabling-coverage
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/environment-variables
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
// @see https://bun.com/reference/bun/Transpiler — Bun.Transpiler
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/transpiler — Bun.Transpiler
// @see https://bun.com/docs/runtime/transpiler#scan — .scan() imports/exports
// @see https://bun.com/docs/runtime/transpiler#scanimports — .scanImports()
// @see https://bun.com/docs/runtime/archive#quickstart — Bun.Archive
/**
 * Monorepo health score (0–100) — Bun-native metrics for FactoryWager.
 *
 * Structural health = 100
 *   − min(20, duplicateDepCount × 5)
 *   − min(25, deadCodePercent × 1)
 *   − min(35, largeFilePercent × 0.75)
 *   − min(20, cyclicDependencyCount × 5)
 *
 * Optional test and coverage observations are evidence, not score inputs. This
 * keeps the score comparable between the fast CI ratchet and an operator's
 * slower `--with-coverage` run.
 *
 * Import graph: Bun.Transpiler.scan / scanImports (not regex).
 * Target: score ≥ 90. CLI: `bun tools/monorepo-health.ts`
 */
import { bunSpawnArgs } from '../bun-executable.ts';
import { joinPath } from '../path-bun.ts';

export const MONOREPO_HEALTH_FORMULA_VERSION = 2 as const;

/** Default scan roots relative to monorepo root (FactoryWager layout). */
export const DEFAULT_SOURCE_GLOBS = [
  'lib/**/*.{ts,tsx}',
  'tools/**/*.{ts,tsx}',
  'packages/*/src/**/*.{ts,tsx}',
  'scripts/**/*.{ts,tsx}',
  'config/**/*.{ts,tsx}',
] as const;

export const DEFAULT_LARGE_LINE_THRESHOLD = 200;

export type MonorepoHealthMetrics = {
  duplicateDepCount: number;
  deadCodePercent: number;
  largeFilePercent: number;
  /** 0–100 when tests ran and emitted a summary; null when not measured. */
  testFailureRate: number | null;
  cyclicDependencyCount: number;
  /** 0–100 when coverage was parsed; null when not measured or unavailable. */
  testCoveragePercent: number | null;
};

export type MonorepoHealthBreakdown = {
  base: 100;
  duplicateDepPenalty: number;
  deadCodePenalty: number;
  largeFilePenalty: number;
  cyclePenalty: number;
};

export type MonorepoHealthScore = {
  score: number;
  grade: 'healthy' | 'needs-improvement' | 'critical';
  metrics: MonorepoHealthMetrics;
  breakdown: MonorepoHealthBreakdown;
  formulaVersion: typeof MONOREPO_HEALTH_FORMULA_VERSION;
};

export type MonorepoHealthReport = MonorepoHealthScore & {
  generatedAt: string;
  root: string;
  bunVersion: string;
  fileCount: number;
  largeFileCount: number;
  deadFileCount: number;
  workspacePackageCount: number;
  entrypointsUsed: string[];
  testsRun: boolean;
  buildRun: boolean;
  notes: string[];
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Grade bands for operator triage. */
export function gradeMonorepoHealth(score: number): MonorepoHealthScore['grade'] {
  if (score >= 90) return 'healthy';
  if (score >= 60) return 'needs-improvement';
  return 'critical';
}

/**
 * Pure formula — no I/O. Metrics must already be normalized (percents 0–100, counts ≥ 0).
 */
export function computeMonorepoHealth(metrics: MonorepoHealthMetrics): MonorepoHealthScore {
  const m: MonorepoHealthMetrics = {
    duplicateDepCount: Math.max(0, metrics.duplicateDepCount),
    deadCodePercent: clamp(metrics.deadCodePercent, 0, 100),
    largeFilePercent: clamp(metrics.largeFilePercent, 0, 100),
    testFailureRate:
      metrics.testFailureRate == null ? null : clamp(metrics.testFailureRate, 0, 100),
    cyclicDependencyCount: Math.max(0, metrics.cyclicDependencyCount),
    testCoveragePercent:
      metrics.testCoveragePercent == null ? null : clamp(metrics.testCoveragePercent, 0, 100),
  };

  const breakdown: MonorepoHealthBreakdown = {
    base: 100,
    duplicateDepPenalty: Math.min(20, m.duplicateDepCount * 5),
    deadCodePenalty: Math.min(25, m.deadCodePercent),
    largeFilePenalty: Math.min(35, m.largeFilePercent * 0.75),
    cyclePenalty: Math.min(20, m.cyclicDependencyCount * 5),
  };

  const raw =
    breakdown.base -
    breakdown.duplicateDepPenalty -
    breakdown.deadCodePenalty -
    breakdown.largeFilePenalty -
    breakdown.cyclePenalty;

  const score = Math.round(clamp(raw, 0, 100) * 10) / 10;

  return {
    score,
    grade: gradeMonorepoHealth(score),
    metrics: m,
    breakdown,
    formulaVersion: MONOREPO_HEALTH_FORMULA_VERSION,
  };
}

/** Count package.json dependency name → distinct version sets across workspaces. */
export async function countDuplicateDependencies(
  root: string,
  workspaceGlobs: string[] = ['packages/*']
): Promise<{ duplicateDepCount: number; workspacePackageCount: number }> {
  const packageJsonPaths = new Set<string>([joinPath(root, 'package.json')]);

  for (const pattern of workspaceGlobs) {
    const glob = new Bun.Glob(`${pattern}/package.json`);
    for await (const rel of glob.scan({ cwd: root, onlyFiles: true })) {
      packageJsonPaths.add(joinPath(root, rel));
    }
  }

  const versionsByName = new Map<string, Set<string>>();
  let workspacePackageCount = 0;

  for (const pkgPath of packageJsonPaths) {
    const f = Bun.file(pkgPath);
    if (!(await f.exists())) continue;
    workspacePackageCount++;
    try {
      const pkg = (await f.json()) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      for (const block of [pkg.dependencies, pkg.devDependencies]) {
        if (!block) continue;
        for (const [name, version] of Object.entries(block)) {
          if (name.startsWith('@types/')) continue;
          if (!versionsByName.has(name)) versionsByName.set(name, new Set());
          versionsByName.get(name)!.add(String(version));
        }
      }
    } catch {
      /* skip malformed */
    }
  }

  let duplicateDepCount = 0;
  for (const set of versionsByName.values()) {
    if (set.size > 1) duplicateDepCount++;
  }

  return { duplicateDepCount, workspacePackageCount };
}

/** Scan source globs; return absolute paths + large-file stats. */
export async function scanSourceFiles(
  root: string,
  globs: readonly string[] = DEFAULT_SOURCE_GLOBS,
  largeLineThreshold = DEFAULT_LARGE_LINE_THRESHOLD
): Promise<{
  files: string[];
  largeFileCount: number;
  largeFilePercent: number;
}> {
  const files: string[] = [];
  const seen = new Set<string>();

  for (const pattern of globs) {
    const g = new Bun.Glob(pattern);
    for await (const rel of g.scan({
      cwd: root,
      onlyFiles: true,
    })) {
      if (rel.includes('node_modules') || rel.includes('/dist/') || rel.endsWith('.d.ts')) {
        continue;
      }
      if (rel.includes('.test.') || rel.includes('.spec.') || rel.includes('.bench.')) continue;
      const abs = joinPath(root, rel);
      if (seen.has(abs)) continue;
      seen.add(abs);
      files.push(abs);
    }
  }

  let largeFileCount = 0;
  for (const abs of files) {
    try {
      const text = await Bun.file(abs).text();
      const lines = text.split('\n').length;
      if (lines > largeLineThreshold) largeFileCount++;
    } catch {
      /* unreadable */
    }
  }

  const largeFilePercent = files.length ? (largeFileCount / files.length) * 100 : 0;
  return { files, largeFileCount, largeFilePercent };
}

/** Count simple cycles in directed graph (adjacency lists). */
export function countCycles(adjacency: Map<string, string[]>): number {
  let cycles = 0;
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();

  for (const n of adjacency.keys()) color.set(n, WHITE);

  const visit = (u: string): void => {
    color.set(u, GRAY);
    for (const v of adjacency.get(u) ?? []) {
      if (!color.has(v)) color.set(v, WHITE);
      const c = color.get(v) ?? WHITE;
      if (c === GRAY) {
        cycles++;
      } else if (c === WHITE) {
        visit(v);
      }
    }
    color.set(u, BLACK);
  };

  for (const n of adjacency.keys()) {
    if ((color.get(n) ?? WHITE) === WHITE) visit(n);
  }
  return cycles;
}

type TranspilerLoader = 'ts' | 'tsx' | 'js' | 'jsx';

/** Cached transpilers — constructor loader is fixed; we pick by file extension. */
const transpilerByLoader: Record<TranspilerLoader, Bun.Transpiler> = {
  ts: new Bun.Transpiler({ loader: 'ts', target: 'bun' }),
  tsx: new Bun.Transpiler({ loader: 'tsx', target: 'bun' }),
  js: new Bun.Transpiler({ loader: 'js', target: 'bun' }),
  jsx: new Bun.Transpiler({ loader: 'jsx', target: 'bun' }),
};

/** Map file path → Bun.Transpiler loader. */
export function loaderForPath(path: string): TranspilerLoader {
  if (path.endsWith('.tsx')) return 'tsx';
  if (path.endsWith('.jsx')) return 'jsx';
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) return 'js';
  return 'ts';
}

export type ScannedImport = {
  path: string;
  kind: string;
};

export type ImportGraphEdge = {
  target: string;
  lazy: boolean;
};

export type ImportCycle = {
  cycle: string[];
  weak: boolean;
};

/**
 * Canonical cycle inventory shared by the advisory health score and the hard
 * import-graph ratchet. A sorted node signature deduplicates DFS discoveries.
 */
export function findImportCycles(graph: Map<string, ImportGraphEdge[]>): ImportCycle[] {
  const visited = new Set<string>();
  const raw: string[][] = [];

  const visit = (node: string, path: string[]): void => {
    const cycleStart = path.indexOf(node);
    if (cycleStart !== -1) {
      raw.push([...path.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    for (const edge of graph.get(node) ?? []) visit(edge.target, [...path, node]);
  };

  for (const node of graph.keys()) visit(node, []);

  const seen = new Set<string>();
  const cycles: ImportCycle[] = [];
  for (const cycle of raw) {
    const signature = cycle.slice(0, -1).sort().join('|');
    if (seen.has(signature)) continue;
    seen.add(signature);
    let weak = false;
    for (let i = 0; i < cycle.length - 1; i++) {
      const edge = graph.get(cycle[i]!)?.find(candidate => candidate.target === cycle[i + 1]);
      if (edge?.lazy) {
        weak = true;
        break;
      }
    }
    cycles.push({ cycle, weak });
  }
  return cycles;
}

/**
 * Bun.Transpiler import inventory (type-only imports ignored by Bun).
 *
 * Prefer **scanImports** over **scan**: on Bun 1.4, `scan()` can omit
 * `require()` edges while `scanImports()` still reports `require-call`.
 */
export function scanSourceImports(code: string, loader: TranspilerLoader = 'ts'): ScannedImport[] {
  const t = transpilerByLoader[loader];
  try {
    return t.scanImports(code).map(i => ({ path: i.path, kind: String(i.kind) }));
  } catch {
    try {
      const { imports } = t.scan(code);
      return imports.map(i => ({ path: i.path, kind: String(i.kind) }));
    } catch {
      return [];
    }
  }
}

/** Export names from Bun.Transpiler.scan (type-only exports ignored). */
export function scanSourceExports(code: string, loader: TranspilerLoader = 'ts'): string[] {
  const t = transpilerByLoader[loader];
  try {
    return t.scan(code).exports ?? [];
  } catch {
    return [];
  }
}

/** Resolve a relative import to an existing absolute path (ts/tsx/index). */
export async function resolveRelativeImport(
  fromFile: string,
  spec: string
): Promise<string | null> {
  const dir = fromFile.replace(/\/[^/]+$/, '');
  const base = joinPath(dir, spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    joinPath(base, 'index.ts'),
    joinPath(base, 'index.tsx'),
  ];
  for (const c of candidates) {
    if (await Bun.file(c).exists()) return c;
  }
  return null;
}

/**
 * Import graph via Bun.Transpiler.scan — orphan dead-code + cycle count.
 * Relative specs resolve into the scanned file set; package imports are tallied only.
 */
export async function analyzeImportGraph(
  allFiles: string[],
  entrypoints: string[]
): Promise<{
  deadCodePercent: number;
  deadFileCount: number;
  cyclicDependencyCount: number;
  entrypointsUsed: string[];
  packageImportEdges: number;
  notes: string[];
}> {
  const notes: string[] = [];
  const fileSet = new Set(allFiles);
  const existing: string[] = [];
  for (const ep of entrypoints) {
    if (await Bun.file(ep).exists()) existing.push(ep);
  }
  if (existing.length === 0) {
    notes.push('no entrypoints found — dead/cycle metrics zeroed');
    return {
      deadCodePercent: 0,
      deadFileCount: 0,
      cyclicDependencyCount: 0,
      entrypointsUsed: [],
      packageImportEdges: 0,
      notes,
    };
  }

  const adjacency = new Map<string, ImportGraphEdge[]>();
  let packageImportEdges = 0;
  let scanErrors = 0;

  for (const file of allFiles) {
    let text: string;
    try {
      text = await Bun.file(file).text();
    } catch {
      adjacency.set(file, []);
      continue;
    }

    let imports: ScannedImport[];
    try {
      imports = scanSourceImports(text, loaderForPath(file));
    } catch {
      scanErrors++;
      adjacency.set(file, []);
      continue;
    }

    const deps: ImportGraphEdge[] = [];
    for (const imp of imports) {
      const spec = imp.path;
      if (!spec.startsWith('.')) {
        packageImportEdges++;
        continue;
      }
      const resolved = await resolveRelativeImport(file, spec);
      if (resolved && fileSet.has(resolved)) {
        deps.push({ target: resolved, lazy: imp.kind === 'dynamic-import' });
      }
    }
    adjacency.set(file, deps);
  }

  const imported = new Set<string>();
  for (const deps of adjacency.values()) {
    for (const d of deps) imported.add(d.target);
  }
  const entrySet = new Set(existing);
  const scoped = allFiles.filter(f => f.includes('/lib/') || f.includes('/packages/'));
  let deadFileCount = 0;
  for (const f of scoped) {
    if (entrySet.has(f)) continue;
    if (!imported.has(f)) deadFileCount++;
  }
  const deadCodePercent = scoped.length ? (deadFileCount / scoped.length) * 100 : 0;

  // The blocking import gate owns lib/ + scripts/. Use that same perimeter for
  // the score so the two surfaces cannot disagree about the cycle population.
  const cycleGraph = new Map(
    [...adjacency.entries()]
      .filter(([file]) => file.includes('/lib/') || file.includes('/scripts/'))
      .map(([file, edges]) => [
        file,
        edges.filter(edge => edge.target.includes('/lib/') || edge.target.includes('/scripts/')),
      ])
  );
  const cycles = findImportCycles(cycleGraph);
  const cyclicDependencyCount = cycles.length;
  const strongCycles = cycles.filter(cycle => !cycle.weak).length;
  const weakCycles = cycles.length - strongCycles;
  notes.push(
    `import graph via Bun.Transpiler.scanImports; dead=orphan; package edges=${packageImportEdges}; cycles=${strongCycles} strong + ${weakCycles} weak (lib/scripts perimeter)`
  );
  if (scanErrors > 0) notes.push(`transpiler scan errors on ${scanErrors} file(s)`);

  return {
    deadCodePercent,
    deadFileCount,
    cyclicDependencyCount,
    entrypointsUsed: existing,
    packageImportEdges,
    notes,
  };
}

/** Best-effort parse of bun test summary lines. */
export function parseTestSummary(stdout: string): {
  pass: number;
  fail: number;
  testFailureRate: number | null;
} {
  // "  27 pass\n  0 fail" or "27 pass, 0 fail"
  let pass = 0;
  let fail = 0;
  const m1 = stdout.match(/(\d+)\s+pass/);
  const m2 = stdout.match(/(\d+)\s+fail/);
  if (m1) pass = Number(m1[1]);
  if (m2) fail = Number(m2[1]);
  const total = pass + fail;
  const testFailureRate = total > 0 ? (fail / total) * 100 : null;
  return { pass, fail, testFailureRate };
}

/**
 * Parse Bun's table coverage footer (`All files | % Funcs | % Lines | …`).
 * Prefer line coverage; fall back to function coverage. Returns null if absent.
 */
export function parseCoveragePercent(stdout: string): number | null {
  // All files                       |   27.78 |   19.58 |
  const m = stdout.match(/All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/i);
  if (m) {
    const funcs = Number(m[1]);
    const lines = Number(m[2]);
    const pick = Number.isFinite(lines) ? lines : funcs;
    if (Number.isFinite(pick)) return Math.max(0, Math.min(100, pick));
  }
  // LCOV-style or summary: "Lines        : 19.58% ( … )"
  const m2 = stdout.match(/Lines\s*:\s*([\d.]+)\s*%/i);
  if (m2) {
    const n = Number(m2[1]);
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
  }
  return null;
}

/** Default entrypoints for this monorepo (exist-checked at collect time). */
export function defaultEntrypoints(root: string): string[] {
  return [
    joinPath(root, 'lib/operations/index.ts'),
    joinPath(root, 'lib/monitoring/index.ts'),
    joinPath(root, 'lib/harness/proof.ts'),
    joinPath(root, 'packages/guards/src/bun-first-guard.ts'),
    joinPath(root, 'packages/registry-client/src/index.ts'),
  ];
}

export type CollectMonorepoHealthOpts = {
  root?: string;
  globs?: readonly string[];
  largeLineThreshold?: number;
  /** Run Bun.build metafile analysis (default true). */
  withBuild?: boolean;
  /** Run a focused bun test sample (default false — expensive). */
  withTests?: boolean;
  /**
   * When withTests, also pass `bun test --coverage` and parse All-files line %.
   * Implies withTests.
   */
  withCoverage?: boolean;
  testArgs?: string[];
};

/**
 * Collect metrics from disk + optional build/tests, then score.
 */
export async function collectMonorepoHealth(
  opts: CollectMonorepoHealthOpts = {}
): Promise<MonorepoHealthReport> {
  const root = opts.root ?? process.cwd();
  const withBuild = opts.withBuild !== false;
  const withCoverage = opts.withCoverage === true;
  const withTests = opts.withTests === true || withCoverage;
  const notes: string[] = [];

  const { files, largeFileCount, largeFilePercent } = await scanSourceFiles(
    root,
    opts.globs ?? DEFAULT_SOURCE_GLOBS,
    opts.largeLineThreshold ?? DEFAULT_LARGE_LINE_THRESHOLD
  );

  const { duplicateDepCount, workspacePackageCount } = await countDuplicateDependencies(root);

  let deadCodePercent = 0;
  let deadFileCount = 0;
  let cyclicDependencyCount = 0;
  let entrypointsUsed: string[] = [];

  if (withBuild) {
    const graph = await analyzeImportGraph(files, defaultEntrypoints(root));
    deadCodePercent = graph.deadCodePercent;
    deadFileCount = graph.deadFileCount;
    cyclicDependencyCount = graph.cyclicDependencyCount;
    entrypointsUsed = graph.entrypointsUsed;
    notes.push(...graph.notes);
    if (graph.packageImportEdges > 0) {
      notes.push(`package import edges (non-relative): ${graph.packageImportEdges}`);
    }
  } else {
    notes.push('import-graph analysis skipped (--no-build)');
  }

  let testFailureRate: number | null = null;
  let testCoveragePercent: number | null = null;
  let testsRun = false;

  if (withTests) {
    testsRun = true;
    const baseArgs = opts.testArgs ?? ['test', 'tests/monorepo-health.test.ts', '--timeout=30000'];
    const args =
      withCoverage && !baseArgs.includes('--coverage') ? [...baseArgs, '--coverage'] : baseArgs;
    const proc = Bun.spawn(bunSpawnArgs(args), {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env },
    });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    await proc.exited;
    const combined = out + '\n' + err;
    const summary = parseTestSummary(combined);
    testFailureRate = summary.testFailureRate;
    if (withCoverage) {
      testCoveragePercent = parseCoveragePercent(combined);
      if (testCoveragePercent != null) {
        notes.push(`coverage (line %) from bun test --coverage: ${testCoveragePercent.toFixed(2)}`);
      } else {
        notes.push('coverage requested but All-files line % not found in test output');
      }
    }
    if (summary.pass + summary.fail === 0) {
      notes.push('test run produced no pass/fail summary');
    }
  } else {
    notes.push('tests skipped (pass --with-tests / --with-coverage for failure rate + coverage)');
  }

  const scored = computeMonorepoHealth({
    duplicateDepCount,
    deadCodePercent,
    largeFilePercent,
    testFailureRate,
    cyclicDependencyCount,
    testCoveragePercent,
  });

  return {
    ...scored,
    generatedAt: new Date().toISOString(),
    root,
    bunVersion: Bun.version,
    fileCount: files.length,
    largeFileCount,
    deadFileCount,
    workspacePackageCount,
    entrypointsUsed,
    testsRun,
    buildRun: withBuild,
    notes,
  };
}

/** Persist JSON report; optionally tar via Bun.Archive. */
export async function writeMonorepoHealthArtifacts(
  report: MonorepoHealthReport,
  opts?: { outDir?: string; archive?: boolean }
): Promise<{ jsonPath: string; archivePath?: string }> {
  const outDir = opts?.outDir ?? joinPath(report.root, 'reports');
  await Bun.write(joinPath(outDir, '.keep'), '');
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const jsonPath = joinPath(outDir, `monorepo-health-${stamp}.json`);
  const latestPath = joinPath(outDir, 'monorepo-health-latest.json');
  const body = `${JSON.stringify(report, null, 2)}\n`;
  await Bun.write(jsonPath, body);
  await Bun.write(latestPath, body);

  let archivePath: string | undefined;
  if (opts?.archive) {
    try {
      // Bun.Archive — pack the JSON report for historical trend storage
      const Archive = Bun.Archive;
      if (Archive) {
        const arc = new Archive({
          'monorepo-health.json': body,
        });
        const bytes = await arc.bytes();
        archivePath = joinPath(outDir, `monorepo-health-${stamp}.tar`);
        await Bun.write(archivePath, bytes);
      }
    } catch {
      /* Archive optional */
    }
  }

  return { jsonPath, archivePath };
}
