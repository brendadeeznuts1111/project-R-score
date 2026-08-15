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
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
/**
 * Compact monorepo-health projection for ops-summary, edge /api/health, and TOC portal.
 *
 * Baked artifact: public/registry/monorepo-health.json
 * (`bun run check:monorepo-health` · `ops:snapshot` · `bun run monorepo:health:bake`).
 *
 * @see lib/harness/monorepo-health.ts
 * @see docs/harness/tenants/monorepo-health.md
 * @see claim monorepo-health-score
 */
import { joinPath } from '../path-bun.ts';
import type { MonorepoHealthReport } from '../harness/monorepo-health.ts';

export const MONOREPO_HEALTH_REGISTRY_REL = 'public/registry/monorepo-health.json';
export const MONOREPO_HEALTH_REGISTRY_PATH = '/registry/monorepo-health.json' as const;
export const MONOREPO_HEALTH_PORTAL_PACKAGES = '/portal/packages/' as const;
export const MONOREPO_HEALTH_CLAIM = 'monorepo-health-score' as const;

export type MonorepoHealthSummarySlice = {
  available: boolean;
  ok: boolean | null;
  score: number | null;
  grade: 'healthy' | 'needs-improvement' | 'critical' | null;
  formulaVersion: number | null;
  bunVersion: string | null;
  fileCount: number | null;
  largeFileCount: number | null;
  deadFileCount: number | null;
  cyclicDependencyCount: number | null;
  duplicateDepCount: number | null;
  deadCodePercent: number | null;
  largeFilePercent: number | null;
  testCoveragePercent: number | null;
  generatedAt: string | null;
  path: typeof MONOREPO_HEALTH_REGISTRY_PATH;
  portal: typeof MONOREPO_HEALTH_PORTAL_PACKAGES;
  claim: typeof MONOREPO_HEALTH_CLAIM;
  gate: 'check:monorepo-health';
};

/** Public registry bake (Pages-safe; no absolute root paths). */
export type MonorepoHealthRegistryBake = {
  schemaVersion: 2;
  kind: 'monorepo-health';
  claim: typeof MONOREPO_HEALTH_CLAIM;
  gate: 'check:monorepo-health';
  path: typeof MONOREPO_HEALTH_REGISTRY_PATH;
  portal: typeof MONOREPO_HEALTH_PORTAL_PACKAGES;
  generatedAt: string;
  bunVersion: string;
  score: number;
  grade: MonorepoHealthReport['grade'];
  formulaVersion: number;
  metrics: MonorepoHealthReport['metrics'];
  breakdown: MonorepoHealthReport['breakdown'];
  fileCount: number;
  largeFileCount: number;
  deadFileCount: number;
  workspacePackageCount: number;
  testsRun: boolean;
  buildRun: boolean;
  notes: string[];
};

export type MonorepoHealthHealthArtifact = {
  exists: boolean;
  ok: boolean | null;
  score: number | null;
  grade: string | null;
  path: typeof MONOREPO_HEALTH_REGISTRY_PATH;
  portal: typeof MONOREPO_HEALTH_PORTAL_PACKAGES;
  claim: typeof MONOREPO_HEALTH_CLAIM;
  generatedAt: string | null;
};

function emptyUnavailable(): MonorepoHealthSummarySlice {
  return {
    available: false,
    ok: null,
    score: null,
    grade: null,
    formulaVersion: null,
    bunVersion: null,
    fileCount: null,
    largeFileCount: null,
    deadFileCount: null,
    cyclicDependencyCount: null,
    duplicateDepCount: null,
    deadCodePercent: null,
    largeFilePercent: null,
    testCoveragePercent: null,
    generatedAt: null,
    path: MONOREPO_HEALTH_REGISTRY_PATH,
    portal: MONOREPO_HEALTH_PORTAL_PACKAGES,
    claim: MONOREPO_HEALTH_CLAIM,
    gate: 'check:monorepo-health',
  };
}

export function projectMonorepoHealthBake(
  bake: MonorepoHealthRegistryBake | null | undefined
): MonorepoHealthSummarySlice {
  if (!bake || bake.kind !== 'monorepo-health') return emptyUnavailable();
  const ok = bake.grade === 'healthy' || bake.grade === 'needs-improvement';
  return {
    available: true,
    ok,
    score: bake.score,
    grade: bake.grade,
    formulaVersion: bake.formulaVersion,
    bunVersion: bake.bunVersion,
    fileCount: bake.fileCount,
    largeFileCount: bake.largeFileCount,
    deadFileCount: bake.deadFileCount,
    cyclicDependencyCount: bake.metrics?.cyclicDependencyCount ?? null,
    duplicateDepCount: bake.metrics?.duplicateDepCount ?? null,
    deadCodePercent: bake.metrics?.deadCodePercent ?? null,
    largeFilePercent: bake.metrics?.largeFilePercent ?? null,
    testCoveragePercent: bake.metrics?.testCoveragePercent ?? null,
    generatedAt: bake.generatedAt ?? null,
    path: MONOREPO_HEALTH_REGISTRY_PATH,
    portal: MONOREPO_HEALTH_PORTAL_PACKAGES,
    claim: MONOREPO_HEALTH_CLAIM,
    gate: 'check:monorepo-health',
  };
}

