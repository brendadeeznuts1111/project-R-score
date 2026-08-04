// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Experiment outcome plumbing — resolve subject, sticky assign into active
 * designs, record metrics from play settlement, coverage gate with partner floor.
 */
import type { Database } from 'bun:sqlite';
import { asTreeNodeId, unbrand, type ExperimentId, type TreeNodeId } from '../types/branded.ts';
import { canOfferOnPlatform, minCoveragePct } from '../operations/platform-coverage.ts';
import { FactorialEngine, type AssignmentResult } from './engine.ts';
import { ensureExperimentsSchema } from './schema.ts';

export type DecisivePlayResult = 'win' | 'loss';
export type PlaySettleResult = DecisivePlayResult | 'push' | 'void';

type TreeNodeRow = {
  id: string; // brand-ok
  parent_id: string | null; // brand-ok
  type: string;
};

/**
 * Walk leaf → root; prefer `partner` node for experiment assignment.
 * Falls back to the leaf (or topmost ancestor) when no partner exists.
 */
export function resolveExperimentSubject(
  db: Database,
  leafNodeId: string // brand-ok — TreeNodeId at call site
): TreeNodeId {
  let current: string | null = leafNodeId;
  let last = leafNodeId;
  const seen = new Set<string>();

  while (current && !seen.has(current)) {
    seen.add(current);
    const row = db
      .query(`SELECT id, parent_id, type FROM tree_nodes WHERE id = $id`)
      .get({ $id: current }) as TreeNodeRow | null;
    if (!row) break;
    last = row.id;
    if (row.type === 'partner') return asTreeNodeId(row.id);
    current = row.parent_id;
  }

  return asTreeNodeId(last);
}

/** 1 = win, 0 = loss; push/void yield no win-rate signal. */
export function winRateFromResult(result: PlaySettleResult): number | undefined {
  if (result === 'win') return 1;
  if (result === 'loss') return 0;
  return undefined;
}

/** Sticky-assign subject into every active experiment (no-op if already assigned). */
export function ensureAssignedToActiveExperiments(
  db: Database,
  subjectNodeId: TreeNodeId | string
): AssignmentResult[] {
  ensureExperimentsSchema(db);
  const engine = new FactorialEngine(db);
  const subject = typeof subjectNodeId === 'string' ? asTreeNodeId(subjectNodeId) : subjectNodeId;
  const active = engine.listExperiments().filter(e => e.status === 'active');
  return active.map(exp => engine.assignBalanced(exp.id, subject));
}

export type SettlementMetricWrite = {
  name: string;
  value: number;
  metricId: string; // brand-ok — opaque metric row id
};

export type SettlementOutcomeRecord = {
  experimentId: ExperimentId;
  partnerId: TreeNodeId;
  assignmentCreated: boolean;
  metrics: SettlementMetricWrite[];
};

export type RecordSettlementInput = {
  leafNodeId: string; // brand-ok — TreeNodeId at call site
  result: PlaySettleResult;
  pnl: number;
  /** Reserved for audit / future play_id FK on metrics. */
  playId?: string; // brand-ok
};

/**
 * For each active experiment: ensure assignment for the subject's partner,
 * then record primary metric (+ auxiliary pnl when primary is win_rate).
 * Never throws for empty active set; callers may wrap for settle isolation.
 */
export function recordPlaySettlementOutcomes(
  db: Database,
  input: RecordSettlementInput
): SettlementOutcomeRecord[] {
  ensureExperimentsSchema(db);
  const engine = new FactorialEngine(db);
  const active = engine.listExperiments().filter(e => e.status === 'active');
  if (!active.length) return [];

  const partnerId = resolveExperimentSubject(db, input.leafNodeId);
  const winRate = winRateFromResult(input.result);
  const out: SettlementOutcomeRecord[] = [];

  for (const exp of active) {
    const assignment = engine.assignBalanced(exp.id, partnerId);
    const metrics: SettlementMetricWrite[] = [];
    const primary = exp.metricName || 'win_rate';

    if (primary === 'pnl') {
      const metricId = engine.recordMetric({
        experimentId: exp.id,
        partnerId,
        value: input.pnl,
        metricName: 'pnl',
      });
      metrics.push({ name: 'pnl', value: input.pnl, metricId });
    } else if (primary === 'win_rate') {
      if (winRate !== undefined) {
        const metricId = engine.recordMetric({
          experimentId: exp.id,
          partnerId,
          value: winRate,
          metricName: 'win_rate',
        });
        metrics.push({ name: 'win_rate', value: winRate, metricId });
        // Auxiliary pnl for later multi-metric analysis
        const pnlId = engine.recordMetric({
          experimentId: exp.id,
          partnerId,
          value: input.pnl,
          metricName: 'pnl',
        });
        metrics.push({ name: 'pnl', value: input.pnl, metricId: pnlId });
      }
    } else {
      // Custom primary: map decisive plays to 1/0 under that name
      if (winRate !== undefined) {
        const metricId = engine.recordMetric({
          experimentId: exp.id,
          partnerId,
          value: winRate,
          metricName: primary,
        });
        metrics.push({ name: primary, value: winRate, metricId });
      }
    }

    out.push({
      experimentId: exp.id,
      partnerId,
      assignmentCreated: assignment.created,
      metrics,
    });
  }

  return out;
}

/**
 * Coverage + liquidity offer gate for a tree node.
 * Auto-enrolls the partner subject into active experiments so variant floors apply.
 */
export function canOfferStakeForNode(
  db: Database,
  platformId: string, // brand-ok — platforms.id
  stake: number,
  leafNodeId: string, // brand-ok — TreeNodeId
  minPct: number = minCoveragePct()
): boolean {
  const subject = resolveExperimentSubject(db, leafNodeId);
  ensureAssignedToActiveExperiments(db, subject);
  return canOfferOnPlatform(db, platformId, stake, minPct, unbrand(subject));
}

/** Active experiment ids (wire helper for CLI / diagnostics). */
export function listActiveExperimentIds(db: Database): ExperimentId[] {
  ensureExperimentsSchema(db);
  return new FactorialEngine(db)
    .listExperiments()
    .filter(e => e.status === 'active')
    .map(e => e.id);
}
