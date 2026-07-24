// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Attach ops-summary slices to monitoring.json for Pages /api/monitoring.
 */
import type { MonitoringPayload } from './collect.ts';

type RoutingSlice = {
  available?: boolean;
  baseUrl?: string;
  passed?: number;
  total?: number;
  failed?: number;
  httpOk?: number;
  criticalFailed?: number;
  errorRate?: number;
  meanMs?: number;
  p50Ms?: number;
  p95Ms?: number;
  proofHash?: string;
  timestamp?: string;
  routes?: Array<{
    path: string;
    status: number;
    pass: boolean;
    critical?: boolean;
    timeMs?: number;
    contentType?: string;
  }>;
};

type BunUtilsSlice = {
  passed?: number;
  total?: number;
  bunVersion?: string;
  proofHash?: string;
  timestamp?: string;
};

export type MonitoringSnapshotExtras = {
  env: unknown;
  routing?: RoutingSlice | null;
  bunUtils?: BunUtilsSlice | null;
  registryClient?: Record<string, unknown> | null;
  docsCoverage?: Record<string, unknown> | null;
  networking?: Record<string, unknown> | null;
};

export function enrichMonitoringForSnapshot(
  base: MonitoringPayload,
  extras: MonitoringSnapshotExtras
): MonitoringPayload {
  const routing = extras.routing?.available ? extras.routing : undefined;
  const bun = extras.bunUtils;
  const net = extras.networking;

  return {
    ...base,
    env: extras.env as MonitoringPayload['env'],
    routeStats: routing
      ? {
          routing: {
            passed: routing.passed,
            total: routing.total,
            httpOk: routing.httpOk,
            criticalFailed: routing.criticalFailed,
            p95Ms: routing.p95Ms,
            errorRate: routing.errorRate,
            proofHash: routing.proofHash,
            baseUrl: routing.baseUrl,
            routes: routing.routes,
          },
        }
      : base.routeStats,
    bunApiProof: bun
      ? {
          demosPassed: bun.passed,
          demosTotal: bun.total,
          demoPassRate:
            bun.passed != null && bun.total
              ? `${((100 * bun.passed) / bun.total).toFixed(1)}%`
              : undefined,
          generated: bun.timestamp,
          apisVerified: bun.passed,
        }
      : base.bunApiProof,
    networkingProof:
      net && typeof net === 'object' && 'proofHash' in net
        ? ({
            schemaVersion: 1,
            bunVersion: String(net.bunVersion ?? ''),
            bunRevision: String(net.bunRevision ?? ''),
            timestamp: String(net.timestamp ?? net.generated ?? ''),
            base: String(net.base ?? ''),
            totalTargets: Array.isArray(net.targets) ? net.targets.length : 0,
            allOk: Boolean(net.allOk ?? net.ok),
            proofHash: String(net.proofHash ?? ''),
            targets: Array.isArray(net.targets) ? net.targets : [],
          } as MonitoringPayload['networkingProof'])
        : base.networkingProof,
    registryClientProof: extras.registryClient ?? undefined,
    docsCoverageProof: extras.docsCoverage ?? undefined,
  } as MonitoringPayload;
}
