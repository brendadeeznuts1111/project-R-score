/**
 * Pure helpers for ops summary endpoint diagnosis (CLI + tests).
 * @see docs/harness/ops-summary-endpoint.md
 * @see tools/ops-summary-diagnose.ts
 */

export type OpsSummaryDiagnoseShape = {
  source?: string;
  fallback?: string;
  error?: string;
  generated?: string;
  channelMeta?: { passed?: number; total?: number; available?: boolean };
  routing?: {
    passed?: number;
    total?: number;
    baseUrl?: string;
    routes?: Array<{ path?: string; pass?: boolean; status?: number | string }>;
  };
  liquidity?: { total?: number };
  bunUtils?: { passed?: number; total?: number; failed?: number };
};

export type DiagnoseSeverity = 'ok' | 'warn' | 'fail';

export type ClassifyResult = {
  severity: DiagnoseSeverity;
  reasons: string[];
};

export type SourceLabel = 'live' | 'snapshot' | 'snapshot-db-fallback' | 'none' | 'unknown';

const CRITICAL_ROUTE_PATHS = [
  '/api/operations/summary',
  '/registry/ops-summary.json',
  '/portal/ops/',
  '/portal/dashboard/',
  '/portal/dashboard-app.js',
  '/api/monitoring',
] as const;

/** Parse summary API / snapshot JSON at the diagnose wire edge. */
export function parseSummaryShape(payload: unknown): OpsSummaryDiagnoseShape {
  if (!payload || typeof payload !== 'object') return {};
  const d = payload as Record<string, unknown>;
  return {
    source: typeof d.source === 'string' ? d.source : undefined,
    fallback: typeof d.fallback === 'string' ? d.fallback : undefined,
    error: typeof d.error === 'string' ? d.error : undefined,
    generated: typeof d.generated === 'string' ? d.generated : undefined,
    channelMeta:
      d.channelMeta && typeof d.channelMeta === 'object'
        ? (d.channelMeta as OpsSummaryDiagnoseShape['channelMeta'])
        : undefined,
    routing:
      d.routing && typeof d.routing === 'object'
        ? (d.routing as OpsSummaryDiagnoseShape['routing'])
        : undefined,
    liquidity:
      d.liquidity && typeof d.liquidity === 'object'
        ? (d.liquidity as OpsSummaryDiagnoseShape['liquidity'])
        : undefined,
    bunUtils:
      d.bunUtils && typeof d.bunUtils === 'object'
        ? (d.bunUtils as OpsSummaryDiagnoseShape['bunUtils'])
        : undefined,
  };
}

/** Classify HTTP + parsed summary into ok / warn / fail for exit codes. */
export function classifySummaryPayload(
  shape: OpsSummaryDiagnoseShape,
  httpStatus: number
): ClassifyResult {
  const reasons: string[] = [];
  let severity: DiagnoseSeverity = 'ok';

  const bump = (next: DiagnoseSeverity) => {
    if (next === 'fail') severity = 'fail';
    else if (next === 'warn' && severity === 'ok') severity = 'warn';
  };

  if (httpStatus >= 500 || shape.source === 'none' || shape.error) {
    bump('fail');
    if (httpStatus >= 500) reasons.push(`HTTP ${httpStatus}`);
    if (shape.source === 'none') reasons.push('source:none');
    if (shape.error) reasons.push(String(shape.error));
  }

  if (shape.source === 'snapshot' && shape.fallback === 'db-unavailable') {
    bump('warn');
    reasons.push('snapshot fallback (db-unavailable)');
  } else if (shape.source === 'snapshot') {
    bump('warn');
    reasons.push('snapshot source (Pages or static file)');
  }

  if (shape.source === 'live' && shape.liquidity?.total === 0) {
    reasons.push('empty liquidity (ops DB has no active balance; informational)');
  }

  if (shape.bunUtils?.total != null && (shape.bunUtils.failed ?? 0) > 0) {
    bump('warn');
    reasons.push(`bunUtils ${shape.bunUtils.failed} failed`);
  }

  if (
    shape.channelMeta?.available &&
    shape.channelMeta.total != null &&
    shape.channelMeta.passed !== shape.channelMeta.total
  ) {
    bump('warn');
    reasons.push(`channelMeta ${shape.channelMeta.passed}/${shape.channelMeta.total}`);
  }

  if (severity === 'ok' && reasons.length === 0 && shape.source === 'live') {
    reasons.push('live summary OK');
  }

  return { severity, reasons };
}

/** True when embedded routing artifact was probed against a different origin. */
export function detectRoutingDrift(
  embeddedBaseUrl: string | undefined,
  probeBaseUrl: string
): boolean {
  if (!embeddedBaseUrl?.trim()) return false;
  const norm = (u: string) => u.replace(/\/$/, '').toLowerCase();
  return norm(embeddedBaseUrl) !== norm(probeBaseUrl);
}

/** Human label for portal `#ops-source` and diagnose output. */
export function formatSourceLabel(shape: OpsSummaryDiagnoseShape): string {
  if (shape.source === 'live') return 'Live';
  if (shape.source === 'snapshot' && shape.fallback === 'db-unavailable') {
    return 'Snapshot (DB fallback)';
  }
  if (shape.source === 'snapshot') return 'Snapshot';
  if (shape.source === 'none') return 'Unavailable';
  return shape.source ?? 'Unknown';
}

/** Routes marked fail in embedded routing slice. */
export function embeddedRoutingFailures(
  shape: OpsSummaryDiagnoseShape
): Array<{ path: string; status: number | string }> {
  return (shape.routing?.routes ?? [])
    .filter(r => r.pass === false && r.path)
    .map(r => ({ path: r.path!, status: r.status ?? '?' }));
}

/** Exit code: 0 ok, 1 fail, 2 warn-only. */
export function severityToExitCode(severity: DiagnoseSeverity): number {
  if (severity === 'fail') return 1;
  if (severity === 'warn') return 2;
  return 0;
}

export { CRITICAL_ROUTE_PATHS };

/** Stale snapshot warning when file age exceeds threshold (ms). */
export function snapshotAgeWarn(
  lastModifiedMs: number | null,
  nowMs: number,
  maxAgeMs: number
): string | null {
  if (lastModifiedMs == null) return 'ops-summary.json missing';
  const age = nowMs - lastModifiedMs;
  if (age > maxAgeMs) {
    const hours = Math.round(age / 3_600_000);
    return `ops-summary.json stale (~${hours}h old)`;
  }
  return null;
}
