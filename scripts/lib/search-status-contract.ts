export type StatusLevel = 'ok' | 'warn' | 'fail' | 'unknown';

export const LOOP_FRESHNESS_WINDOW_MINUTES = 15;

export const LOOP_STAGE_IDS = [
  'cli_search',
  'benchmark_snapshot',
  'coverage_kpi',
  'signal_quality',
  'signal_latency',
  'signal_memory',
  'dashboard_parity',
  'status_freshness',
] as const;

export type LoopStageId = (typeof LOOP_STAGE_IDS)[number];

export type LoopStageStatus = 'pass' | 'warn' | 'fail';

export type LoopStage = {
  id: LoopStageId;
  status: LoopStageStatus;
  reason: string;
  evidence?: string[];
};

export type UnifiedContractCheck = {
  id: string;
  ok: boolean;
  detail: string;
  status: StatusLevel;
};

export type UnifiedDomainReadiness = {
  totalDomains: number;
  tokenConfigured: number;
  tokenMissing: number;
  onlineRows: number;
  checkedRows: number;
  onlineRatio: number | null;
  blocked: boolean;
  reasons: string[];
};

export type UnifiedStatusSnapshot = {
  generatedAt: string;
  latestSnapshotId: string | null;
  loopSnapshotId: string | null;
  freshness: {
    latestSnapshotIdSeen: string | null;
    loopStatusSnapshotId: string | null;
    isAligned: boolean;
    staleMinutes: number | null;
    windowMinutes: number;
    status: StatusLevel;
  };
  warnings: string[];
  stages: LoopStage[];
  domainReadiness: UnifiedDomainReadiness;
  contractChecks: UnifiedContractCheck[];
  overall: {
    status: StatusLevel;
    loopClosed: boolean;
    reason: string;
  };
};

export const ALLOWED_WARNING_STAGE_IDS = new Set<LoopStageId>([
  'signal_latency',
  'signal_memory',
  'status_freshness',
]);

export const WARNING_STATUS_MAP: Record<string, StatusLevel> = {
  latency_p95_warn: 'warn',
  slop_rise_warn: 'warn',
  heap_peak_warn: 'warn',
  rss_peak_warn: 'warn',
  quality_drop_warn: 'fail',
  reliability_drop_warn: 'fail',
  strict_reliability_floor_warn: 'fail',
};

export function normalizeWarningCode(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export function warningCodeStatus(code: unknown): StatusLevel {
  const normalized = normalizeWarningCode(code);
  return WARNING_STATUS_MAP[normalized] || 'unknown';
}

export function mapLoopStageToStatusLevel(status: unknown): StatusLevel {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'pass') return 'ok';
  if (normalized === 'warn') return 'warn';
  if (normalized === 'fail') return 'fail';
  return 'unknown';
}

export function computeOverallStatus(levels: Array<StatusLevel>): StatusLevel {
  if (levels.includes('fail')) return 'fail';
  if (levels.includes('warn')) return 'warn';
  if (levels.includes('ok')) return 'ok';
  return 'unknown';
}

export function isLoopClosedByPolicy(stages: Array<Pick<LoopStage, 'id' | 'status'>>): {
  loopClosed: boolean;
  hasFail: boolean;
  disallowedWarnIds: string[];
} {
  const hasFail = stages.some((stage) => mapLoopStageToStatusLevel(stage.status) === 'fail');
  const disallowedWarnIds = stages
    .filter((stage) => mapLoopStageToStatusLevel(stage.status) === 'warn' && !ALLOWED_WARNING_STAGE_IDS.has(stage.id as LoopStageId))
    .map((stage) => String(stage.id));
  return {
    loopClosed: !hasFail && disallowedWarnIds.length === 0,
    hasFail,
    disallowedWarnIds,
  };
}

export function formatLoopClosedReason(stages: Array<Pick<LoopStage, 'id' | 'status'>>): string {
  const evalResult = isLoopClosedByPolicy(stages as Array<Pick<LoopStage, 'id' | 'status'>>);
  if (evalResult.loopClosed) {
    return 'All stages passed or are allowed warning states (latency/memory/status_freshness), including dashboard parity inputs.';
  }
  if (evalResult.hasFail) {
    const failIds = stages
      .filter((stage) => mapLoopStageToStatusLevel(stage.status) === 'fail')
      .map((stage) => String(stage.id));
    return `One or more stages failed: ${failIds.join(', ')}`;
  }
  return `Disallowed warning stages present: ${evalResult.disallowedWarnIds.join(', ')}`;
}

export function freshnessStatus(input: {
  latestSnapshotIdSeen: string | null;
  loopStatusSnapshotId: string | null;
  staleMinutes: number | null;
  windowMinutes?: number;
}): StatusLevel {
  const windowMinutes = Number.isFinite(Number(input.windowMinutes))
    ? Number(input.windowMinutes)
    : LOOP_FRESHNESS_WINDOW_MINUTES;
  const aligned = Boolean(
    input.latestSnapshotIdSeen &&
      input.loopStatusSnapshotId &&
      input.latestSnapshotIdSeen === input.loopStatusSnapshotId
  );
  if (!aligned) return 'fail';
  if (typeof input.staleMinutes === 'number' && input.staleMinutes > windowMinutes) return 'warn';
  return 'ok';
}
