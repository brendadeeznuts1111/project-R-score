// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Operations portal summary payload — live SQLite → JSON.
 * Used by Pages Function `/api/operations/summary` and `ops:snapshot`.
 *
 * **Composition:** domain (`buildOpsDomainSummary`) ∪ proof strip
 * (`buildOpsSummaryProofStrip` in `ops-summary-proof.ts`) → flat
 * `OpsSummaryPayload` for wire/portal (no nested `proof` key).
 *
 * Metrics panels: growth_metrics (ops) + Bun utils proof (runtime fingerprint).
 * Triage runbook: docs/harness/ops-summary-endpoint.md · bun run ops:diagnose
 */
import type { Database } from 'bun:sqlite';
import { queryRecentLimitChanges } from '../account-limits-repo.ts';
import {
  buildOpsStrip,
  computeReportDiagnostics,
  getPredictionAccuracy,
  loadCoverageSeries,
  reportQuality,
  WITHIN5_TARGET_PCT,
} from '../prediction/index.ts';
import { queryPartnersSlice, type PartnersSummarySlice } from './partner-profile-bridge.ts';
import { queryOpsChannelHealth } from '../channels/outbox.ts';
import {
  computeMultiFactorScore,
  PartnerAnalyticsRepository,
  type RaiseContextProofStatus,
} from './partner-analytics-repo.ts';
import type { OpsChannelHealthSlice } from '../channels/ops-channel-event.ts';
import { loadTocOpsSummarySlice, type TocOpsSummarySlice } from '../toc-ops/export-snapshot.ts';
import {
  loadComplianceSummarySliceSync,
  type ComplianceSummarySlice,
} from '../monitoring/compliance-slice.ts';
import {
  queryLoopMetricsSlice,
  withProjectorBackendSignal,
  type OpsLoopMetricsSlice,
} from './ops-loop-metrics.ts';
import { resolveProductionOutboxOpts } from '../channels/outbox-prod-opts.ts';
import {
  loadTelegramHandshakeSummarySlice,
  type TelegramHandshakeSummarySlice,
} from '../telegram/handshake-snapshot.ts';
import {
  loadSeatCapitalDeskSummarySlice,
  type SeatCapitalDeskSummarySlice,
} from '../telegram/seat-desk-snapshot.ts';
import { asTreeNodeId, parseTreeNodeId, type TreeNodeId } from '../types/branded.ts';
import { buildLimitPatternSnapshot, type LimitPatternSnapshot } from './limit-patterns.ts';
import { buildOpsSummaryProofStrip, type OpsSummaryProofStrip } from './ops-summary-proof.ts';

// Proof strip types + loaders (re-export for existing import paths)
export {
  buildOpsSummaryProofStrip,
  queryBunUtilsProof,
  loadRegistryClientProofSlice,
  loadChannelMetaSlice,
  loadProofTaxonomySlice,
  loadDocsCoverageProofSlice,
  loadCloudflareTokenScopeSlice,
  loadCloudflarePagesPreflightSlice,
  type OpsSummaryProofStrip,
  type OpsSummaryBunUtils,
  type OpsSummaryRegistryClient,
  type OpsSummaryDocsCoverage,
  type OpsSummaryCloudflareTokenScope,
  type OpsSummaryCloudflarePages,
  type OpsSummaryProofTaxonomy,
  type OpsSummaryProofTaxonomyAuditRow,
  type OpsSummaryProofTaxonomyConsistencyRow,
  type OpsSummaryChannelMeta,
  type OpsSummaryMonorepoHealth,
  type OpsSummaryBunBrandMap,
} from './ops-summary-proof.ts';
export type { RoutingOpsSlice } from '../routing-proof.ts';

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

/** Partner profile bindings (I1 identity lane). */
export type OpsSummaryPartners = PartnersSummarySlice;

/** Unified ops channel outbox health (distinct from release channelMeta). */
export type OpsSummaryChannels = OpsChannelHealthSlice;

/** TOC Ops Drum/rails/warmup rollup from /registry/toc-ops.json (optional). */
export type OpsSummaryToc = TocOpsSummarySlice;

/** Closed-loop throughput (dispatch → gate → reserve → settle → durable delivery). */
export type OpsSummaryLoop = OpsLoopMetricsSlice;

/** Package-group Telegram handshake (registry + readiness + invite gaps). */
export type OpsSummaryTelegramHandshake = TelegramHandshakeSummarySlice;