export function projectMonorepoHealthHealthArtifact(
  bake: MonorepoHealthRegistryBake | null | undefined
): MonorepoHealthHealthArtifact {
  const slice = projectMonorepoHealthBake(bake);
  return {
    exists: slice.available,
    ok: slice.ok,
    score: slice.score,
    grade: slice.grade,
    path: MONOREPO_HEALTH_REGISTRY_PATH,
    portal: MONOREPO_HEALTH_PORTAL_PACKAGES,
    claim: MONOREPO_HEALTH_CLAIM,
    generatedAt: slice.generatedAt,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatMetrics(m: MonorepoHealthReport['metrics']): MonorepoHealthReport['metrics'] {
  return {
    duplicateDepCount: m.duplicateDepCount,
    deadCodePercent: round1(m.deadCodePercent),
    largeFilePercent: round1(m.largeFilePercent),
    testFailureRate: m.testFailureRate == null ? null : round1(m.testFailureRate),
    cyclicDependencyCount: m.cyclicDependencyCount,
    testCoveragePercent: m.testCoveragePercent == null ? null : round1(m.testCoveragePercent),
  };
}

function formatBreakdown(b: MonorepoHealthReport['breakdown']): MonorepoHealthReport['breakdown'] {
  return {
    base: b.base,
    duplicateDepPenalty: round1(b.duplicateDepPenalty),
    deadCodePenalty: round1(b.deadCodePenalty),
    largeFilePenalty: round1(b.largeFilePenalty),
    cyclePenalty: round1(b.cyclePenalty),
  };
}

export function reportToRegistryBake(report: MonorepoHealthReport): MonorepoHealthRegistryBake {
  const metrics = formatMetrics(report.metrics);
  const breakdown = formatBreakdown(report.breakdown);
  return {
    schemaVersion: 2,
    kind: 'monorepo-health',
    claim: MONOREPO_HEALTH_CLAIM,
    gate: 'check:monorepo-health',
    path: MONOREPO_HEALTH_REGISTRY_PATH,
    portal: MONOREPO_HEALTH_PORTAL_PACKAGES,
    generatedAt: report.generatedAt,
    bunVersion: report.bunVersion,
    score: round1(report.score),
    grade: report.grade,
    formulaVersion: report.formulaVersion,
    metrics,
    breakdown,
    fileCount: report.fileCount,
    largeFileCount: report.largeFileCount,
    deadFileCount: report.deadFileCount,
    workspacePackageCount: report.workspacePackageCount,
    testsRun: report.testsRun,
    buildRun: report.buildRun,
    notes: report.notes.slice(0, 24),
  };
}

function bakeAbsPath(root = process.cwd()): string {
  return joinPath(root, MONOREPO_HEALTH_REGISTRY_REL);
}

export function loadMonorepoHealthSummarySliceSync(
  root = process.cwd()
): MonorepoHealthSummarySlice {
  try {
    const mapped = Bun.mmap(bakeAbsPath(root));
    const bake = JSON.parse(new TextDecoder().decode(mapped)) as MonorepoHealthRegistryBake;
    return projectMonorepoHealthBake(bake);
  } catch {
    return emptyUnavailable();
  }
}

export async function loadMonorepoHealthBake(
  root = process.cwd()
): Promise<MonorepoHealthRegistryBake | null> {
  try {
    const f = Bun.file(bakeAbsPath(root));
    if (!(await f.exists())) return null;
    return (await f.json()) as MonorepoHealthRegistryBake;
  } catch {
    return null;
  }
}

/** Collect + write public/registry/monorepo-health.json (+ reports/ latest). */
export async function bakeMonorepoHealthRegistry(opts?: {
  root?: string;
  withBuild?: boolean;
  log?: boolean;
}): Promise<MonorepoHealthRegistryBake> {
  const root = opts?.root ?? process.cwd();
  const { collectMonorepoHealth, writeMonorepoHealthArtifacts } =
    await import('../harness/monorepo-health.ts');
  const report = await collectMonorepoHealth({
    root,
    withBuild: opts?.withBuild !== false,
    withTests: false,
    withCoverage: false,
  });
  await writeMonorepoHealthArtifacts(report, { archive: false });
  const bake = reportToRegistryBake(report);
  const out = bakeAbsPath(root);
  await Bun.write(out, JSON.stringify(bake, null, 2) + '\n');
  if (opts?.log !== false) {
    console.info(
      `[monorepo-health] bake → ${MONOREPO_HEALTH_REGISTRY_PATH} · score ${bake.score}/100 (${bake.grade})`
    );
  }
  return bake;
}

export const loadMonorepoHealthSummarySlice = loadMonorepoHealthSummarySliceSync;
