// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/sqlite
/**
 * Partner profile bridge — root SSOT adapter keyed by ops tree nodes.
 *
 * Materializes profile views from tree_nodes + partner_platform_accounts +
 * provisioning status. Policy evaluation is a root-owned subset of Sports Terminal
 * PartnerGateway (nested product remains a template/policy adapter, not a ledger).
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import {
  parsePartnerLifecycleStatus,
  type PartnerLifecycleStatus,
} from '../partner-profile/schema.ts';
import {
  asGateDecisionId,
  asPartnerProfileKey,
  asPartnerTemplateId,
  asTreeNodeId,
  type GateDecisionId,
  type PartnerProfileKey,
  type PartnerTemplateId,
  type TreeNodeId,
} from '../types/branded/operations.ts';
import { templateIdForOnboardingSource } from './onboarding-config.ts';

/** @deprecated Import the canonical type from partner-profile/schema.ts. */
export type { PartnerLifecycleStatus } from '../partner-profile/schema.ts';

export const DEFAULT_TEMPLATE_ID = 'default-prospect';
/** Alias used by backfill / docs for the same default onboarding template. */
export const DEFAULT_PARTNER_TEMPLATE_V1 = DEFAULT_TEMPLATE_ID;
export const PARTNER_TEMPLATES_DIR = 'config/partner-templates';

/**
 * Map onboarding source / tenant intent → template id.
 * Reads config/onboarding-defaults.toml via onboarding-config.
 */
export function templateIdForSource(source?: string): PartnerTemplateId {
  return templateIdForOnboardingSource(source);
}

export type PartnerTemplateSor = {
  eligible_tiers: string[];
  max_exposure_per_signal: number;
  max_daily_exposure: number;
  max_single_bet: number;
  book_whitelist: string[];
  book_blacklist: string[];
  steam_allowed: boolean;
  arb_allowed: boolean;
  clv_allowed: boolean;
  manual_allowed: boolean;
  predictive_allowed: boolean;
  require_opsec_green: boolean;
  opsec_score_max: number;
};

export type PartnerTemplate = {
  template_id: PartnerTemplateId;
  name: string;
  description: string;
  version: string;
  sor: PartnerTemplateSor;
};

export type PartnerProfileBinding = {
  treeNodeId: TreeNodeId;
  templateId: PartnerTemplateId;
  profileKey: PartnerProfileKey;
  lifecycleStatus: PartnerLifecycleStatus;
  createdAt: string;
  updatedAt: string;
};

export type MaterializedPartnerProfile = {
  binding: PartnerProfileBinding;
  nodeName: string;
  nodeStatus: string;
  nodeType: string;
  platformAccountCount: number;
  activePlatformAccounts: number;
  provisioningPending: number;
};

export type StakeContext = {
  suggestedStake: number;
  bookSlug?: string; // brand-ok — sportsbook slug (DRAFTKINGS), not domain BookId
  signalType?: 'steam' | 'arb' | 'clv' | 'manual' | 'predictive';
  tier?: string;
};

/** Heuristic signal type from play market / selection text (I2 gate input). */
export function inferSignalTypeFromPlay(play: {
  market?: string;
  selection?: string;
  event?: string;
}): NonNullable<StakeContext['signalType']> {
  const hay = `${play.market ?? ''} ${play.selection ?? ''} ${play.event ?? ''}`.toLowerCase();
  if (/\barb\b|arbitrage/.test(hay)) return 'arb';
  if (/\bsteam\b|line.?move/.test(hay)) return 'steam';
  if (/\bclv\b|closing.?line/.test(hay)) return 'clv';
  if (/\bpredict|model|ml\b/.test(hay)) return 'predictive';
  return 'manual';
}

export type GateEvaluation = {
  allowed: boolean;
  action: 'allow' | 'block' | 'adjust' | 'defer';
  reason?: string;
  adjustedStake?: number;
  decisionId: GateDecisionId;
  templateId?: PartnerTemplateId;
};

