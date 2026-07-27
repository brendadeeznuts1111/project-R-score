// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Operations portal summary payload — live SQLite → JSON.
 * Used by Pages Function `/api/operations/summary` and `ops:snapshot`.
 *
 * Metrics panels: growth_metrics (ops) + Bun utils proof (runtime fingerprint).
 * Triage runbook: docs/harness/ops-summary-endpoint.md · bun run ops:diagnose
 */
import type { Database } from 'bun:sqlite';
import { buildBunUtilsProof } from '../bun-utils-proof.ts';
import { loadRoutingOpsSliceSync, type RoutingOpsSlice } from '../routing-proof.ts';
import { getPredictionAccuracy } from '../prediction/index.ts';
import { queryPartnersSlice, type PartnersSummarySlice } from './partner-profile-bridge.ts';
import { queryOpsChannelHealth } from '../channels/outbox.ts';
import type { OpsChannelHealthSlice } from '../channels/ops-channel-event.ts';
import { loadTocOpsSummarySlice, type TocOpsSummarySlice } from '../toc-ops/export-snapshot.ts';
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

export type OpsSummaryRegistryClient = {
  available: boolean;
  sdkVersion?: string;
  passed?: number;
  total?: number;
  status?: 'pass' | 'fail';
  subsystem?: 'package-manager';
  proofHash?: string;
  timestamp?: string;
  path: '/registry/registry-client-proof.json';
};

export type OpsSummaryDocsCoverage = {
  available: boolean;
  ok?: boolean;
  subsystem?: 'other';
  missingCanonicalCount?: number;
  catalogTracked?: number;
  catalogTotal?: number;
  overlayTracked?: number;
  overlayTotal?: number;
  referenceModuleCount?: number;
  referencePageCount?: number;
  indexStale?: boolean;
  proofHash?: string;
  timestamp?: string;
  path: '/registry/docs-coverage-proof.json';
};

/** Cloudflare token scope + MCP catalog parity (Layer 2 + Layer 5). */
export type OpsSummaryCloudflareTokenScope = {
  available: boolean;
  ok?: boolean;
  status?: 'pass' | 'fail' | 'partial';
  tier?: string;
  staticOk?: boolean;
  liveOk?: boolean | null;
  liveAvailable?: boolean;
  mcpCatalogOk?: boolean;
  serverCount?: number;
  proofHash?: string;
  timestamp?: string;
  path: '/registry/cloudflare-token-scope-proof.json';
  wellKnownPath: '/.well-known/mcp.json';
};

/** Pages deploy preflight report (public/registry/cloudflare-pages-preflight.json). */
export type OpsSummaryCloudflarePages = {
  available: boolean;
  ok?: boolean;
  steps?: Array<{ id: string; ok: boolean; detail?: string }>; // brand-ok — step id keys
  timestamp?: string;
  pagesUrl?: string;
  path: '/registry/cloudflare-pages-preflight.json';
};

export type OpsSummaryProofTaxonomyAuditRow = {
  path: string;
  reportPath: string;
  ok: boolean;
  primarySubsystem: string;
  rows: number;
};

export type OpsSummaryProofTaxonomyConsistencyRow = {
  id: string; // brand-ok — opaque consistency check id
  ok: boolean;
};

export type OpsSummaryProofTaxonomy = {
  available: boolean;
  ok?: boolean;
  contracts?: number;
  contractsOk?: number;
  consistencyOk?: number;
  consistencyTotal?: number;
  /** Per-contract rows — embedded so portal renders without full audit JSON fetch. */
  audits?: OpsSummaryProofTaxonomyAuditRow[];
  consistency?: OpsSummaryProofTaxonomyConsistencyRow[];
  proofHash?: string;
  timestamp?: string;
  path: '/registry/proof-taxonomy-audit.json';
};