/** SPEN seat capital desk (FUND status · outs · checklist, no passwords). */
export type OpsSummarySeatCapitalDesk = SeatCapitalDeskSummarySlice;

/** MA/NJ compliance board rollup from /registry/compliance-board.json. */
export type OpsSummaryCompliance = ComplianceSummarySlice;

/** Per-node position row for the ops liquidity panel. */
export type OpsSummaryLiquidityPosition = {
  nodeId: TreeNodeId;
  name: string;
  type: string;
  book: string;
  deposited: number;
  available: number;
  inPlay: number;
  lastReconciled: string | null;
};

/**
 * Desk liquidity rollup — soft-balance accounts, position books, and ops pool.
 * `total` stays the active `sb_accounts` sum for seed/contract compatibility.
 */
export type OpsSummaryLiquidity = {
  total: number;
  accounts: { count: number; balance: number };
  positions: {
    count: number;
    deposited: number;
    available: number;
    inPlay: number;
  };
  pool: {
    totalLiquidity: number;
    totalExposure: number;
    available: number;
    updatedAt: string | null;
  };
  topPositions: OpsSummaryLiquidityPosition[];
  /** No active accounts, no positions, and zero pool liquidity. */
  empty: boolean;
};

/**
 * Sportsbook / ops domain slices only (SQLite + product bakes).
 * Does **not** include harness proof strips — see `OpsSummaryProofStrip`.
 */
export type OpsSummaryDomainPayload = {
  source: 'live' | 'snapshot';
  generated: string;
  liquidity: OpsSummaryLiquidity;
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
    coverage: {
      mae: number;
      rmse: number;
      bias: number;
      n: number;
      /** Present when series rows exist (report diagnostics). */
      quality?: 'good' | 'fair' | 'poor' | 'unknown';
      trend?: 'improving' | 'worsening' | 'stable' | 'unknown';
      within5Pct?: number;
      within15Pct?: number;
      within5Status?: 'above_target' | 'marginal' | 'below_target' | 'unknown';
      within5Target?: number;
      biasSeverity?: 'low' | 'medium' | 'high' | 'unknown';
      decayDetected?: boolean;
      errorStdDev?: number;
      maeDelta?: number;
      worstDate?: string;
      maxAbsError?: number;
      stripTone?: 'good' | 'warn' | 'bad' | 'unknown';
      report?: '/registry/prediction/report/';
    };
    limitRaise: {
      mae: number;
      rmse: number;
      bias: number;
      n: number;
      lastPredicted: string | null;
    };
  };
  /** Period growth_metrics rollup (current calendar month). */
  growth: OpsSummaryGrowth;
  /** Partner profile bindings (Identity lane — tree_nodes ↔ template). */
  partners: OpsSummaryPartners;
  /** Ops channel outbox health (not Bun release channelMeta). */
  channels: OpsSummaryChannels;
  /**
   * TOC Ops fixture rollup (partners · WARMED · rails · Gate 12 · bottlenecks).
   * Baked by `bun run ops:seed:toc` / `ops:snapshot` → `/registry/toc-ops.json`.
   */
  toc: OpsSummaryToc;
  /** Ops integration loop counters — baseline/post in reports/ops-loop-*.json. */
  loop: OpsSummaryLoop;
  /**
   * Package-group handshake bake from public/registry/telegram-handshake.json
   * (`ops:snapshot` / `exportTelegramHandshakeSnapshot`).
   */
  telegramHandshake: OpsSummaryTelegramHandshake;
  /**
   * SPEN seat capital desk bake from public/registry/seat-capital-desk.json
   * (`ops:snapshot` / `exportSeatCapitalDeskSnapshot`).
   */
  seatCapitalDesk: OpsSummarySeatCapitalDesk;
  /**
   * MA/NJ compliance board from public/registry/compliance-board.json
   * (`bun run compliance:bake` / ops:snapshot companion).
   */
  compliance: OpsSummaryCompliance;
  /** Recent account limit changes (partner_account_limits table; live query, 48h window). */
  limitChanges: Array<{
    limit_id: number; // brand-ok — partner_account_limits.id
    node_id: string; // brand-ok — TreeNodeId wire
    sportsbook: string;
    sport_id: string; // brand-ok — SportId wire
    market_id: string; // brand-ok — MarketId wire
    bet_type: string;
    previous_max: number;
    new_limit: number;
    increased_at: number;
    direction: 'up' | 'down';
    message: string;
    context_available: boolean;
    multi_factor_score: number;
    top_contributing_factors: string[];
    context_proof: RaiseContextProofStatus | null;
  }>;
  /** Connected hierarchy, sportsbook, state, and ZIP-prefix pattern rollups. */
  limitPatterns: LimitPatternSnapshot;
};