const LIFECYCLE_GATE_ACTION = {
  signup: 'defer',
  materialized: 'allow',
  kyc_pending: 'allow',
  active: 'allow',
  cultivating: 'defer',
  graduated: 'allow',
  suspended: 'block',
  terminated: 'block',
} as const satisfies Record<PartnerLifecycleStatus, 'allow' | 'block' | 'defer'>;

const templateCache = new Map<string, PartnerTemplate>();

function defaultSor(): PartnerTemplateSor {
  return {
    eligible_tiers: ['T2', 'T3', 'T4'],
    max_exposure_per_signal: 2500,
    max_daily_exposure: 10000,
    max_single_bet: 2500,
    book_whitelist: [],
    book_blacklist: [],
    steam_allowed: true,
    arb_allowed: false,
    clv_allowed: true,
    manual_allowed: true,
    predictive_allowed: false,
    require_opsec_green: false,
    opsec_score_max: 50,
  };
}

function parseTemplate(raw: Record<string, unknown>, fallbackSlug: string): PartnerTemplate {
  const meta = (raw.meta as Record<string, unknown> | undefined) ?? {};
  const sorRaw = (raw.sor as Record<string, unknown> | undefined) ?? {};
  const sorDefaults = defaultSor();
  const templateId = String(meta.template_id ?? fallbackSlug);
  return {
    template_id: asPartnerTemplateId(templateId),
    name: String(meta.name ?? templateId),
    description: String(meta.description ?? ''),
    version: String(meta.version ?? '1.0.0'),
    sor: {
      eligible_tiers: Array.isArray(sorRaw.eligible_tiers)
        ? sorRaw.eligible_tiers.map(String)
        : sorDefaults.eligible_tiers,
      max_exposure_per_signal: Number(
        sorRaw.max_exposure_per_signal ?? sorDefaults.max_exposure_per_signal
      ),
      max_daily_exposure: Number(sorRaw.max_daily_exposure ?? sorDefaults.max_daily_exposure),
      max_single_bet: Number(sorRaw.max_single_bet ?? sorDefaults.max_single_bet),
      book_whitelist: Array.isArray(sorRaw.book_whitelist)
        ? sorRaw.book_whitelist.map(String)
        : sorDefaults.book_whitelist,
      book_blacklist: Array.isArray(sorRaw.book_blacklist)
        ? sorRaw.book_blacklist.map(String)
        : sorDefaults.book_blacklist,
      steam_allowed: sorRaw.steam_allowed !== false,
      arb_allowed: sorRaw.arb_allowed === true,
      clv_allowed: sorRaw.clv_allowed !== false,
      manual_allowed: sorRaw.manual_allowed !== false,
      predictive_allowed: sorRaw.predictive_allowed === true,
      require_opsec_green: sorRaw.require_opsec_green === true,
      opsec_score_max: Number(sorRaw.opsec_score_max ?? sorDefaults.opsec_score_max),
    },
  };
}

/** Load a partner template TOML from config/partner-templates (cached). */
export async function loadPartnerTemplate(
  templateId: string = DEFAULT_TEMPLATE_ID // brand-ok — slug resolved to PartnerTemplateId
): Promise<PartnerTemplate> {
  const cached = templateCache.get(templateId);
  if (cached) return cached;

  const path = `${PARTNER_TEMPLATES_DIR}/${templateId}.toml`;
  try {
    const file = Bun.file(path);
    if (await file.exists()) {
      const raw = Bun.TOML.parse(await file.text()) as Record<string, unknown>;
      const parsed = parseTemplate(raw, templateId);
      templateCache.set(templateId, parsed);
      return parsed;
    }
  } catch {
    /* fall through to default */
  }

  const fallback = parseTemplate({}, templateId);
  templateCache.set(templateId, fallback);
  return fallback;
}

