// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Shared database connection manager + TTL cache for ops data.
 *
 * Bun docs: Singleton connection at module scope is the recommended pattern.
 * @see https://bun.com/docs/runtime/sqlite
 * @see https://bun.com/docs/runtime/http/server#practical-example-rest-api
 */
import { Database } from 'bun:sqlite';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../operations/db.ts';
import { collectMonitoring, type MonitoringPayload } from '../monitoring/collect.ts';

let dbInstance: Database | null = null;
let monitoringCache: { data: MonitoringPayload; ts: number } | null = null;
const MONITORING_CACHE_TTL = 5_000; // 5 seconds

/** Get or create the shared SQLite connection (singleton per process). */
export function getDb(dbPath = DEFAULT_OPS_DB_PATH): Database {
  if (!dbInstance) {
    dbInstance = openOperationsDb({ path: dbPath });
  }
  return dbInstance;
}

/** Get monitoring data — returns cached result if within TTL. */
export async function getMonitoringData(
  options: {
    source?: 'live' | 'snapshot';
    uptimeOriginMs?: number;
    forceRefresh?: boolean;
  } = {}
): Promise<MonitoringPayload> {
  const now = Date.now();
  const { forceRefresh = false, source = 'snapshot', uptimeOriginMs = 0 } = options;

  if (!forceRefresh && monitoringCache && now - monitoringCache.ts < MONITORING_CACHE_TTL) {
    return monitoringCache.data;
  }

  const db = getDb();
  const data = (await collectMonitoring(db, { source, uptimeOriginMs })) as Record<string, unknown>;

  // Append proof files
  const proofFiles = [
    ['bunApiProof', 'tools/bun-api-coverage-proof.json'],
    ['networkingProof', 'public/registry/networking-proof.json'],
    ['installEnvProof', 'public/registry/install-env-proof.json'],
    ['registryClientProof', 'public/registry/registry-client-proof.json'],
    ['bunRuntimeNitsProof', 'public/registry/bun-runtime-nits-proof.json'],
    ['defaultsProof', 'public/registry/defaults-proof.json'],
  ];
  for (const [key, path] of proofFiles) {
    try {
      const f = Bun.file(path);
      if (await f.exists()) {
        data[key] = JSON.parse(await f.text());
      }
    } catch {}
  }

  // Compliance board slice for monitoring tile + portal cross-link
  try {
    const cf = Bun.file('public/registry/compliance-board.json');
    if (await cf.exists()) {
      const board = (await cf.json()) as {
        generatedAt?: string;
        enhancements?: { passed?: number; total?: number };
        shadow?: { summary?: { mismatches?: number; allow?: number; block?: number } };
      };
      const enh = board.enhancements;
      const mismatches = board.shadow?.summary?.mismatches ?? 0;
      const ok = (enh?.passed ?? 0) === (enh?.total ?? 0) && mismatches === 0;
      data.compliance = {
        available: true,
        ok,
        enhancements: enh ? `${enh.passed ?? 0}/${enh.total ?? 0}` : null,
        shadowMismatches: mismatches,
        shadowAllow: board.shadow?.summary?.allow ?? null,
        shadowBlock: board.shadow?.summary?.block ?? null,
        generatedAt: board.generatedAt ?? null,
        path: '/registry/compliance-board.json',
        portal: '/portal/compliance/',
      };
    }
  } catch {
    /* optional plane */
  }

  monitoringCache = { data: data as MonitoringPayload, ts: now };
  return data as MonitoringPayload;
}

/** Invalidate the monitoring cache (call after DOD submission / ops change). */
export function invalidateMonitoringCache(): void {
  monitoringCache = null;
}

/** Close the shared database connection. */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
