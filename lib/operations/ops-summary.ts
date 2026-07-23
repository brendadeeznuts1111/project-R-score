// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Operations portal summary payload — live SQLite → JSON.
 * Used by Pages Function `/api/operations/summary` and `ops:snapshot`.
 *
 * Metrics panels: growth_metrics (ops) + Bun utils proof (runtime fingerprint).
 */
import type { Database } from 'bun:sqlite';
import { buildBunUtilsProof } from '../bun-utils-proof.ts';
import { getPredictionAccuracy } from '../prediction/index.ts';

export type OpsSummaryExpert = {
  name: string;
  sport: string;
  market: string;
  edge_score: number;
  active: number;
};

export type OpsSummaryPlay = {
  sport: string;
  market: string;
  event: string;
  selection: string;
  odds: number;
  confidence: number;
  sent_at: string;
  result: string;
  expert_name: string;
  sent_count: number;
  placed_count: number;
};

export type OpsSummaryExperiment = {
  id: string; // brand-ok — ExperimentId at wire
  name: string;
  status: string;
  designMethod: string;
  metricName: string;
  variants: number;
  assignments: number;
  metrics: number;
};

export type OpsSummaryGrowthNode = {
  nodeId: string; // brand-ok — tree_nodes.id
  playsReceived: number;
  playsPlaced: number;
  volume: number;
  pnl: number;
};

export type OpsSummaryGrowth = {
  period: string;
  playsReceived: number;
  playsPlaced: number;
  volume: number;
  pnl: number;
  nodes: number;
  top: OpsSummaryGrowthNode[];
};

export type OpsSummaryBunUtils = {
  bunVersion: string;
  bunRevision: string;
  proofHash: string;
  passed: number;
  total: number;
  failed: number;
  timestamp: string;
};

export type OpsSummaryPayload = {
  source: 'live' | 'snapshot';
  generated: string;
  liquidity: { total: number };
  experts: OpsSummaryExpert[];
  tree: {
    partners: number;
    agents: number;
    subAgents: number;
    downstreamLiquidity: number;
  };
  plays: OpsSummaryPlay[];
  rails: Array<{ type: string; total_sent: number; monthly_limit: number }>;
  phones: { inventory: number; issued: number; returned: number };
  experiments: {
    byStatus: Record<string, number>;
    active: number;
    recent: OpsSummaryExperiment[];
  };
  prediction: {
    coverage: { mae: number; rmse: number; bias: number; n: number };
  };
  /** Period growth_metrics rollup (current calendar month). */
  growth: OpsSummaryGrowth;
  /** Self-verifying Bun.stringWidth / deepEquals / inspect fingerprint. */
  bunUtils: OpsSummaryBunUtils;
};