/** Sync load for hot paths (reads TOML from disk when present). */
export function loadPartnerTemplateSync(
  templateId: string = DEFAULT_TEMPLATE_ID // brand-ok
): PartnerTemplate {
  const cached = templateCache.get(templateId);
  if (cached) return cached;

  const path = `${PARTNER_TEMPLATES_DIR}/${templateId}.toml`;
  try {
    const file = Bun.file(path);
    if (file.size > 0) {
      const text = new TextDecoder().decode(Bun.mmap(path));
      const raw = Bun.TOML.parse(text) as Record<string, unknown>;
      const parsed = parseTemplate(raw, templateId);
      templateCache.set(templateId, parsed);
      return parsed;
    }
  } catch {
    /* fall through to default */
  }

  const fallback = parseTemplate({}, templateId);
  templateCache.set(templateId, fallback);
  return fallback;
}

export function listPartnerTemplateIds(): string[] {
  try {
    const glob = new Bun.Glob('*.toml');
    return [...glob.scanSync({ cwd: PARTNER_TEMPLATES_DIR })].map(f => f.replace(/\.toml$/, ''));
  } catch {
    return [DEFAULT_TEMPLATE_ID];
  }
}

function profileKeyForNode(treeNodeId: TreeNodeId): PartnerProfileKey {
  return asPartnerProfileKey(`pp-${String(treeNodeId).slice(0, 32)}`);
}

type OpsecMetadata = {
  opsecScore?: number;
  riskLevel?: string;
};

function readOpsecMetadata(metadataJson: string | null | undefined): OpsecMetadata {
  if (!metadataJson) return {};
  try {
    const parsed = JSON.parse(metadataJson) as Record<string, unknown>;
    const opsecScore =
      typeof parsed.opsecScore === 'number'
        ? parsed.opsecScore
        : typeof parsed.opsec_score === 'number'
          ? parsed.opsec_score
          : undefined;
    const riskLevel =
      typeof parsed.riskLevel === 'string'
        ? parsed.riskLevel
        : typeof parsed.risk_level === 'string'
          ? parsed.risk_level
          : undefined;
    return { opsecScore, riskLevel };
  } catch {
    return {};
  }
}

export type BindPartnerProfileResult = PartnerProfileBinding & {
  /** True when a new row was inserted (not an update). */
  created: boolean;
};

/** Create or refresh partner_profile_bindings for a tree node. */
export function bindPartnerProfile(
  db: Database,
  treeNodeId: TreeNodeId,
  opts?: { templateId?: PartnerTemplateId; lifecycleStatus?: PartnerLifecycleStatus }
): BindPartnerProfileResult {
  const node = db
    .query('SELECT id, status FROM tree_nodes WHERE id = $id')
    .get({ $id: treeNodeId as string }) as { id: string; status: string } | null; // brand-ok
  if (!node) throw new Error(`Tree node not found: ${treeNodeId}`);

  const templateId = opts?.templateId ?? asPartnerTemplateId(DEFAULT_TEMPLATE_ID);
  const lifecycleStatus =
    opts?.lifecycleStatus ??
    (node.status === 'prospect'
      ? 'materialized'
      : node.status === 'partner'
        ? 'active'
        : 'materialized');
  const now = new Date().toISOString();
  const profileKey = profileKeyForNode(treeNodeId);

  const existing = db
    .query('SELECT created_at FROM partner_profile_bindings WHERE tree_node_id = $id')
    .get({ $id: treeNodeId as string }) as { created_at: string } | null;

  db.run(
    `INSERT INTO partner_profile_bindings
     (tree_node_id, template_id, profile_key, lifecycle_status, metadata_json, created_at, updated_at)
     VALUES ($nid, $tid, $pk, $ls, NULL, $created, $updated)
     ON CONFLICT(tree_node_id) DO UPDATE SET
       template_id = excluded.template_id,
       lifecycle_status = excluded.lifecycle_status,
       updated_at = excluded.updated_at`,
    {
      $nid: treeNodeId as string,
      $tid: templateId as string,
      $pk: profileKey as string,
      $ls: lifecycleStatus,
      $created: now,
      $updated: now,
    }
  );

  return {
    treeNodeId,
    templateId,
    profileKey,
    lifecycleStatus,
    createdAt: existing?.created_at ?? now,
    updatedAt: now,
    created: existing == null,
  };
}

