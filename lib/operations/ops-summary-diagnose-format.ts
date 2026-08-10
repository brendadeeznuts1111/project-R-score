/** Presentation helpers for ops summary endpoint diagnosis. */
import type { DiagnoseSeverity, OpsSummaryDiagnoseShape } from './ops-summary-diagnose.ts';

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

/** One-line compliance board status for diagnose human output. */
export function formatComplianceBoardLine(
  compliance: OpsSummaryDiagnoseShape['compliance'] | undefined
): string | null {
  if (compliance == null) return null;
  if (compliance.available !== true) return 'not baked';

  const enh = compliance.enhancements ?? '?';
  const mm = compliance.shadowMismatches ?? '?';
  const hmacHint =
    compliance.hmac === true ? 'hmac' : compliance.hmac === false ? 'integrity-only' : 'hmac?';
  const status = compliance.ok === true ? 'ok' : 'WARN';
  const geo =
    compliance.geoProfiles != null && compliance.geoProfiles > 0
      ? ` · geo ${compliance.geoProfiles}`
      : '';
  const hint = compliance.ok !== true && compliance.scoreHint ? ` · ${compliance.scoreHint}` : '';
  return `${status} · ${enh} · shadowΔ ${mm} · ${hmacHint}${geo}${hint}`;
}

/** Routes marked fail in embedded routing slice. */
export function embeddedRoutingFailures(
  shape: OpsSummaryDiagnoseShape
): Array<{ path: string; status: number | string }> {
  return (shape.routing?.routes ?? [])
    .filter(route => route.pass === false && route.path)
    .map(route => ({ path: route.path!, status: route.status ?? '?' }));
}

/** Exit code: 0 ok, 1 fail, 2 warn-only. */
export function severityToExitCode(severity: DiagnoseSeverity): number {
  if (severity === 'fail') return 1;
  if (severity === 'warn') return 2;
  return 0;
}

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
