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
  liquidity?: {
    total?: number;
    empty?: boolean;
    accounts?: { count?: number; balance?: number };
    positions?: {
      count?: number;
      deposited?: number;
      available?: number;
      inPlay?: number;
    };
    pool?: {
      totalLiquidity?: number;
      totalExposure?: number;
      available?: number;
    };
  };
  bunUtils?: { passed?: number; total?: number; failed?: number };
  /** MA/NJ board slice from ops-summary.compliance (baked companion). */
  compliance?: {
    available?: boolean;
    ok?: boolean;
    enhancements?: string | null;
    shadowMismatches?: number | null;
    hmac?: boolean;
    geoProfiles?: number | null;
    scoreHint?: string | null;
    portal?: string;
  };
};

export type DiagnoseSeverity = 'ok' | 'warn' | 'fail';

export type ClassifyResult = {
  severity: DiagnoseSeverity;
  reasons: string[];
};

const CRITICAL_ROUTE_PATHS = [
  '/api/operations/summary',
  '/registry/ops-summary.json',
  '/portal/ops/',
  '/portal/dashboard/',
  '/portal/dashboard-app.js',
  '/api/monitoring',
  '/portal/compliance/',
  '/registry/compliance-board.json',
  '/api/compliance',
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
    compliance:
      d.compliance && typeof d.compliance === 'object'
        ? (d.compliance as OpsSummaryDiagnoseShape['compliance'])
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

  if (shape.source === 'live') {
    const liq = shape.liquidity;
    const empty =
      liq?.empty === true ||
      (liq?.total === 0 &&
        (liq?.positions?.count ?? 0) === 0 &&
        (liq?.pool?.totalLiquidity ?? 0) === 0);
    if (empty || liq?.total === 0) {
      reasons.push(
        empty
          ? 'empty liquidity (no accounts, positions, or ops pool; informational)'
          : 'accounts balance $0 (positions/pool may still have desk capital; informational)'
      );
    }
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

  if (shape.compliance?.available === true && shape.compliance.ok === false) {
    bump('warn');
    const enh = shape.compliance.enhancements ?? '?';
    const mm = shape.compliance.shadowMismatches ?? '?';
    reasons.push(`compliance board fail (${enh} · shadowΔ ${mm})`);
  }
  // available:false → human line "not baked" only (optional plane; does not warn)

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

export { CRITICAL_ROUTE_PATHS };
