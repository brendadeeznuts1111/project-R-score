// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Aggregate registry + ops metrics for the monitoring dashboard.
 */
import type { Database } from 'bun:sqlite';
import { joinPath } from '../path-bun';
import {
  loadComplianceMonitoringSlice,
  type ComplianceMonitoringSlice,
} from './compliance-slice.ts';
import { loadLimitRaisesMonitoringSlice, type LimitRaisesMonitoringSlice } from './limit-slice.ts';
import {
  collectInstallCacheMonitoringSlice,
  type InstallCacheMonitoringSlice,
} from './install-cache-slice.ts';
import {
  loadInstallHygieneMonitoringSlice,
  type InstallHygieneMonitoringSlice,
} from './install-hygiene-slice.ts';
import { ensureMonitoringSchema } from './schema.ts';

export type IntegritySnapshot = {
  status: string;
  timestamp: string | null;
  failures: number;
  /** When populated from reports/registry-integrity.json (factory spine). */
  source?: 'sqlite' | 'file' | 'unknown';
};

/** Networking proof — connection reuse, preconnect efficiency, fetch perf. */
export type NetworkingChecksReport = {
  schemaVersion: number;
  bunVersion: string;
  bunRevision: string;
  timestamp: string;
  base: string;
  totalTargets: number;
  allOk: boolean;
  proofHash: string;
  targets: Array<{
    name: string;
    summary: {
      protocol: string;
      reuseEfficiency: number;
      coldFetchMs: number;
      warmFetchMs: number;
      statusCode: number;
      bodySize: number;
    };
  }>;
};

export type MonitoringPayload = {
  source: 'live' | 'snapshot';
  uptime: string;
  uptimeMs: number;
  packageCount: number;
  versionCount: number;
  lastIntegrity: IntegritySnapshot;
  platformSummary: Record<string, number>;
  platformApiAvailable: { yes: number; no: number };
  dodQueue: number;
  dodByStatus: Record<string, number>;
  experimentsActive: number;
  predictionN: number;
  /** ISO timestamp when this payload was built (same as snapshotAt for Pages). */
  timestamp: string;
  /** Alias of timestamp — Pages has no process uptime; prefer this label in UI. */
  snapshotAt: string;
  /** Networking connection reuse proof (from verify-networking.ts). */
  networkingProof?: NetworkingChecksReport;
  /** Optional Bun API demo proof (attached by serve-public / enriched snapshots). */
  bunApiProof?: {
    demosPassed?: number;
    demosTotal?: number;
    apisVerified?: number;
    demoPassRate?: string;
    generated?: string;
  };
  /** Optional route probe stats. */
  routeStats?: {
    routing?: {
      passed?: number;
      total?: number;
      httpOk?: number;
      criticalFailed?: number;
      p95Ms?: number;
      errorRate?: number;
      proofHash?: string;
      baseUrl?: string;
      routes?: Array<{
        path: string;
        status: number;
        pass: boolean;
        critical?: boolean;
        timeMs?: number;
        contentType?: string;
      }>;
    };
  };
  /** Optional env check summary. */
  env?: {
    summary?: {
      total?: number;
      ok?: number;
      missing?: number;
      requiredMissing?: number;
    };
    table?: Array<{
      Key: string;
      Group?: string;
      Severity?: string;
      Status?: string;
      Detail?: string;
    }>;
  };
  /** Compact proof slices (ops:snapshot enrichment). */
  registryClientProof?: Record<string, unknown>;
  docsCoverageProof?: Record<string, unknown>;
  /**
   * Compliance board slice for monitoring tile + portal cross-link.
   * Baked into monitoring.json (no live SQLite required on Pages).
   */
  compliance?: ComplianceMonitoringSlice;
  /**
   * Limit-raises bake slice for monitoring tile + /portal/limits/.
   * Baked into monitoring.json from public/registry/limit-raises.json.
   */
  limitRaises?: LimitRaisesMonitoringSlice;
  /**
   * Bun PM cache size + prune threshold for install hygiene.
   */
  installCache?: InstallCacheMonitoringSlice;
  /**
   * Install-hygiene audit report slice (cache + npm-install + install:verify).
   */
  installHygiene?: InstallHygieneMonitoringSlice;
};

const REGISTRY_INTEGRITY_FILE = joinPath(import.meta.dir, '../../reports/registry-integrity.json');

const processStart = Date.now();

export function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
}

export type RegistryIndex = {
  packages?: Record<
    string,
    {
      versions?: string[];
    }
  >;
};

export async function loadRegistryIndex(
  path = 'public/registry/registry.json'
): Promise<RegistryIndex> {
  const file = Bun.file(path);
  if (await file.exists()) {
    return (await file.json()) as RegistryIndex;
  }
  return {};
}

export function countPackages(registry: RegistryIndex): {
  packageCount: number;
  versionCount: number;
} {
  const packages = registry.packages ?? {};
  const packageCount = Object.keys(packages).length;
  let versionCount = 0;
  for (const pkg of Object.values(packages)) {
    versionCount += pkg.versions?.length ?? 0;
  }
  return { packageCount, versionCount };
}