/** Channel meta bake rollup (suite=all → release-features + sources sidecar). */
export type OpsSummaryChannelMeta = {
  available: boolean;
  ok?: boolean;
  /** bake.proofHash ≠ release-features.proofHash */
  stale?: boolean;
  passed?: number;
  total?: number;
  status?: 'pass' | 'fail';
  proofHash?: string;
  updatedAt?: string;
  channel?: string;
  targetVersion?: string;
  runtimeVersion?: string;
  bySubsystem?: Partial<Record<string, { passed: number; total: number }>>;
  sources?: {
    release: string;
    nits: string;
    bundler: string;
    networking: string;
  };
  path: '/registry/release-features.json';
  bakePath: '/registry/channel-meta-bake.json';
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
  /**
   * Registry client SDK proof from public/registry/registry-client-proof.json
   * (refreshed by `bun run verify:registry-client:save`).
   */
  registryClient: OpsSummaryRegistryClient;
  /**
   * Docs coverage proof from public/registry/docs-coverage-proof.json
   * (RSS + reference + canonical alignment; `bun run verify:docs-coverage:save`).
   */
  docsCoverage: OpsSummaryDocsCoverage;
  /**
   * Cloudflare token scope proof from public/registry/cloudflare-token-scope-proof.json
   * (`bun run verify:cloudflare-token:save`).
   */
  cloudflareTokenScope: OpsSummaryCloudflareTokenScope;
  /**
   * Pages preflight from public/registry/cloudflare-pages-preflight.json
   * (`bun run cloudflare:preflight --save` / `ops:snapshot`).
   */
  cloudflarePages: OpsSummaryCloudflarePages;
  /**
   * Proof taxonomy audit from public/registry/proof-taxonomy-audit.json
   * (`bun run verify:proof-taxonomy:save` / `verify-all` / `ops:snapshot`).
   */
  proofTaxonomy: OpsSummaryProofTaxonomy;
  /**
   * Channel meta bake from public/registry/channel-meta-bake.json
   * (`bun run verify:channel:meta` / `ops:snapshot` / suite=all).
   */
  channelMeta: OpsSummaryChannelMeta;
  /**
   * Last routing proof from public/registry/@factorywager/routing-test/latest.json
   * (refreshed by `bun run routing:proof:write` or `ops:snapshot --routing`).
   */
  routing: RoutingOpsSlice;
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

const REGISTRY_CLIENT_PROOF_PATH = 'public/registry/registry-client-proof.json';

/** Disk snapshot of registry client verification (resolve · download · publish). */
export function loadRegistryClientProofSlice(
  path: string = REGISTRY_CLIENT_PROOF_PATH
): OpsSummaryRegistryClient {
  try {
    const mapped = Bun.mmap(path);
    const data = JSON.parse(new TextDecoder().decode(mapped)) as {
      sdkVersion?: string;
      subsystem?: 'package-manager';
      summary?: { passed?: number; total?: number; status?: 'pass' | 'fail' };
      proofHash?: string;
      timestamp?: string;
    };
    return {
      available: true,
      sdkVersion: data.sdkVersion,
      passed: data.summary?.passed,
      total: data.summary?.total,
      status: data.summary?.status,
      subsystem: data.subsystem ?? 'package-manager',
      proofHash: data.proofHash,
      timestamp: data.timestamp,
      path: '/registry/registry-client-proof.json',
    };
  } catch {
    return { available: false, path: '/registry/registry-client-proof.json' };
  }
}

const DOCS_COVERAGE_PROOF_PATH = 'public/registry/docs-coverage-proof.json';
const CLOUDFLARE_TOKEN_SCOPE_PROOF_PATH = 'public/registry/cloudflare-token-scope-proof.json';
const CLOUDFLARE_PAGES_PREFLIGHT_PATH = 'public/registry/cloudflare-pages-preflight.json';
const PROOF_TAXONOMY_AUDIT_PATH = 'public/registry/proof-taxonomy-audit.json';
const CHANNEL_META_BAKE_PATH = 'public/registry/channel-meta-bake.json';
const RELEASE_FEATURES_PATH = 'public/registry/release-features.json';

/** Disk snapshot of channel meta bake (prefer sidecar; fall back to release-features). */
export function loadChannelMetaSlice(
  bakePath: string = CHANNEL_META_BAKE_PATH,
  releasePath: string = RELEASE_FEATURES_PATH
): OpsSummaryChannelMeta {
  const empty: OpsSummaryChannelMeta = {
    available: false,
    path: '/registry/release-features.json',
    bakePath: '/registry/channel-meta-bake.json',
  };
  try {
    const mapped = Bun.mmap(bakePath);
    const bake = JSON.parse(new TextDecoder().decode(mapped)) as {
      type?: string;
      status?: 'pass' | 'fail';
      passed?: number;
      total?: number;
      proofHash?: string;
      updatedAt?: string;
      channel?: string;
      targetVersion?: string;
      runtimeVersion?: string;
      bySubsystem?: OpsSummaryChannelMeta['bySubsystem'];
      sources?: OpsSummaryChannelMeta['sources'];
    };
    if (bake.type === 'ChannelMetaBake') {
      let stale = false;
      try {
        const relMapped = Bun.mmap(releasePath);
        const rel = JSON.parse(new TextDecoder().decode(relMapped)) as {
          proofHash?: string;
          results?: Array<{ name?: string }>;
        };
        if (bake.proofHash && rel.proofHash && bake.proofHash !== rel.proofHash) {
          stale = true;
        }
        // Release-only overwrite left bake claiming suite=all embeds.
        const hasEmbeds = (rel.results ?? []).some(r =>
          /^(runtime-nits:|bundler:|networking:)/.test(String(r.name ?? ''))
        );
        if (!hasEmbeds && (bake.total ?? 0) > 0) {
          stale = true;
        }
      } catch {
        /* release missing — bake alone is still available */
      }
      return {
        available: true,
        ok: bake.status === 'pass' && !stale,
        stale,
        passed: bake.passed,
        total: bake.total,
        status: bake.status,
        proofHash: bake.proofHash,
        updatedAt: bake.updatedAt,
        channel: bake.channel,
        targetVersion: bake.targetVersion,
        runtimeVersion: bake.runtimeVersion,
        bySubsystem: bake.bySubsystem,
        sources: bake.sources,
        path: '/registry/release-features.json',
        bakePath: '/registry/channel-meta-bake.json',
      };
    }
  } catch {
    /* fall through to release-features */
  }
  try {
    const mapped = Bun.mmap(releasePath);
    const rel = JSON.parse(new TextDecoder().decode(mapped)) as {
      type?: string;
      summary?: {
        passed?: number;
        total?: number;
        status?: 'pass' | 'fail';
        bySubsystem?: OpsSummaryChannelMeta['bySubsystem'];
      };
      proofHash?: string;
      timestamp?: string;
      semanticTags?: {
        channel?: string;
        targetVersion?: string;
        runtimeVersion?: string;
      };
    };
    if (rel.type !== 'ChannelAwareVerificationReport' || !rel.summary) return empty;
    return {
      available: true,
      ok: rel.summary.status === 'pass',
      passed: rel.summary.passed,
      total: rel.summary.total,
      status: rel.summary.status,
      proofHash: rel.proofHash,
      updatedAt: rel.timestamp,
      channel: rel.semanticTags?.channel,
      targetVersion: rel.semanticTags?.targetVersion,
      runtimeVersion: rel.semanticTags?.runtimeVersion,
      bySubsystem: rel.summary.bySubsystem,
      path: '/registry/release-features.json',
      bakePath: '/registry/channel-meta-bake.json',
    };
  } catch {
    return empty;
  }
}

/** Disk snapshot of proof taxonomy audit (contracts + cross-proof consistency). */
export function loadProofTaxonomySlice(
  path: string = PROOF_TAXONOMY_AUDIT_PATH
): OpsSummaryProofTaxonomy {
  try {
    const mapped = Bun.mmap(path);
    const data = JSON.parse(new TextDecoder().decode(mapped)) as {
      ok?: boolean;
      proofHash?: string;
      timestamp?: string;
      audits?: Array<{
        path?: string;
        reportPath?: string;
        ok?: boolean;
        primarySubsystem?: string;
        rows?: number;
      }>;
      consistency?: Array<{ id?: string; ok?: boolean }>; // brand-ok — consistency row id
    };
    const audits = data.audits ?? [];
    const consistency = data.consistency ?? [];
    return {
      available: true,
      ok: data.ok,
      contracts: audits.length,
      contractsOk: audits.filter(a => a.ok).length,
      consistencyOk: consistency.filter(c => c.ok).length,
      consistencyTotal: consistency.length,
      audits: audits.map(a => ({
        path: a.path ?? '',
        reportPath: a.reportPath ?? '',
        ok: a.ok === true,
        primarySubsystem: a.primarySubsystem ?? 'other',
        rows: a.rows ?? 0,
      })),
      consistency: consistency.map(c => ({
        id: c.id ?? 'unknown',
        ok: c.ok === true,
      })),
      proofHash: data.proofHash,
      timestamp: data.timestamp,
      path: '/registry/proof-taxonomy-audit.json',
    };
  } catch {
    return { available: false, path: '/registry/proof-taxonomy-audit.json' };
  }
}

/** Disk snapshot of docs coverage verification (RSS · reference · canonical). */
export function loadDocsCoverageProofSlice(
  path: string = DOCS_COVERAGE_PROOF_PATH
): OpsSummaryDocsCoverage {
  try {
    const mapped = Bun.mmap(path);
    const data = JSON.parse(new TextDecoder().decode(mapped)) as {
      subsystem?: 'other';
      summary?: { ok?: boolean; missingCanonicalCount?: number; indexStale?: boolean };
      canonical?: {
        catalogTracked?: number;
        catalogTotal?: number;
        overlayTracked?: number;
        overlayTotal?: number;
      };
      reference?: { moduleCount?: number; pageCount?: number };
      proofHash?: string;
      timestamp?: string;
    };
    return {
      available: true,
      ok: data.summary?.ok,
      subsystem: data.subsystem ?? 'other',
      missingCanonicalCount: data.summary?.missingCanonicalCount,
      catalogTracked: data.canonical?.catalogTracked,
      catalogTotal: data.canonical?.catalogTotal,
      overlayTracked: data.canonical?.overlayTracked,
      overlayTotal: data.canonical?.overlayTotal,
      referenceModuleCount: data.reference?.moduleCount,
      referencePageCount: data.reference?.pageCount,
      indexStale: data.summary?.indexStale,
      proofHash: data.proofHash,
      timestamp: data.timestamp,
      path: '/registry/docs-coverage-proof.json',
    };
  } catch {
    return { available: false, path: '/registry/docs-coverage-proof.json' };
  }
}

/** Disk snapshot of Cloudflare token scope + MCP catalog parity proof. */
export function loadCloudflareTokenScopeSlice(
  path: string = CLOUDFLARE_TOKEN_SCOPE_PROOF_PATH
): OpsSummaryCloudflareTokenScope {
  try {
    const mapped = Bun.mmap(path);
    const data = JSON.parse(new TextDecoder().decode(mapped)) as {
      summary?: {
        ok?: boolean;
        status?: 'pass' | 'fail' | 'partial';
        tier?: string;
        staticOk?: boolean;
        liveOk?: boolean | null;
      };
      mcpCatalog?: { ok?: boolean; serverCount?: number };
      liveProbe?: { available?: boolean };
      proofHash?: string;
      timestamp?: string;
    };
    return {
      available: true,
      ok: data.summary?.ok,
      status: data.summary?.status,
      tier: data.summary?.tier,
      staticOk: data.summary?.staticOk,
      liveOk: data.summary?.liveOk,
      liveAvailable: data.liveProbe?.available,
      mcpCatalogOk: data.mcpCatalog?.ok,
      serverCount: data.mcpCatalog?.serverCount,
      proofHash: data.proofHash,
      timestamp: data.timestamp,
      path: '/registry/cloudflare-token-scope-proof.json',
      wellKnownPath: '/.well-known/mcp.json',
    };
  } catch {
    return {
      available: false,
      path: '/registry/cloudflare-token-scope-proof.json',
      wellKnownPath: '/.well-known/mcp.json',
    };
  }
}

/** Disk snapshot of Cloudflare Pages preflight (deploy gate). */
export function loadCloudflarePagesPreflightSlice(
  path: string = CLOUDFLARE_PAGES_PREFLIGHT_PATH
): OpsSummaryCloudflarePages {
  try {
    const mapped = Bun.mmap(path);
    const data = JSON.parse(new TextDecoder().decode(mapped)) as {
      ok?: boolean;
      steps?: Array<{ id?: string; ok?: boolean; detail?: string }>; // brand-ok — preflight step key
      timestamp?: string;
      pagesUrl?: string;
    };
    return {
      available: true,
      ok: data.ok,
      steps: data.steps?.map(s => ({
        id: s.id ?? 'unknown', // brand-ok — preflight step key
        ok: Boolean(s.ok),
        detail: s.detail,
      })),
      timestamp: data.timestamp,
      pagesUrl: data.pagesUrl,
      path: '/registry/cloudflare-pages-preflight.json',
    };
  } catch {
    return {
      available: false,
      path: '/registry/cloudflare-pages-preflight.json',
    };
  }
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
    registryClient: loadRegistryClientProofSlice(),
    docsCoverage: loadDocsCoverageProofSlice(),
    cloudflareTokenScope: loadCloudflareTokenScopeSlice(),
    cloudflarePages: loadCloudflarePagesPreflightSlice(),
    proofTaxonomy: loadProofTaxonomySlice(),
    channelMeta: loadChannelMetaSlice(),
    routing: loadRoutingOpsSliceSync(),
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
  };
}