/** Materialize profile view from tree + platform accounts + provisioning. */
export function materializePartnerProfile(
  db: Database,
  treeNodeId: TreeNodeId
): MaterializedPartnerProfile | null {
  const row = db
    .query(
      `SELECT b.tree_node_id, b.template_id, b.profile_key, b.lifecycle_status, b.created_at, b.updated_at,
              n.name, n.status AS node_status, n.type AS node_type
       FROM partner_profile_bindings b
       JOIN tree_nodes n ON n.id = b.tree_node_id
       WHERE b.tree_node_id = $id`
    )
    .get({ $id: treeNodeId as string }) as Record<string, unknown> | null;
  if (!row) return null;

  const accounts = db
    .query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active
       FROM partner_platform_accounts WHERE partner_id = $id`
    )
    .get({ $id: treeNodeId as string }) as { total: number; active: number };

  const provPending = db
    .query(
      `SELECT COUNT(*) AS n FROM provisioning_tasks
       WHERE partner_id = $id AND step IN ('pending', 'in_progress')`
    )
    .get({ $id: treeNodeId as string }) as { n: number };

  return {
    binding: {
      treeNodeId: asTreeNodeId(row.tree_node_id as string),
      templateId: asPartnerTemplateId(row.template_id as string),
      profileKey: asPartnerProfileKey(row.profile_key as string),
      lifecycleStatus: parsePartnerLifecycleStatus(row.lifecycle_status),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    },
    nodeName: row.name as string,
    nodeStatus: row.node_status as string,
    nodeType: row.node_type as string,
    platformAccountCount: accounts.total,
    activePlatformAccounts: accounts.active,
    provisioningPending: provPending.n,
  };
}

/** Root-owned policy gate adapter (subset of nested PartnerGateway). */
export function evaluateForNode(
  db: Database,
  treeNodeId: TreeNodeId,
  stakeContext: StakeContext
): GateEvaluation {
  const decisionId = asGateDecisionId(randomUUIDv7());
  const binding = db
    .query(
      `SELECT template_id, lifecycle_status, metadata_json FROM partner_profile_bindings WHERE tree_node_id = $id`
    )
    .get({ $id: treeNodeId as string }) as {
    template_id: string; // brand-ok — PartnerTemplateId from SQLite
    lifecycle_status: string;
    metadata_json: string | null;
  } | null;

  if (!binding) {
    return {
      allowed: false,
      action: 'block',
      reason: 'No partner profile binding',
      decisionId,
    };
  }

  const node = db
    .query('SELECT status, active FROM tree_nodes WHERE id = $id')
    .get({ $id: treeNodeId as string }) as { status: string; active: number } | null;
  if (!node || node.active !== 1) {
    return { allowed: false, action: 'block', reason: 'Node inactive', decisionId };
  }
  if (node.status === 'suspended') {
    return { allowed: false, action: 'block', reason: 'Node suspended', decisionId };
  }

  const lifecycle = parsePartnerLifecycleStatus(binding.lifecycle_status);
  const lifecycleAction = LIFECYCLE_GATE_ACTION[lifecycle];
  if (lifecycleAction === 'block') {
    return {
      allowed: false,
      action: 'block',
      reason: `Profile ${lifecycle}`,
      decisionId,
      templateId: asPartnerTemplateId(binding.template_id),
    };
  }
  if (lifecycleAction === 'defer') {
    return {
      allowed: false,
      action: 'defer',
      reason: `Profile lifecycle ${lifecycle}`,
      decisionId,
      templateId: asPartnerTemplateId(binding.template_id),
    };
  }

  const template = loadPartnerTemplateSync(binding.template_id);
  const sor = template.sor;
  const stake = stakeContext.suggestedStake;

  if (stake <= 0) {
    return { allowed: false, action: 'block', reason: 'Stake must be positive', decisionId };
  }

  const bookSlug = stakeContext.bookSlug?.toUpperCase();
  if (bookSlug && sor.book_blacklist.includes(bookSlug)) {
    return {
      allowed: false,
      action: 'block',
      reason: `Book ${bookSlug} blacklisted`,
      decisionId,
      templateId: template.template_id,
    };
  }
  if (bookSlug && sor.book_whitelist.length > 0 && !sor.book_whitelist.includes(bookSlug)) {
    return {
      allowed: false,
      action: 'block',
      reason: `Book ${bookSlug} not whitelisted`,
      decisionId,
      templateId: template.template_id,
    };
  }

  const signalType = stakeContext.signalType ?? 'manual';
  const typeAllowed: Record<string, boolean> = {
    steam: sor.steam_allowed,
    arb: sor.arb_allowed,
    clv: sor.clv_allowed,
    manual: sor.manual_allowed,
    predictive: sor.predictive_allowed,
  };
  if (!typeAllowed[signalType]) {
    return {
      allowed: false,
      action: 'block',
      reason: `Signal type ${signalType} not allowed`,
      decisionId,
      templateId: template.template_id,
    };
  }

  const opsec = readOpsecMetadata(binding.metadata_json);
  if (sor.require_opsec_green && opsec.riskLevel !== 'green') {
    return {
      allowed: false,
      action: 'block',
      reason:
        opsec.riskLevel != null
          ? `OpSec risk level ${opsec.riskLevel} (green required)`
          : 'OpSec risk level unavailable (green required)',
      decisionId,
      templateId: template.template_id,
    };
  }
  if (opsec.opsecScore != null && opsec.opsecScore > sor.opsec_score_max) {
    return {
      allowed: false,
      action: 'block',
      reason: `OpSec score ${opsec.opsecScore} exceeds max ${sor.opsec_score_max}`,
      decisionId,
      templateId: template.template_id,
    };
  }
  if (sor.require_opsec_green && opsec.opsecScore == null && opsec.riskLevel == null) {
    return {
      allowed: false,
      action: 'block',
      reason: 'OpSec metadata missing (require_opsec_green)',
      decisionId,
      templateId: template.template_id,
    };
  }

  const tier = stakeContext.tier ?? 'T3';
  if (sor.eligible_tiers.length > 0 && !sor.eligible_tiers.includes(tier)) {
    return {
      allowed: false,
      action: 'block',
      reason: `Tier ${tier} not eligible`,
      decisionId,
      templateId: template.template_id,
    };
  }

  let adjustedStake = stake;
  if (stake > sor.max_exposure_per_signal) adjustedStake = sor.max_exposure_per_signal;
  if (adjustedStake > sor.max_single_bet) adjustedStake = sor.max_single_bet;

  const action = adjustedStake < stake ? 'adjust' : 'allow';
  return {
    allowed: true,
    action,
    adjustedStake,
    reason: action === 'adjust' ? 'Stake capped by template limits' : undefined,
    decisionId,
    templateId: template.template_id,
  };
}

/** Persist gate decision on play_distribution fan-out. */
export function recordGateDecision(
  db: Database,
  playId: string, // brand-ok — plays.id
  treeNodeId: TreeNodeId,
  evaluation: GateEvaluation
): void {
  const now = new Date().toISOString();
  db.run(
    `INSERT OR REPLACE INTO play_gate_decisions
     (id, play_id, node_id, allowed, action, reason, adjusted_stake, decision_id, created_at)
     VALUES ($id, $pid, $nid, $allowed, $action, $reason, $adj, $did, $now)`,
    {
      $id: randomUUIDv7(),
      $pid: playId,
      $nid: treeNodeId as string,
      $allowed: evaluation.allowed ? 1 : 0,
      $action: evaluation.action,
      $reason: evaluation.reason ?? null,
      $adj: evaluation.adjustedStake ?? null,
      $did: evaluation.decisionId as string,
      $now: now,
    }
  );
}

export type PartnersSummarySlice = {
  bound: number;
  unboundAgents: number;
  byLifecycle: Partial<Record<PartnerLifecycleStatus, number>>;
  recent: Array<{
    treeNodeId: TreeNodeId;
    profileKey: string;
    partnerTemplate: PartnerTemplateId;
    lifecycleStatus: PartnerLifecycleStatus;
    name: string;
  }>;
};

/** Aggregate partners slice for ops-summary. */
export function queryPartnersSlice(db: Database): PartnersSummarySlice {
  const bound = db.query('SELECT COUNT(*) AS n FROM partner_profile_bindings').get() as {
    n: number;
  };

  const unboundAgents = db
    .query(
      `SELECT COUNT(*) AS n FROM tree_nodes n
       LEFT JOIN partner_profile_bindings b ON b.tree_node_id = n.id
       WHERE n.active = 1 AND b.tree_node_id IS NULL`
    )
    .get() as { n: number };

  const lifecycleRows = db
    .query(
      `SELECT lifecycle_status, COUNT(*) AS n FROM partner_profile_bindings GROUP BY lifecycle_status`
    )
    .all() as { lifecycle_status: string; n: number }[];

  const byLifecycle: Partial<Record<PartnerLifecycleStatus, number>> = {};
  for (const row of lifecycleRows) {
    byLifecycle[parsePartnerLifecycleStatus(row.lifecycle_status)] = row.n;
  }

  const recent = db
    .query(
      `SELECT b.tree_node_id, b.profile_key, b.template_id, b.lifecycle_status, n.name
       FROM partner_profile_bindings b
       JOIN tree_nodes n ON n.id = b.tree_node_id
       ORDER BY b.updated_at DESC LIMIT 10`
    )
    .all() as Array<{
    tree_node_id: string; // brand-ok — SQLite row before asTreeNodeId map
    profile_key: string;
    template_id: string; // brand-ok — PartnerTemplateId wire from SQLite
    lifecycle_status: string;
    name: string;
  }>;

  return {
    bound: bound.n,
    unboundAgents: unboundAgents.n,
    byLifecycle,
    recent: recent.map(r => ({
      treeNodeId: asTreeNodeId(r.tree_node_id),
      profileKey: r.profile_key,
      partnerTemplate: asPartnerTemplateId(r.template_id),
      lifecycleStatus: parsePartnerLifecycleStatus(r.lifecycle_status),
      name: r.name,
    })),
  };
}

/** Plan aliases — bindTemplate / materializeProfile / getPartnersSummary. */
export const bindTemplate = bindPartnerProfile;
export const materializeProfile = materializePartnerProfile;
export const getPartnersSummary = queryPartnersSlice;

/** Backfill bindings for active tree nodes missing a profile row. */
export function backfillPartnerBindings(
  db: Database,
  opts?: { templateId?: PartnerTemplateId; dryRun?: boolean }
): { scanned: number; bound: number; skipped: number } {
  const templateId = opts?.templateId ?? templateIdForSource();
  const rows = db
    .query(
      `SELECT n.id, n.type, n.status FROM tree_nodes n
       LEFT JOIN partner_profile_bindings b ON b.tree_node_id = n.id
       WHERE n.active = 1 AND b.tree_node_id IS NULL
         AND n.type IN ('partner', 'agent', 'sub_agent')`
    )
    .all() as Array<{ id: string; type: string; status: string }>; // brand-ok — opaque tree_nodes scan row

  let bound = 0;
  for (const row of rows) {
    if (opts?.dryRun) {
      bound += 1;
      continue;
    }
    const lifecycle: PartnerLifecycleStatus =
      row.status === 'partner' || row.status === 'active'
        ? 'active'
        : row.status === 'prospect'
          ? 'materialized'
          : 'materialized';
    bindPartnerProfile(db, asTreeNodeId(row.id), { templateId, lifecycleStatus: lifecycle });
    bound += 1;
  }
  return { scanned: rows.length, bound, skipped: 0 };
}
