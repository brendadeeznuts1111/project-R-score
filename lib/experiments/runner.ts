// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Phased experiment runner — launch presets with cluster or switchback protocol.
 * Does not register Bun.cron; call dailyCheck from CLI or ops automation.
 */
import type { Database } from 'bun:sqlite';
import {
  asExperimentId,
  asTreeNodeId,
  unbrand,
  type ExperimentId,
  type TreeNodeId,
} from '../types/branded.ts';
import { assignClustered } from './cluster.ts';
import { FactorialEngine, type ExperimentRow } from './engine.ts';
import { getPhase, type ExperimentProtocol } from './phases.ts';
import { createSwitchbackSchedule } from './switchback.ts';

export type ClusterBy = 'expert' | 'parent';

export type LaunchPhaseOpts = {
  phase: 1 | 2 | 3 | 4;
  protocol?: ExperimentProtocol;
  periodDays?: number;
  washoutDays?: number;
  clusterBy?: ClusterBy;
  /** Override sandbox from env OPS_EXPERIMENT_SANDBOX=1 */
  sandbox?: boolean;
  /** Harm rule: pause if variant mean ≤ baseline − this (win_rate units). */
  harmDelta?: number;
  /** Min observations per variant before harm rule applies. */
  harmMinN?: number;
};

export type LaunchPhaseResult = {
  experiment: ExperimentRow;
  protocol: ExperimentProtocol;
  assigned: number;
  switchbackScheduled: number;
  clusterBy: ClusterBy;
};

export type DailyCheckResult = {
  experimentId: ExperimentId;
  status: string;
  analysisReady: boolean;
  elapsedDays: number;
  minDurationDays: number;
  pausedForHarm: boolean;
  note: string;
  variantMeans: Array<{ variantId: string; mean: number; n: number; configKey: string }>; // brand-ok — opaque variant key (control/treatment/vN), no VariantId brand
};

type NodeRow = {
  id: string; // brand-ok — tree_nodes.id
  expert_id: string | null; // brand-ok
  parent_id: string | null; // brand-ok
  type: string;
};

function isSandbox(opts?: LaunchPhaseOpts): boolean {
  if (opts?.sandbox != null) return opts.sandbox;
  return Bun.env.OPS_EXPERIMENT_SANDBOX === '1';
}

/** Derive spillover cluster key from tree_nodes. */
export function clusterKeyForNode(node: NodeRow, clusterBy: ClusterBy): string {
  if (clusterBy === 'expert' && node.expert_id) return `expert:${node.expert_id}`;
  if (node.parent_id) return `parent:${node.parent_id}`;
  if (node.expert_id) return `expert:${node.expert_id}`;
  return 'default';
}

function listEligibleNodes(db: Database): NodeRow[] {
  return db
    .query(
      `SELECT id, expert_id, parent_id, type FROM tree_nodes
       WHERE active = 1 AND status IN ('active', 'partner')
         AND type IN ('partner', 'agent', 'sub_agent')
       ORDER BY created_at ASC`
    )
    .all() as NodeRow[];
}

/**
 * Create + activate a phase experiment, assign via cluster (between) or
 * switchback schedules seeded by cluster key (switchback).
 */
export function launchPhase(db: Database, opts: LaunchPhaseOpts): LaunchPhaseResult {
  const phase = getPhase(opts.phase);
  const protocol = opts.protocol ?? phase.protocol;
  const periodDays = opts.periodDays ?? 14;
  const washoutDays = opts.washoutDays ?? 3;
  const clusterBy = opts.clusterBy ?? 'expert';
  const sandbox = isSandbox(opts);

  const engine = new FactorialEngine(db);
  const experiment = engine.createExperiment({
    name: phase.name,
    factors: phase.factors,
    fractionDenom: phase.fractionDenom,
    metricName: phase.metricName,
    policy: sandbox
      ? {
          minPartnersPerVariant: 1,
          minDurationDays: 0,
          minimumResolution: 2,
          allowExploratorySubset: true,
        }
      : {
          minDurationDays: phase.recommendedWeeks * 7,
        },
  });

  // Persist protocol hint on hypothesis JSON field if empty — use updated_at notes via name suffix
  db.run(`UPDATE experiments SET hypothesis = $h, updated_at = $now WHERE id = $id`, {
    $h: JSON.stringify({
      phase: phase.phase,
      protocol,
      clusterBy,
      periodDays,
      washoutDays,
      harmDelta: opts.harmDelta ?? 0.05,
      harmMinN: opts.harmMinN ?? 50,
    }),
    $now: new Date().toISOString(),
    $id: unbrand(experiment.id),
  });

  if (sandbox) {
    // Bypass readiness partner count for sandbox by activating via helper that skips setStatus checks
    // Prefer setStatus when ready; otherwise force-activate like activateExperiment A/B helper
    try {
      engine.setStatus(experiment.id, 'active');
    } catch {
      const now = new Date().toISOString();
      db.run(
        `UPDATE experiments SET status = 'active', activated_at = COALESCE(activated_at, $now), updated_at = $now WHERE id = $id`,
        { $id: unbrand(experiment.id), $now: now }
      );
    }
  } else {
    engine.setStatus(experiment.id, 'active');
  }

  const live = engine.getExperiment(experiment.id)!;
  const nodes = listEligibleNodes(db);
  let assigned = 0;
  let switchbackScheduled = 0;

  for (const node of nodes) {
    const partnerId = asTreeNodeId(node.id);
    const key = clusterKeyForNode(node, clusterBy);

    if (protocol === 'between') {
      assignClustered(db, engine, {
        experimentId: live.id,
        partnerId,
        clusterKey: key,
      });
      assigned++;
    } else {
      // Switchback only — seed shuffle by cluster so related partners share order
      try {
        createSwitchbackSchedule(db, engine, {
          experimentId: live.id,
          partnerId,
          periodDays,
          washoutDays,
          seed: `${unbrand(live.id)}:${key}`,
        });
        switchbackScheduled++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('already exists')) throw e;
      }
    }
  }

  return {
    experiment: engine.getExperiment(live.id)!,
    protocol,
    assigned,
    switchbackScheduled,
    clusterBy,
  };
}