function tableExists(db: Database, name: string): boolean {
  const row = db
    .query(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = $n LIMIT 1`)
    .get({ $n: name }) as { ok: number } | null;
  return row != null;
}

function emptyExperiments(): OpsSummaryPayload['experiments'] {
  return { byStatus: {}, active: 0, recent: [] };
}

function emptyPrediction(): OpsSummaryPayload['prediction'] {
  return { coverage: { mae: 0, rmse: 0, bias: 0, n: 0 } };
}

function queryExperiments(db: Database): OpsSummaryPayload['experiments'] {
  if (!tableExists(db, 'experiments')) return emptyExperiments();

  const statusRows = db
    .query(`SELECT status, COUNT(*) AS n FROM experiments GROUP BY status`)
    .all() as Array<{ status: string; n: number }>;
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r.n;

  const recent = db
    .query(
      `SELECT e.id, e.name, e.status, e.design_method, e.metric_name,
              (SELECT COUNT(*) FROM experiment_variants v WHERE v.experiment_id = e.id) AS variants,
              (SELECT COUNT(*) FROM experiment_assignments a WHERE a.experiment_id = e.id) AS assignments,
              (SELECT COUNT(*) FROM experiment_metrics m WHERE m.experiment_id = e.id) AS metrics
       FROM experiments e
       ORDER BY e.created_at DESC
       LIMIT 8`
    )
    .all() as Array<{
    id: string; // brand-ok
    name: string;
    status: string;
    design_method: string;
    metric_name: string;
    variants: number;
    assignments: number;
    metrics: number;
  }>;

  return {
    byStatus,
    active: byStatus.active ?? 0,
    recent: recent.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      designMethod: r.design_method,
      metricName: r.metric_name,
      variants: r.variants,
      assignments: r.assignments,
      metrics: r.metrics,
    })),
  };
}

function queryPrediction(db: Database): OpsSummaryPayload['prediction'] {
  if (!tableExists(db, 'prediction_accuracy')) return emptyPrediction();
  try {
    return { coverage: getPredictionAccuracy(db, 'coverage') };
  } catch {
    return emptyPrediction();
  }
}

function emptyGrowth(period: string): OpsSummaryGrowth {
  return {
    period,
    playsReceived: 0,
    playsPlaced: 0,
    volume: 0,
    pnl: 0,
    nodes: 0,
    top: [],
  };
}

/** Current YYYY-MM growth_metrics aggregates + top nodes. */
export function queryGrowth(db: Database, period?: string): OpsSummaryGrowth {
  const p = period ?? new Date().toISOString().slice(0, 7);
  if (!tableExists(db, 'growth_metrics')) return emptyGrowth(p);

  const totals = db
    .query(
      `SELECT
         COALESCE(SUM(plays_received), 0) AS playsReceived,
         COALESCE(SUM(plays_placed), 0) AS playsPlaced,
         COALESCE(SUM(volume), 0) AS volume,
         COALESCE(SUM(pnl), 0) AS pnl,
         COUNT(*) AS nodes
       FROM growth_metrics WHERE period = $p`
    )
    .get({ $p: p }) as {
    playsReceived: number;
    playsPlaced: number;
    volume: number;
    pnl: number;
    nodes: number;
  };

  const top = db
    .query(
      `SELECT node_id, plays_received, plays_placed, volume, pnl
       FROM growth_metrics
       WHERE period = $p
       ORDER BY (plays_received + plays_placed) DESC, volume DESC
       LIMIT 5`
    )
    .all({ $p: p }) as Array<{
    node_id: string; // brand-ok — opaque growth_metrics row, not domain NodeId
    plays_received: number;
    plays_placed: number;
    volume: number;
    pnl: number;
  }>;

  return {
    period: p,
    playsReceived: totals.playsReceived,
    playsPlaced: totals.playsPlaced,
    volume: totals.volume,
    pnl: totals.pnl,
    nodes: totals.nodes,
    top: top.map(r => ({
      nodeId: r.node_id,
      playsReceived: r.plays_received,
      playsPlaced: r.plays_placed,
      volume: r.volume,
      pnl: r.pnl,
    })),
  };
}

/** Run Bun utils proof and project fields for the portal panel. */
export function queryBunUtilsProof(): OpsSummaryBunUtils {
  const proof = buildBunUtilsProof();
  return {
    bunVersion: proof.bunVersion,
    bunRevision: proof.bunRevision,
    proofHash: proof.proofHash ?? '',
    passed: proof.summary.passed,
    total: proof.summary.total,
    failed: proof.summary.failed,
    timestamp: proof.timestamp,
  };
}

/** Build full ops summary from an open operations DB. */
export function buildOpsSummary(
  db: Database,
  source: 'live' | 'snapshot' = 'live'
): OpsSummaryPayload {
  const liquidity = db
    .query(`SELECT COALESCE(SUM(balance), 0) AS total FROM sb_accounts WHERE status = 'active'`)
    .get() as { total: number };

  const experts = db
    .query(`SELECT name, sport, market, edge_score, active FROM experts ORDER BY edge_score DESC`)
    .all() as OpsSummaryExpert[];

  const tree = db
    .query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'partner' THEN 1 ELSE 0 END), 0) AS partners,
         COALESCE(SUM(CASE WHEN type = 'agent' THEN 1 ELSE 0 END), 0) AS agents,
         COALESCE(SUM(CASE WHEN type = 'sub_agent' THEN 1 ELSE 0 END), 0) AS subAgents
       FROM tree_nodes WHERE active = 1`
    )
    .get() as { partners: number; agents: number; subAgents: number };

  const downstream = db
    .query(
      `WITH RECURSIVE down_tree AS (
         SELECT id FROM tree_nodes WHERE parent_id IS NULL AND active = 1
         UNION ALL
         SELECT n.id FROM tree_nodes n JOIN down_tree d ON n.parent_id = d.id WHERE n.active = 1
       )
       SELECT COALESCE(SUM(a.balance), 0) AS total
       FROM sb_accounts a JOIN down_tree d ON a.agent_id = d.id WHERE a.status = 'active'`
    )
    .get() as { total: number };

  const plays = db
    .query(
      `SELECT p.sport, p.market, p.event, p.selection, p.odds,
              p.confidence, p.sent_at, p.result,
              e.name AS expert_name,
              (SELECT COUNT(*) FROM play_distribution WHERE play_id = p.id) AS sent_count,
              (SELECT COUNT(*) FROM play_distribution WHERE play_id = p.id AND status = 'placed') AS placed_count
       FROM plays p
       JOIN experts e ON p.expert_id = e.id
       WHERE date(p.sent_at) = date('now')
       ORDER BY p.sent_at DESC LIMIT 20`
    )
    .all() as OpsSummaryPlay[];

  const rails = db
    .query(
      `SELECT type, COALESCE(SUM(total_sent), 0) AS total_sent,
              COALESCE(SUM(monthly_limit), 0) AS monthly_limit
       FROM rails WHERE status = 'active' GROUP BY type`
    )
    .all() as Array<{ type: string; total_sent: number; monthly_limit: number }>;

  const phones = db
    .query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'inventory' THEN 1 ELSE 0 END), 0) AS inventory,
         COALESCE(SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END), 0) AS issued,
         COALESCE(SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END), 0) AS returned
       FROM phones`
    )
    .get() as { inventory: number; issued: number; returned: number };

  return {
    source,
    generated: new Date().toISOString(),
    liquidity: { total: liquidity.total },
    experts,
    tree: {
      partners: tree.partners,
      agents: tree.agents,
      subAgents: tree.subAgents,
      downstreamLiquidity: downstream.total,
    },
    plays,
    rails,
    phones,
    experiments: queryExperiments(db),
    prediction: queryPrediction(db),
    growth: queryGrowth(db),
    bunUtils: queryBunUtilsProof(),
  };
}
