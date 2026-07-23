/**
 * Networking proof artifact parse + monitoring projection.
 * Artifact path: public/registry/networking-proof.json
 *
 * @see tools/verify-networking.ts
 */

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
  bunVersion?: string;
  bunRevision?: string;
  base?: string;
  allOk: boolean;
  targets: unknown[];
  global: {
    checksPassed: number;
    checksTotal: number;
    elapsedMs?: number;
  };
};

/** Soft-parse unknown JSON into a networking proof artifact. */
export function parseNetworkingProofArtifact(raw: unknown): NetworkingProofArtifact | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const global = o.global as Record<string, unknown> | undefined;
  if (typeof o.proofHash !== 'string') return null;
  if (!global || typeof global.checksPassed !== 'number' || typeof global.checksTotal !== 'number') {
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
export function toMonitoringNetworkingReport(parsed: NetworkingProofArtifact): Record<string, unknown> {
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
