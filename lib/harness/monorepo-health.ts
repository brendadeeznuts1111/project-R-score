// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/bundler/index#metafile — Bun.build metafile
// @see https://bun.com/docs/runtime/archive#quickstart — Bun.Archive
/**
 * Monorepo health score (0–100) — Bun-native metrics for FactoryWager.
 *
 * Health = 100
 *   − (duplicateDepCount × 2)
 *   − (deadCodePercent × 0.5)
 *   − (largeFilePercent × 1)
 *   − (testFailureRate × 5)
 *   − (cyclicDependencyCount × 1.5)
 *   + (testCoveragePercent × 0.2)
 *
 * Target: score ≥ 90. CLI: `bun tools/monorepo-health.ts`
 */
import { joinPath } from '../path-bun.ts';

export const MONOREPO_HEALTH_FORMULA_VERSION = 1 as const;

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
  /** 0–100; 0 when tests not run. */
  testFailureRate: number;
  cyclicDependencyCount: number;
  /** 0–100; 0 when coverage not available. */
  testCoveragePercent: number;
};

export type MonorepoHealthBreakdown = {
  base: 100;
  duplicateDepPenalty: number;
  deadCodePenalty: number;
  largeFilePenalty: number;
  testFailurePenalty: number;
  cyclePenalty: number;
  coverageBonus: number;
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
    testFailureRate: clamp(metrics.testFailureRate, 0, 100),
    cyclicDependencyCount: Math.max(0, metrics.cyclicDependencyCount),
    testCoveragePercent: clamp(metrics.testCoveragePercent, 0, 100),
  };

  const breakdown: MonorepoHealthBreakdown = {
    base: 100,
    duplicateDepPenalty: m.duplicateDepCount * 2,
    deadCodePenalty: m.deadCodePercent * 0.5,
    largeFilePenalty: m.largeFilePercent * 1,
    testFailurePenalty: m.testFailureRate * 5,
    cyclePenalty: m.cyclicDependencyCount * 1.5,
    coverageBonus: m.testCoveragePercent * 0.2,
  };

  const raw =
    breakdown.base -
    breakdown.duplicateDepPenalty -
    breakdown.deadCodePenalty -
    breakdown.largeFilePenalty -
    breakdown.testFailurePenalty -
    breakdown.cyclePenalty +
    breakdown.coverageBonus;

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

const REL_IMPORT_RE =
  /(?:import|export)(?:[\s\S]*?\sfrom\s*|[\s]+)['"](\.[^'"]+)['"]|require\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;

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
 * Relative-import graph for dead-code reachability + cycle count.
 * More reliable than metafile+external:* for a multi-package monorepo.
 */
export async function analyzeImportGraph(
  allFiles: string[],
  entrypoints: string[]
): Promise<{
  deadCodePercent: number;
  deadFileCount: number;
  cyclicDependencyCount: number;
  entrypointsUsed: string[];
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
      notes,
    };
  }

  const adjacency = new Map<string, string[]>();
  for (const file of allFiles) {
    let text: string;
    try {
      text = await Bun.file(file).text();
    } catch {
      adjacency.set(file, []);
      continue;
    }
    const deps: string[] = [];
    REL_IMPORT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = REL_IMPORT_RE.exec(text)) !== null) {
      const spec = m[1] ?? m[2];
      if (!spec) continue;
      const resolved = await resolveRelativeImport(file, spec);
      if (resolved && fileSet.has(resolved)) deps.push(resolved);
    }
    adjacency.set(file, deps);
  }

  // Dead = never the target of a relative import (orphan), excluding entrypoints.
  const imported = new Set<string>();
  for (const deps of adjacency.values()) {
    for (const d of deps) imported.add(d);
  }
  const entrySet = new Set(existing);
  const scoped = allFiles.filter(f => f.includes('/lib/') || f.includes('/packages/'));
  let deadFileCount = 0;
  for (const f of scoped) {
    if (entrySet.has(f)) continue;
    if (!imported.has(f)) deadFileCount++;
  }
  const deadCodePercent = scoped.length ? (deadFileCount / scoped.length) * 100 : 0;

  // Cap cycle signal: unique back-edges can overcount; use min(count, files/10)
  const rawCycles = countCycles(adjacency);
  const cyclicDependencyCount = Math.min(rawCycles, Math.max(5, Math.floor(allFiles.length / 50)));
  notes.push(
    `dead=orphan (never imported); cycles raw=${rawCycles} capped=${cyclicDependencyCount}`
  );

  return {
    deadCodePercent,
    deadFileCount,
    cyclicDependencyCount,
    entrypointsUsed: existing,
    notes,
  };
}

/** Best-effort parse of bun test summary lines. */
export function parseTestSummary(stdout: string): {
  pass: number;
  fail: number;
  testFailureRate: number;
} {
  // "  27 pass\n  0 fail" or "27 pass, 0 fail"
  let pass = 0;
  let fail = 0;
  const m1 = stdout.match(/(\d+)\s+pass/);
  const m2 = stdout.match(/(\d+)\s+fail/);
  if (m1) pass = Number(m1[1]);
  if (m2) fail = Number(m2[1]);
  const total = pass + fail;
  const testFailureRate = total > 0 ? (fail / total) * 100 : 0;
  return { pass, fail, testFailureRate };
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
  const withTests = opts.withTests === true;
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
  } else {
    notes.push('import-graph analysis skipped (--no-build)');
  }

  let testFailureRate = 0;
  let testCoveragePercent = 0;
  let testsRun = false;

  if (withTests) {
    testsRun = true;
    const args = opts.testArgs ?? ['test', 'tests/monorepo-health.test.ts', '--timeout=30000'];
    const proc = Bun.spawn(['bun', ...args], {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    await proc.exited;
    const summary = parseTestSummary(out + '\n' + err);
    testFailureRate = summary.testFailureRate;
    // Coverage requires --coverage; leave 0 unless we parse it later
    if (summary.pass + summary.fail === 0) {
      notes.push('test run produced no pass/fail summary');
    }
  } else {
    notes.push('tests skipped (pass --with-tests for failure rate)');
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
      const Archive = (
        Bun as unknown as {
          Archive?: new (files: Record<string, Blob | string>) => {
            bytes: () => Promise<Uint8Array> | Uint8Array;
          };
        }
      ).Archive;
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
