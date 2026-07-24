/**
 * Networking proof artifact parse + monitoring projection.
 * Artifact path: public/registry/networking-proof.json
 *
 * @see tools/verify-networking.ts
 */
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
import type { NetCheckRow, NetTargetCategory } from './networking-report.ts';

export const NETWORKING_PROOF_PATH = 'public/registry/networking-proof.json';

export const NETWORKING_PROOF_SCHEMA_VERSION = 1 as const;

export const NETWORKING_REPORT_TYPES = {
  verification: 'networking-verification',
} as const;

export type NetworkingReportType =
  (typeof NETWORKING_REPORT_TYPES)[keyof typeof NETWORKING_REPORT_TYPES];

export type NetworkingProofArtifact = {
  schemaVersion: number;
  reportType: string;
  proofHash: string;
  timestamp: string;
  subsystem?: 'networking';
  bunVersion?: string;
  bunRevision?: string;
  base?: string;
  remote?: boolean;
  allOk: boolean;
  targets: unknown[];
  global: {
    checksPassed: number;
    checksTotal: number;
    elapsedMs?: number;
    dnsCache?: Record<string, number>;
  };
};

export type NetworkingProofTargetInput = {
  name: string;
  category: NetTargetCategory;
};

function parseMs(metric: string): number | undefined {
  const m = metric.match(/^([\d.]+)ms/);
  return m ? Number(m[1]) : undefined;
}

function parseStatusCode(metric: string): number | undefined {
  const m = metric.match(/\((\d{3})\)/);
  return m ? Number(m[1]) : undefined;
}

function parseBodySize(metric: string): number | undefined {
  const m = metric.match(/\((\d+)\s+B\)/);
  return m ? Number(m[1]) : undefined;
}

/** Build monitoring proof JSON from flat NetCheckRow[] grouped by target name. */
export function buildNetworkingProofArtifact(input: {
  rows: NetCheckRow[];
  targets: NetworkingProofTargetInput[];
  base: string;
  remote?: boolean;
  elapsedMs?: number;
  bunVersion?: string;
  bunRevision?: string;
  dnsCache?: Record<string, number>;
}): NetworkingProofArtifact {
  const hard = input.rows.filter(r => r.status === 'PASS' || r.status === 'FAIL');
  const checksPassed = hard.filter(r => r.status === 'PASS').length;
  const checksTotal = hard.length;
  const allOk = checksPassed === checksTotal && checksTotal > 0;

  const targets = input.targets.map(t => {
    const targetRows = input.rows.filter(r => r.target === t.name);
    const optimizations: Record<string, { metric: string; status: string; detail?: string }> = {};
    for (const r of targetRows) {
      optimizations[r.optimization] = {
        metric: r.metric,
        status: r.status,
        ...(r.detail ? { detail: r.detail } : {}),
      };
    }
    const cold = targetRows.find(r => r.type === 'cold-fetch');
    const warm = targetRows.find(r => r.type === 'warm-fetch');
    const coldMs = cold ? parseMs(cold.metric) : undefined;
    const warmMs = warm ? parseMs(warm.metric) : undefined;
    return {
      name: t.name,
      category: t.category,
      subsystem: 'networking' as const,
      optimizations,
      summary: {
        coldFetchMs: coldMs,
        warmFetchMs: warmMs,
        reuseEfficiency:
          coldMs && warmMs && warmMs > 0 ? Number((coldMs / warmMs).toFixed(6)) : undefined,
        protocol: 'unknown',
        compression: 'none',
        dnsCacheHit: targetRows.some(r => r.type === 'dns-cache' && r.status === 'PASS'),
        keepAlive: false,
        http3: false,
        statusCode: cold ? parseStatusCode(cold.metric) : undefined,
        bodySize: targetRows
          .filter(r => r.type === 'response-bytes')
          .map(r => parseBodySize(r.metric))
          .find(n => n != null),
      },
      timestamp: new Date().toISOString(),
    };
  });

  const body = {
    schemaVersion: NETWORKING_PROOF_SCHEMA_VERSION,
    reportType: NETWORKING_REPORT_TYPES.verification,
    timestamp: new Date().toISOString(),
    subsystem: 'networking' as const,
    bunVersion: input.bunVersion,
    bunRevision: input.bunRevision,
    base: input.base,
    remote: input.remote ?? false,
    allOk,
    targets,
    global: {
      elapsedMs: input.elapsedMs,
      checksPassed,
      checksTotal,
      ...(input.dnsCache ? { dnsCache: input.dnsCache } : {}),
    },
  };

  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(JSON.stringify({ ...body, proofHash: undefined }));
  const proofHash = hasher.digest('hex');

  return { ...body, proofHash };
}

/** Soft-parse unknown JSON into a networking proof artifact. */
export function parseNetworkingProofArtifact(raw: unknown): NetworkingProofArtifact | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const global = o.global as Record<string, unknown> | undefined;
  if (typeof o.proofHash !== 'string') return null;
  if (
    !global ||
    typeof global.checksPassed !== 'number' ||
    typeof global.checksTotal !== 'number'
  ) {
    return null;
  }
  return {
    schemaVersion: typeof o.schemaVersion === 'number' ? o.schemaVersion : 1,
    reportType:
      typeof o.reportType === 'string' ? o.reportType : NETWORKING_REPORT_TYPES.verification,
    proofHash: o.proofHash,
    timestamp: typeof o.timestamp === 'string' ? o.timestamp : new Date().toISOString(),
    bunVersion: typeof o.bunVersion === 'string' ? o.bunVersion : undefined,
    bunRevision: typeof o.bunRevision === 'string' ? o.bunRevision : undefined,
    base: typeof o.base === 'string' ? o.base : undefined,
    allOk: Boolean(o.allOk),
    targets: Array.isArray(o.targets) ? o.targets : [],
    global: {
      checksPassed: global.checksPassed,
      checksTotal: global.checksTotal,
      elapsedMs: typeof global.elapsedMs === 'number' ? global.elapsedMs : undefined,
    },
  };
}

/** Compact projection for /api/monitoring and health tables. */
export function toMonitoringNetworkingReport(
  parsed: NetworkingProofArtifact
): Record<string, unknown> {
  return {
    available: true,
    reportType: parsed.reportType,
    schemaVersion: parsed.schemaVersion,
    generated: parsed.timestamp,
    proofHash: parsed.proofHash,
    checksPassed: parsed.global.checksPassed,
    checksTotal: parsed.global.checksTotal,
    targets: parsed.targets.length,
    allOk: parsed.allOk,
    degraded: !parsed.allOk,
    bunVersion: parsed.bunVersion ?? null,
  };
}