function tableExists(db: Database, name: string): boolean {
  const row = db
    .query(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = $n LIMIT 1`)
    .get({ $n: name }) as { ok: number } | null;
  return row != null;
}

export function recordIntegrityCheck(
  db: Database,
  input: { status: string; failures: number; details?: string }
): void {
  ensureMonitoringSchema(db);
  db.run(
    `INSERT INTO integrity_checks (id, status, failures, timestamp, details)
     VALUES ($id, $s, $f, $t, $d)`,
    {
      $id: Bun.randomUUIDv7(),
      $s: input.status,
      $f: input.failures,
      $t: new Date().toISOString(),
      $d: input.details ?? null,
    }
  );
}

export function getLastIntegrity(db: Database): IntegritySnapshot {
  ensureMonitoringSchema(db);
  try {
    const row = db
      .query(
        `SELECT status, timestamp, failures FROM integrity_checks
         ORDER BY timestamp DESC LIMIT 1`
      )
      .get() as { status: string; timestamp: string; failures: number } | null;
    if (!row) return { status: 'unknown', timestamp: null, failures: 0, source: 'unknown' };
    return {
      status: row.status,
      timestamp: row.timestamp,
      failures: row.failures,
      source: 'sqlite',
    };
  } catch {
    return { status: 'unknown', timestamp: null, failures: 0, source: 'unknown' };
  }
}

type RegistryIntegrityFile = {
  checkedAt?: string;
  failures?: Array<unknown>;
};

/** Read factory spine integrity report (reports/registry-integrity.json). */
export async function readRegistryIntegrityFile(): Promise<IntegritySnapshot | undefined> {
  const file = Bun.file(REGISTRY_INTEGRITY_FILE);
  if (!(await file.exists())) return undefined;
  try {
    const parsed = (await file.json()) as RegistryIntegrityFile;
    const failures = parsed.failures?.length ?? 0;
    return {
      status: failures > 0 ? 'failed' : 'ok',
      timestamp: parsed.checkedAt ?? null,
      failures,
      source: 'file',
    };
  } catch {
    return undefined;
  }
}

export function mergeIntegritySnapshots(
  sqlite: IntegritySnapshot,
  file?: IntegritySnapshot
): IntegritySnapshot {
  if (!file) return sqlite;
  if (sqlite.source === 'unknown') return file;
  const sqliteTs = sqlite.timestamp ? Date.parse(sqlite.timestamp) : NaN;
  const fileTs = file.timestamp ? Date.parse(file.timestamp) : NaN;
  if (Number.isFinite(fileTs) && (!Number.isFinite(sqliteTs) || fileTs > sqliteTs)) return file;
  return sqlite;
}

export async function collectMonitoring(
  db: Database,
  opts?: { source?: 'live' | 'snapshot'; registryPath?: string; uptimeOriginMs?: number }
): Promise<MonitoringPayload> {
  const origin = opts?.uptimeOriginMs ?? processStart;
  const uptimeMs = Date.now() - origin;
  const registry = await loadRegistryIndex(opts?.registryPath);
  const { packageCount, versionCount } = countPackages(registry);

  const lastIntegrity = mergeIntegritySnapshots(
    getLastIntegrity(db),
    await readRegistryIntegrityFile()
  );

  const platformSummary: Record<string, number> = {};
  let apiYes = 0;
  let apiNo = 0;
  if (tableExists(db, 'platforms')) {
    const byStatus = db
      .query(
        `SELECT COALESCE(status, 'unknown') AS st, COUNT(*) AS c
         FROM platforms
         WHERE COALESCE(active, 1) = 1
         GROUP BY st`
      )
      .all() as Array<{ st: string; c: number }>;
    for (const r of byStatus) platformSummary[r.st] = r.c;

    const apiRows = db
      .query(
        `SELECT COALESCE(api_available, 0) AS a, COUNT(*) AS c
         FROM platforms WHERE COALESCE(active, 1) = 1
         GROUP BY a`
      )
      .all() as Array<{ a: number; c: number }>;
    for (const r of apiRows) {
      if (r.a === 1) apiYes = r.c;
      else apiNo += r.c;
    }
  }

  let dodQueue = 0;
  const dodByStatus: Record<string, number> = {};
  if (tableExists(db, 'dod_submissions')) {
    const pending = db
      .query(`SELECT COUNT(*) AS c FROM dod_submissions WHERE status = 'pending'`)
      .get() as { c: number };
    dodQueue = pending?.c ?? 0;
    const by = db
      .query(
        `SELECT COALESCE(status, 'unknown') AS st, COUNT(*) AS c
         FROM dod_submissions GROUP BY st`
      )
      .all() as Array<{ st: string; c: number }>;
    for (const r of by) dodByStatus[r.st] = r.c;
  }

  let experimentsActive = 0;
  if (tableExists(db, 'experiments')) {
    const row = db.query(`SELECT COUNT(*) AS c FROM experiments WHERE status = 'active'`).get() as {
      c: number;
    };
    experimentsActive = row?.c ?? 0;
  }

  let predictionN = 0;
  if (tableExists(db, 'prediction_accuracy')) {
    const row = db
      .query(`SELECT COUNT(*) AS c FROM prediction_accuracy WHERE prediction_type = 'coverage'`)
      .get() as { c: number };
    predictionN = row?.c ?? 0;
  }

  const timestamp = new Date().toISOString();
  const [compliance, limitRaises, installCache, installHygiene] = await Promise.all([
    loadComplianceMonitoringSlice(),
    loadLimitRaisesMonitoringSlice(),
    collectInstallCacheMonitoringSlice(),
    loadInstallHygieneMonitoringSlice(),
  ]);

  return {
    source: opts?.source ?? 'live',
    uptime: formatUptime(uptimeMs),
    uptimeMs,
    packageCount,
    versionCount,
    lastIntegrity,
    platformSummary,
    platformApiAvailable: { yes: apiYes, no: apiNo },
    dodQueue,
    dodByStatus,
    experimentsActive,
    predictionN,
    timestamp,
    snapshotAt: timestamp,
    ...(compliance ? { compliance } : {}),
    ...(limitRaises ? { limitRaises } : {}),
    ...(installCache?.available ? { installCache } : {}),
    ...(installHygiene ? { installHygiene } : {}),
  };
}