function parseLaunchMeta(hypothesis: string | null | undefined): {
  harmDelta: number;
  harmMinN: number;
} {
  try {
    const j = hypothesis ? JSON.parse(hypothesis) : {};
    return {
      harmDelta: typeof j.harmDelta === 'number' ? j.harmDelta : 0.05,
      harmMinN: typeof j.harmMinN === 'number' ? j.harmMinN : 50,
    };
  } catch {
    return { harmDelta: 0.05, harmMinN: 50 };
  }
}

/**
 * Operational daily check — descriptive harm pause + analysis-ready flag.
 * Not a statistical significance test.
 */
export function dailyCheck(db: Database, experimentId: ExperimentId): DailyCheckResult {
  const engine = new FactorialEngine(db);
  const exp = engine.getExperiment(experimentId);
  if (!exp) throw new Error(`Experiment not found: ${unbrand(experimentId)}`);

  const hypRow = db
    .query(`SELECT hypothesis FROM experiments WHERE id = $id`)
    .get({ $id: unbrand(experimentId) }) as { hypothesis: string | null } | null;
  const { harmDelta, harmMinN } = parseLaunchMeta(hypRow?.hypothesis);

  const rows = db
    .query(
      `SELECT a.variant_id AS variant_id, a.config_json AS config_json,
              AVG(m.metric_value) AS mean, COUNT(*) AS n
       FROM experiment_metrics m
       JOIN experiment_assignments a
         ON a.experiment_id = m.experiment_id AND a.partner_id = m.partner_id
       WHERE m.experiment_id = $e AND m.metric_name = $metric
       GROUP BY a.variant_id`
    )
    .all({ $e: unbrand(experimentId), $metric: exp.metricName }) as Array<{
    variant_id: string; // brand-ok
    config_json: string;
    mean: number;
    n: number;
  }>;

  // Also fold switchback metrics by joining periods → metrics on partner+time is harder;
  // for switchback-heavy experiments, use partner-level means from experiment_metrics alone.
  const variantMeans = rows.map(r => {
    const cfg = JSON.parse(r.config_json) as Record<string, unknown>;
    return {
      variantId: r.variant_id,
      mean: r.mean,
      n: r.n,
      configKey: JSON.stringify(cfg),
    };
  });

  // Baseline: routing=static if present, else first variant by n
  let baseline = variantMeans.find(v => {
    try {
      const c = JSON.parse(v.configKey) as { routing?: string };
      return c.routing === 'static';
    } catch {
      return false;
    }
  });
  if (!baseline && variantMeans.length) {
    baseline = [...variantMeans].sort((a, b) => b.n - a.n)[0];
  }

  let pausedForHarm = false;
  let note = '';

  if (baseline && exp.status === 'active') {
    for (const v of variantMeans) {
      if (v.variantId === baseline.variantId) continue;
      if (v.n < harmMinN || baseline.n < harmMinN) continue;
      if (v.mean <= baseline.mean - harmDelta) {
        pausedForHarm = true;
        note = `Operational harm pause: variant ${v.variantId.slice(0, 8)} mean ${v.mean.toFixed(3)} ≤ baseline ${baseline.mean.toFixed(3)} − ${harmDelta} (n=${v.n}). Not a p-value claim.`;
        engine.setStatus(experimentId, 'paused');
        db.run(`UPDATE experiments SET hypothesis = $h, updated_at = $now WHERE id = $id`, {
          $h: JSON.stringify({
            ...parseLaunchMeta(hypRow?.hypothesis),
            ...(hypRow?.hypothesis
              ? (() => {
                  try {
                    return JSON.parse(hypRow.hypothesis);
                  } catch {
                    return {};
                  }
                })()
              : {}),
            earlyStopNote: note,
          }),
          $now: new Date().toISOString(),
          $id: unbrand(experimentId),
        });
        break;
      }
    }
  }

  const activatedAt = exp.activatedAt ? new Date(exp.activatedAt).getTime() : Date.now();
  const elapsedDays = (Date.now() - activatedAt) / 86_400_000;
  const analysisReady = elapsedDays >= exp.policy.minDurationDays;

  if (!note) {
    note = analysisReady
      ? `Analysis-ready: ${elapsedDays.toFixed(1)}d ≥ minDuration ${exp.policy.minDurationDays}d.`
      : `Descriptive only: ${Math.ceil(exp.policy.minDurationDays - elapsedDays)} more day(s) before decision window.`;
  }

  const refreshed = engine.getExperiment(experimentId)!;
  return {
    experimentId,
    status: refreshed.status,
    analysisReady,
    elapsedDays,
    minDurationDays: exp.policy.minDurationDays,
    pausedForHarm,
    note,
    variantMeans,
  };
}

/** Resolve string experiment id at CLI boundary. */
export function dailyCheckById(db: Database, experimentId: string): DailyCheckResult {
  // brand-ok — intentional CLI boundary: parses to ExperimentId via asExperimentId below
  return dailyCheck(db, asExperimentId(experimentId));
}
