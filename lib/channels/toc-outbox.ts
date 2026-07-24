// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * TOC Ops → ops channel outbox (topic `toc`).
 *
 * Publishes operate-lite bake, ranked capital actions, critical gates, and Soft posts
 * into the unified outbox (R2 / local MemoryChannelStore). Does not mutate Soft on Pages.
 *
 * @see lib/channels/outbox.ts
 * @see lib/toc-ops/return-efficiency.ts
 * @see docs/harness/tenants/toc-ops.md
 */
import type { Database } from 'bun:sqlite';
import type { TocGateResult, TocOpsSnapshot, TocRankedAction } from '../toc-ops/types.ts';
import { enqueueOpsChannelEvent, type EnqueueOpsChannelOpts } from './outbox.ts';
import type { OpsChannelEvent } from './ops-channel-event.ts';

export type TocChannelEnqueueResult = {
  metrics: OpsChannelEvent | null;
  criticalGates: OpsChannelEvent[];
  rankedActions: OpsChannelEvent[];
  enqueued: number;
};

function gateKey(g: TocGateResult): string {
  return `${g.gateId}:${g.partnerCode}:${g.callSign ?? ''}:${g.taskId ?? ''}`;
}

/** Soft Balance journal row → channel event (R2 observability). */
export function enqueueTocSoftPostedEvent(
  db: Database,
  input: {
    entryType: string;
    stakeholder: string;
    amount: number;
    callSign: string; // brand-ok — TOC fixture call sign wire
    partnerCode: string; // brand-ok — TOC partner code wire
    taskId: string; // brand-ok — Soft journal task id (fixture/CT wire)
    entryId: string; // brand-ok — journal row pk
    correctsEntryId?: string | null; // brand-ok — Soft Adjustment self-reference
  }
): OpsChannelEvent {
  return enqueueOpsChannelEvent(db, {
    topic: 'toc',
    eventType: 'toc.soft.posted',
    idempotencyKey: `toc:soft:${input.taskId}:${input.entryType}:${input.stakeholder}:${input.entryId}`,
    payload: {
      entryId: input.entryId,
      entryType: input.entryType,
      stakeholder: input.stakeholder,
      amount: input.amount,
      callSign: input.callSign,
      partnerCode: input.partnerCode,
      taskId: input.taskId,
      correctsEntryId: input.correctsEntryId ?? null,
    },
    projectors: ['r2'],
  });
}

/** Single critical Hard Gate fail. */
export function enqueueTocCriticalGateEvent(
  db: Database,
  gate: TocGateResult,
  opts?: { generatedAt?: string; batch?: string }
): OpsChannelEvent {
  const batch = opts?.batch ?? opts?.generatedAt ?? 'live';
  return enqueueOpsChannelEvent(db, {
    topic: 'toc',
    eventType: 'toc.gate.critical',
    idempotencyKey: `toc:gate:${batch}:${gateKey(gate)}`,
    payload: {
      gateId: gate.gateId,
      partnerCode: gate.partnerCode,
      callSign: gate.callSign,
      taskId: gate.taskId,
      reason: gate.reason,
      severity: gate.severity,
      tag: gate.tag,
      generatedAt: opts?.generatedAt,
    },
    projectors: gate.severity === 'critical' ? ['r2', 'slack'] : ['r2'],
  });
}

/** Ranked capital action (LIMIT/WD/PLAY/…). */
export function enqueueTocRankedActionEvent(
  db: Database,
  action: TocRankedAction,
  opts?: { generatedAt?: string; batch?: string }
): OpsChannelEvent {
  const batch = opts?.batch ?? opts?.generatedAt ?? 'live';
  return enqueueOpsChannelEvent(db, {
    topic: 'toc',
    eventType: 'toc.action.ranked',
    idempotencyKey: `toc:rank:${batch}:${action.rank}:${action.process}:${action.callSign}`,
    payload: {
      rank: action.rank,
      process: action.process,
      callSign: action.callSign,
      partnerCode: action.partnerCode,
      rP: action.rP,
      weightedScore: action.weightedScore,
      reason: action.reason,
      ropeSafe: action.ropeSafe,
      generatedAt: opts?.generatedAt,
    },
    projectors: ['r2'],
  });
}

/** Compact bake summary after ops:seed:toc / withTocMetrics. */
export function enqueueTocMetricsBakedEvent(db: Database, snap: TocOpsSnapshot): OpsChannelEvent {
  const enf = snap.enforcement;
  const re = snap.returnEfficiency;
  const top = snap.rankedActions?.[0];
  const opts: EnqueueOpsChannelOpts = {
    topic: 'toc',
    eventType: 'toc.metrics.baked',
    idempotencyKey: `toc:metrics:${snap.generatedAt}`,
    payload: {
      generatedAt: snap.generatedAt,
      plane: snap.plane,
      enforcementFocus: enf?.diagnosis.focus ?? null,
      enforcementFailed: enf?.failed ?? 0,
      enforcementCritical: enf?.criticalFailed ?? 0,
      throughputT: enf?.throughput.T ?? null,
      throughputI: enf?.throughput.I ?? null,
      throughputOE: enf?.throughput.OE ?? null,
      avgRP: re?.avgRP ?? null,
      topRankedProcess: top?.process ?? null,
      topRankedCallSign: top?.callSign ?? null,
      settlementFloatRatio: snap.buffer.settlementFloatRatio,
      floatTargetSource: snap.buffer.floatTargetSource,
      playableDrums: snap.buffer.playableDrums,
      identityLinked: snap.identity?.linked ?? false,
    },
    projectors: ['r2'],
  };
  return enqueueOpsChannelEvent(db, opts);
}

/**
 * Fan-out bake: metrics summary + up to N critical gates + top ranked actions.
 * Idempotent per snapshot `generatedAt`.
 */
export function enqueueTocBakeChannelEvents(
  db: Database,
  snap: TocOpsSnapshot,
  opts?: { maxCriticalGates?: number; maxRankedActions?: number }
): TocChannelEnqueueResult {
  const maxGates = opts?.maxCriticalGates ?? 5;
  const maxRanked = opts?.maxRankedActions ?? 3;
  const batch = snap.generatedAt;

  const metrics = enqueueTocMetricsBakedEvent(db, snap);
  let enqueued = 1;

  const criticalGates: OpsChannelEvent[] = [];
  const crit = (snap.enforcement?.gates ?? [])
    .filter(g => !g.ok && g.severity === 'critical')
    .slice(0, maxGates);
  for (const g of crit) {
    criticalGates.push(enqueueTocCriticalGateEvent(db, g, { generatedAt: batch, batch }));
    enqueued++;
  }

  const rankedActions: OpsChannelEvent[] = [];
  for (const a of (snap.rankedActions ?? []).slice(0, maxRanked)) {
    rankedActions.push(enqueueTocRankedActionEvent(db, a, { generatedAt: batch, batch }));
    enqueued++;
  }

  return { metrics, criticalGates, rankedActions, enqueued };
}
