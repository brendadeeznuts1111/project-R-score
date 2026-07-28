export type TestFileStatus = 'pass' | 'fail' | 'HANG';

export interface TestDurationRow {
  path: string;
  status: TestFileStatus;
  s: number;
  msg: string;
}

export interface DurationBalancedShard {
  shard: number;
  estimatedDurationSec: number;
  files: string[];
}

export interface DurationBalancedShardPlan {
  schemaVersion: 1;
  lane: string;
  algorithm: 'longest-processing-time-v1';
  shardCount: number;
  fileCount: number;
  totalDurationSec: number;
  shards: DurationBalancedShard[];
}

export interface DurationBalancedShardPlanOptions {
  lane: string;
  shardCount: number;
}

export interface TestInventoryLane {
  name: string;
  mode: 'serial';
  parallelProbe: boolean;
  runtime: 'bun';
  runtimeVersion: string;
  platform: string;
  architecture: string;
  timeoutMs: number;
}

export interface TestSuiteInventoryReport {
  schema: 'factorywager.test-suite-inventory';
  schemaVersion: 1;
  generatedAt: string;
  lane: TestInventoryLane;
  elapsedSec: number;
  counts: Record<TestFileStatus, number>;
  rows: TestDurationRow[];
  hangs: string[];
  fails: Array<Pick<TestDurationRow, 'path' | 'msg' | 's'>>;
  slow: TestDurationRow[];
  shardPlan?: DurationBalancedShardPlan;
}

export interface TestSuiteInventoryReportOptions {
  generatedAt: string;
  lane: TestInventoryLane;
  elapsedSec: number;
  shardCount?: number;
}

type PendingShard = {
  shard: number;
  totalCentiseconds: number;
  files: string[];
};

function comparePaths(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function durationCentiseconds(row: TestDurationRow): number {
  if (!Number.isFinite(row.s) || row.s < 0) {
    throw new TypeError(`duration must be a finite non-negative number: ${row.path}`);
  }
  return Math.round(row.s * 100);
}

/**
 * Assign the longest files first, always choosing the currently lightest shard.
 * Path and shard-number tie breakers make the output stable across input order.
 */
export function buildDurationBalancedShardPlan(
  rows: readonly TestDurationRow[],
  options: DurationBalancedShardPlanOptions
): DurationBalancedShardPlan {
  if (!Number.isSafeInteger(options.shardCount) || options.shardCount < 1) {
    throw new RangeError('shardCount must be a positive safe integer');
  }
  if (options.lane.trim() === '') {
    throw new TypeError('lane must be non-empty');
  }

  const seenPaths = new Set<string>();
  const ranked = rows.map(row => {
    if (row.path.trim() === '') throw new TypeError('test path must be non-empty');
    if (seenPaths.has(row.path)) throw new TypeError(`duplicate test path: ${row.path}`);
    seenPaths.add(row.path);
    return { row, centiseconds: durationCentiseconds(row) };
  });

  ranked.sort(
    (left, right) =>
      right.centiseconds - left.centiseconds || comparePaths(left.row.path, right.row.path)
  );

  const shards: PendingShard[] = Array.from({ length: options.shardCount }, (_, index) => ({
    shard: index + 1,
    totalCentiseconds: 0,
    files: [],
  }));

  for (const item of ranked) {
    const target = shards.reduce((best, candidate) => {
      if (candidate.totalCentiseconds < best.totalCentiseconds) return candidate;
      if (candidate.totalCentiseconds === best.totalCentiseconds && candidate.shard < best.shard) {
        return candidate;
      }
      return best;
    });
    target.files.push(item.row.path);
    target.totalCentiseconds += item.centiseconds;
  }

  const totalCentiseconds = shards.reduce((sum, shard) => sum + shard.totalCentiseconds, 0);
  return {
    schemaVersion: 1,
    lane: options.lane,
    algorithm: 'longest-processing-time-v1',
    shardCount: options.shardCount,
    fileCount: rows.length,
    totalDurationSec: totalCentiseconds / 100,
    shards: shards.map(shard => ({
      shard: shard.shard,
      estimatedDurationSec: shard.totalCentiseconds / 100,
      files: shard.files,
    })),
  };
}

/** Build the durable report without truncating the per-file timing evidence. */
export function buildTestSuiteInventoryReport(
  rows: readonly TestDurationRow[],
  options: TestSuiteInventoryReportOptions
): TestSuiteInventoryReport {
  const retainedRows = rows.map(row => ({ ...row }));
  const counts: Record<TestFileStatus, number> = {
    pass: retainedRows.filter(row => row.status === 'pass').length,
    fail: retainedRows.filter(row => row.status === 'fail').length,
    HANG: retainedRows.filter(row => row.status === 'HANG').length,
  };
  const report: TestSuiteInventoryReport = {
    schema: 'factorywager.test-suite-inventory',
    schemaVersion: 1,
    generatedAt: options.generatedAt,
    lane: { ...options.lane },
    elapsedSec: options.elapsedSec,
    counts,
    rows: retainedRows,
    hangs: retainedRows.filter(row => row.status === 'HANG').map(row => row.path),
    fails: retainedRows
      .filter(row => row.status === 'fail')
      .map(row => ({ path: row.path, msg: row.msg, s: row.s })),
    slow: [...retainedRows]
      .filter(row => row.s >= 3)
      .sort((left, right) => right.s - left.s || comparePaths(left.path, right.path))
      .slice(0, 30),
  };
  if (options.shardCount !== undefined) {
    report.shardPlan = buildDurationBalancedShardPlan(retainedRows, {
      lane: options.lane.name,
      shardCount: options.shardCount,
    });
  }
  return report;
}