/**
 * Full portal/snapshot wire contract: domain ∪ proof strip (flat keys).
 * Prefer `buildOpsDomainSummary` when you only need SQLite product state.
 */
export type OpsSummaryPayload = OpsSummaryDomainPayload & OpsSummaryProofStrip;

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
  return {
    coverage: { mae: 0, rmse: 0, bias: 0, n: 0 },
    limitRaise: { mae: 0, rmse: 0, bias: 0, n: 0, lastPredicted: null },
  };
}

function queryPrediction(db: Database): OpsSummaryPayload['prediction'] {
  if (!tableExists(db, 'prediction_accuracy')) return emptyPrediction();
  try {
    const coverageAcc = getPredictionAccuracy(db, 'coverage');
    const limitRaiseAcc = getPredictionAccuracy(db, 'limit_raise');
    let lastPredicted: string | null = null;
    try {
      const row = db
        .query(
          `SELECT MAX(prediction_date) as d FROM prediction_accuracy WHERE prediction_type = 'limit_raise'`
        )
        .get() as { d: string | null } | null;
      lastPredicted = row?.d ?? null;
    } catch {
      /* optional */
    }

    let coverage: OpsSummaryPayload['prediction']['coverage'] = { ...coverageAcc };
    if (coverageAcc.n > 0) {
      try {
        const series = loadCoverageSeries(db);
        const d = computeReportDiagnostics(series, coverageAcc);
        const quality = reportQuality(coverageAcc);
        const strip = buildOpsStrip(d, quality);
        coverage = {
          ...coverageAcc,
          quality,
          trend: d.trend,
          within5Pct: d.within5Pct,
          within15Pct: d.within15Pct,
          within5Status: d.within5Status,
          within5Target: WITHIN5_TARGET_PCT,
          biasSeverity: d.biasSeverity,
          decayDetected: d.decayDetected,
          errorStdDev: d.errorStdDev,
          maeDelta: d.maeDelta,
          worstDate: d.worstDate,
          maxAbsError: d.maxAbsError,
          stripTone: strip.stripTone,
          report: '/registry/prediction/report/',
        };
      } catch {
        coverage = { ...coverageAcc, report: '/registry/prediction/report/' };
      }
    }

    return { coverage, limitRaise: { ...limitRaiseAcc, lastPredicted } };
  } catch {
    return emptyPrediction();
  }
}

