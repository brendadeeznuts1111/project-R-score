// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * SQLite history for monorepo-health scores (trend / delta).
 * Default path: reports/monorepo-health-history.sqlite
 */
import { Database } from 'bun:sqlite';
import { joinPath } from '../path-bun.ts';
import type { MonorepoHealthReport } from './monorepo-health.ts';

export type HealthHistoryRow = {
  id: number;
  generatedAt: string;
  score: number;
  grade: string;
  bunVersion: string;
  formulaVersion: number;
  fileCount: number;
  deadFileCount: number;
  largeFileCount: number;
  workspacePackageCount: number;
  cyclicDependencyCount: number;
  duplicateDepCount: number;
  deadCodePercent: number;
  largeFilePercent: number;
  testFailureRate: number;
  testCoveragePercent: number;
  testsRun: number;
  buildRun: number;
};

export type HealthTrend = {
  samples: number;
  latest: HealthHistoryRow | null;
  previous: HealthHistoryRow | null;
  /** latest.score − previous.score (null if &lt; 2 samples). */
  delta: number | null;
  /** Mean score over last N samples. */
  avgScore: number | null;
  /** Min/max over last N. */
  minScore: number | null;
  maxScore: number | null;
  direction: 'up' | 'down' | 'flat' | 'unknown';
  historyPath: string;
};

export function defaultHealthHistoryPath(root: string): string {
  return joinPath(root, 'reports', 'monorepo-health-history.sqlite');
}

export function openHealthHistory(dbPath: string): Database {
  const db = new Database(dbPath, { create: true });
  db.run(`
    CREATE TABLE IF NOT EXISTS monorepo_health_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generated_at TEXT NOT NULL,
      score REAL NOT NULL,
      grade TEXT NOT NULL,
      bun_version TEXT NOT NULL,
      formula_version INTEGER NOT NULL,
      file_count INTEGER NOT NULL,
      dead_file_count INTEGER NOT NULL,
      large_file_count INTEGER NOT NULL,
      workspace_package_count INTEGER NOT NULL,
      cyclic_dependency_count INTEGER NOT NULL,
      duplicate_dep_count INTEGER NOT NULL,
      dead_code_percent REAL NOT NULL,
      large_file_percent REAL NOT NULL,
      test_failure_rate REAL NOT NULL,
      test_coverage_percent REAL NOT NULL,
      tests_run INTEGER NOT NULL,
      build_run INTEGER NOT NULL
    );
  `);
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_monorepo_health_runs_generated
     ON monorepo_health_runs(generated_at DESC);`
  );
  return db;
}

export function recordHealthRun(db: Database, report: MonorepoHealthReport): number {
  const result = db
    .query(
      `INSERT INTO monorepo_health_runs (
        generated_at, score, grade, bun_version, formula_version,
        file_count, dead_file_count, large_file_count, workspace_package_count,
        cyclic_dependency_count, duplicate_dep_count,
        dead_code_percent, large_file_percent, test_failure_rate, test_coverage_percent,
        tests_run, build_run
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      report.generatedAt,
      report.score,
      report.grade,
      report.bunVersion,
      report.formulaVersion,
      report.fileCount,
      report.deadFileCount,
      report.largeFileCount,
      report.workspacePackageCount,
      report.metrics.cyclicDependencyCount,
      report.metrics.duplicateDepCount,
      report.metrics.deadCodePercent,
      report.metrics.largeFilePercent,
      report.metrics.testFailureRate,
      report.metrics.testCoveragePercent,
      report.testsRun ? 1 : 0,
      report.buildRun ? 1 : 0
    );
  return Number(result.lastInsertRowid);
}

function mapRow(r: Record<string, unknown>): HealthHistoryRow {
  return {
    id: Number(r.id),
    generatedAt: String(r.generated_at),
    score: Number(r.score),
    grade: String(r.grade),
    bunVersion: String(r.bun_version),
    formulaVersion: Number(r.formula_version),
    fileCount: Number(r.file_count),
    deadFileCount: Number(r.dead_file_count),
    largeFileCount: Number(r.large_file_count),
    workspacePackageCount: Number(r.workspace_package_count),
    cyclicDependencyCount: Number(r.cyclic_dependency_count),
    duplicateDepCount: Number(r.duplicate_dep_count),
    deadCodePercent: Number(r.dead_code_percent),
    largeFilePercent: Number(r.large_file_percent),
    testFailureRate: Number(r.test_failure_rate),
    testCoveragePercent: Number(r.test_coverage_percent),
    testsRun: Number(r.tests_run),
    buildRun: Number(r.build_run),
  };
}

export function listRecentHealthRuns(db: Database, limit = 12): HealthHistoryRow[] {
  const rows = db
    .query(
      `SELECT * FROM monorepo_health_runs
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(limit) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export function computeHealthTrend(
  db: Database,
  opts?: { limit?: number; historyPath?: string }
): HealthTrend {
  const historyPath = opts?.historyPath ?? '';
  const rows = listRecentHealthRuns(db, opts?.limit ?? 12);
  const latest = rows[0] ?? null;
  const previous = rows[1] ?? null;
  let delta: number | null = null;
  let direction: HealthTrend['direction'] = 'unknown';
  if (latest && previous) {
    delta = Number((latest.score - previous.score).toFixed(1));
    if (delta > 0.05) direction = 'up';
    else if (delta < -0.05) direction = 'down';
    else direction = 'flat';
  }
  const scores = rows.map(r => r.score);
  const avgScore =
    scores.length > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
      : null;
  return {
    samples: rows.length,
    latest,
    previous,
    delta,
    avgScore,
    minScore: scores.length ? Math.min(...scores) : null,
    maxScore: scores.length ? Math.max(...scores) : null,
    direction,
    historyPath,
  };
}

/** Open (or create) history DB, insert report, return trend snapshot. */
export async function appendHealthHistory(
  report: MonorepoHealthReport,
  opts?: { historyPath?: string; trendLimit?: number }
): Promise<{ id: number; trend: HealthTrend; historyPath: string }> {
  const historyPath = opts?.historyPath ?? defaultHealthHistoryPath(report.root);
  const parent = historyPath.replace(/[/\\][^/\\]+$/, '');
  await Bun.write(joinPath(parent, '.keep'), '');
  const db = openHealthHistory(historyPath);
  try {
    const id = recordHealthRun(db, report);
    const trend = computeHealthTrend(db, {
      limit: opts?.trendLimit ?? 12,
      historyPath,
    });
    return { id, trend, historyPath };
  } finally {
    db.close();
  }
}