function queryLimitChangeSummary(db: Database): OpsSummaryPayload['limitChanges'] {
  if (!tableExists(db, 'partner_account_limits')) return [];

  const repositories = new Map<string, PartnerAnalyticsRepository>();
  return queryRecentLimitChanges(db, 48).map(raise => {
    let repository = repositories.get(raise.node_id);
    if (!repository) {
      repository = new PartnerAnalyticsRepository(db, raise.node_id);
      repositories.set(raise.node_id, repository);
    }
    const context = repository.getRaiseContext(raise.limit_id);
    const score = context
      ? computeMultiFactorScore(context)
      : { score: 0, topFactors: [], factorScores: {} };

    return {
      ...raise,
      context_available: context != null,
      multi_factor_score: score.score,
      top_contributing_factors: score.topFactors,
      context_proof: context ? repository.verifyRaiseContextProof(context) : null,
    };
  });
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

/**
 * Accounts + positions + ops pool for the desk liquidity panel.
 * Safe when tables are missing (returns zeros).
 */
export function buildLiquiditySummary(
  db: Database,
  opts?: { topLimit?: number }
): OpsSummaryLiquidity {
  const topLimit = Math.max(1, Math.min(opts?.topLimit ?? 8, 25));

  let accounts = { count: 0, balance: 0 };
  try {
    const row = db
      .query(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(balance), 0) AS balance
         FROM sb_accounts WHERE status = 'active'`
      )
      .get() as { count: number; balance: number };
    accounts = { count: Number(row.count) || 0, balance: Number(row.balance) || 0 };
  } catch {
    /* table missing */
  }

  let positions = { count: 0, deposited: 0, available: 0, inPlay: 0 };
  let topPositions: OpsSummaryLiquidityPosition[] = [];
  try {
    const sum = db
      .query(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(deposited), 0) AS deposited,
                COALESCE(SUM(available), 0) AS available,
                COALESCE(SUM(in_play), 0) AS inPlay
         FROM positions`
      )
      .get() as {
      count: number;
      deposited: number;
      available: number;
      inPlay: number;
    };
    positions = {
      count: Number(sum.count) || 0,
      deposited: Number(sum.deposited) || 0,
      available: Number(sum.available) || 0,
      inPlay: Number(sum.inPlay) || 0,
    };

    const rows = db
      .query(
        `SELECT p.node_id AS nodeId,
                p.book AS book,
                p.deposited AS deposited,
                p.available AS available,
                p.in_play AS inPlay,
                p.last_reconciled AS lastReconciled,
                COALESCE(tn.name, p.node_id) AS name,
                COALESCE(tn.type, 'unknown') AS type
         FROM positions p
         LEFT JOIN tree_nodes tn ON tn.id = p.node_id
         ORDER BY p.deposited DESC, p.available DESC
         LIMIT $limit`
      )
      .all({ $limit: topLimit }) as Array<{
      nodeId: unknown;
      book: string;
      deposited: number;
      available: number;
      inPlay: number;
      lastReconciled: string | null;
      name: string;
      type: string;
    }>;

    topPositions = rows.map(r => {
      const nodeId = parseTreeNodeId(r.nodeId);
      return {
        nodeId,
        name: r.name || nodeId,
        type: r.type || 'unknown',
        book: r.book || '_all',
        deposited: Number(r.deposited) || 0,
        available: Number(r.available) || 0,
        inPlay: Number(r.inPlay) || 0,
        lastReconciled: r.lastReconciled ?? null,
      };
    });
  } catch {
    /* positions / tree_nodes missing */
  }

  let pool = {
    totalLiquidity: 0,
    totalExposure: 0,
    available: 0,
    updatedAt: null as string | null,
  };
  try {
    const row = db
      .query(
        `SELECT total_liquidity AS totalLiquidity,
                total_exposure AS totalExposure,
                updated_at AS updatedAt
         FROM operations WHERE id = 'main'`
      )
      .get() as {
      totalLiquidity: number;
      totalExposure: number;
      updatedAt: string | null;
    } | null;
    if (row) {
      const totalLiquidity = Number(row.totalLiquidity) || 0;
      const totalExposure = Number(row.totalExposure) || 0;
      pool = {
        totalLiquidity,
        totalExposure,
        available: totalLiquidity - totalExposure,
        updatedAt: row.updatedAt ?? null,
      };
    }
  } catch {
    /* operations table missing */
  }

  const empty =
    accounts.count === 0 &&
    positions.count === 0 &&
    pool.totalLiquidity === 0 &&
    pool.totalExposure === 0;

  return {
    total: accounts.balance,
    accounts,
    positions,
    pool,
    topPositions,
    empty,
  };
}

/**
 * Domain-only ops summary (SQLite product state + product bakes).
 * Omits harness proof strips — use `buildOpsSummary` for the full portal wire.
 */
export function buildOpsDomainSummary(
  db: Database,
  source: 'live' | 'snapshot' = 'live'
): OpsSummaryDomainPayload {
  const liquidity = buildLiquiditySummary(db);

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

  const limitChanges = queryLimitChangeSummary(db);
  const limitPatterns = buildLimitPatternSnapshot(
    db,
    limitChanges.map(change => ({
      ...change,
      node_id: asTreeNodeId(change.node_id),
      context_proof_valid: change.context_proof?.valid ?? null,
    })),
    48
  );

  return {
    source,
    generated: new Date().toISOString(),
    liquidity,
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
    partners: queryPartnersSlice(db),
    channels: queryOpsChannelHealth(db),
    toc: loadTocOpsSummarySlice(),
    loop: (() => {
      const outbox = resolveProductionOutboxOpts({ deliver: false });
      return withProjectorBackendSignal(queryLoopMetricsSlice(db), {
        backend: outbox.projectorBackend,
        bucket: outbox.projectorBucket ?? null,
      });
    })(),
    telegramHandshake: loadTelegramHandshakeSummarySlice(),
    seatCapitalDesk: loadSeatCapitalDeskSummarySlice(),
    compliance: loadComplianceSummarySliceSync(),
    limitChanges,
    limitPatterns,
  };
}

/** Full ops summary (domain ∪ proof strip) — portal + `ops:snapshot` wire. */
export function buildOpsSummary(
  db: Database,
  source: 'live' | 'snapshot' = 'live'
): OpsSummaryPayload {
  return {
    ...buildOpsDomainSummary(db, source),
    ...buildOpsSummaryProofStrip(),
  };
}
