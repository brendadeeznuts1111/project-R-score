// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * Bridge TOC identity treeNodeIds → partner_account_limits raises.
 *
 * Demo/limit-pattern seeds use `partner-42` / `limit-demo-*` slugs. The TOC board
 * join is exact (`limitChanges.node_id` ↔ partnerCode / callSign / identity
 * treeNodeId), so ASH/PAT badges stay dark unless raise rows use real UUIDs.
 *
 * This seed writes sportsbook limit history only (no TOC fixture limitHistory dual-write).
 *
 * @see lib/toc-ops/limit-raises-join.ts
 * @see docs/harness/tenants/partner-limits.md
 * @see docs/harness/tenants/toc-ops.md
 */
import type { Database } from 'bun:sqlite';
import { ensureAccountLimitsSchema, queryRecentLimitChanges } from '../account-limits-repo.ts';
import { TOC_OPS_REGISTRY_REL } from '../toc-ops/export-snapshot.ts';
import { PartnerAnalyticsRepository, type RaiseContextMetrics } from './partner-analytics-repo.ts';
import { ensureTocIdentitySchema } from './toc-identity-bridge.ts';

/** Default partner codes that must light board badges in demo. */
export const TOC_LIMIT_BRIDGE_DEFAULT_CODES = ['ASH', 'PAT'] as const;

export type TocBridgeAccountTarget = {
  callSign: string; // brand-ok — TOC call sign wire
  treeNodeId: string; // brand-ok — TreeNodeId wire
};

export type TocBridgePartnerTarget = {
  partnerCode: string; // brand-ok — TOC partner code
  treeNodeId: string; // brand-ok — TreeNodeId wire
  accounts: TocBridgeAccountTarget[];
};

export type TocBridgeIdentityInput = {
  partners?: readonly {
    partnerCode: string;
    treeNodeId?: string | null; // brand-ok — TreeNodeId wire
    accounts?: readonly {
      callSign: string;
      treeNodeId?: string | null; // brand-ok — TreeNodeId wire
    }[];
  }[];
};

export type SeedTocLimitBridgeOpts = {
  /** Partner codes to bridge (default ASH, PAT). */
  partnerCodes?: readonly string[];
  /** Max account nodes per partner to seed (default 2). */
  maxAccountsPerPartner?: number;
  /** Force re-seed only for resolved TOC node_ids (never wipes limit-demo-*). */
  force?: boolean;
  /** Capture multi-factor raise context for first raise per node (default true). */
  captureContext?: boolean;
  /** Unix seconds clock (tests). */
  nowSec?: number;
  /**
   * Identity source override (tests / explicit). When omitted, resolve from
   * baked registry then DB bindings / call_sign tree_nodes.
   */
  identity?: TocBridgeIdentityInput | null;
  /** Project root for registry load (default cwd). */
  root?: string;
  /** Skip filesystem registry load (tests / pure DB). */
  skipRegistry?: boolean;
};

export type SeedTocLimitBridgeNodeResult = {
  partnerCode: string;
  role: 'partner' | 'account';
  callSign?: string;
  nodeId: string; // brand-ok — TreeNodeId wire
  seeded: boolean;
  skipped: boolean;
  reason?: string;
  limitRows: number;
  raises: number;
  contextWritten: number;
};

export type SeedTocLimitBridgeResult = {
  targets: TocBridgePartnerTarget[];
  nodes: SeedTocLimitBridgeNodeResult[];
  limitRows: number;
  raises: number;
  contextWritten: number;
  source: 'identity-arg' | 'registry' | 'db-bindings' | 'tree-nodes' | 'none';
};

const BRIDGE_CONTEXT: RaiseContextMetrics = {
  active_players_7d: 42,
  new_players_7d: 6,
  total_handle_7d: 185_000,
  avg_clv_7d: 68,
  top_tier_player_count: 4,
  violation_count_30d: 0,
  chargeback_count_30d: 0,
  kyc_pass_rate: 0.97,
  market_volatility_index: 0.72,
  peak_betting_hours: JSON.stringify([18, 19, 20, 21]),
  sportsbook_share: 0.41,
  partner_profit_30d: 38_000,
  partner_roi_30d: 0.14,
};

function norm(raw: string): string {
  return raw.trim().toLowerCase();
}

function tocOpsRegistryPath(root = process.cwd()): string {
  return root.endsWith('/') ? `${root}${TOC_OPS_REGISTRY_REL}` : `${root}/${TOC_OPS_REGISTRY_REL}`;
}

/**
 * Load identity.partners from baked public/registry/toc-ops.json when present.
 */
export async function loadTocIdentityFromRegistry(
  root = process.cwd()
): Promise<TocBridgeIdentityInput | null> {
  const path = tocOpsRegistryPath(root);
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  try {
    const snap = (await file.json()) as {
      identity?: TocBridgeIdentityInput | null;
    };
    const partners = snap.identity?.partners;
    if (!partners?.length) return null;
    return { partners };
  } catch {
    return null;
  }
}

/**
 * Resolve partner + account treeNodeIds for bridge seed.
 * Preference: explicit identity → DB bindings → call_sign tree_nodes.
 */
export function resolveTocBridgeTargets(
  db: Database,
  opts?: {
    partnerCodes?: readonly string[];
    maxAccountsPerPartner?: number;
    identity?: TocBridgeIdentityInput | null;
  }
): { targets: TocBridgePartnerTarget[]; source: SeedTocLimitBridgeResult['source'] } {
  const codes = (opts?.partnerCodes ?? TOC_LIMIT_BRIDGE_DEFAULT_CODES)
    .map(c => c.trim())
    .filter(Boolean);
  const maxAccounts = Math.max(0, opts?.maxAccountsPerPartner ?? 2);
  const codeSet = new Set(codes.map(norm));

  const fromIdentity = targetsFromIdentity(opts?.identity ?? null, codeSet, maxAccounts);
  if (fromIdentity.length > 0) {
    return {
      targets: fromIdentity,
      source: opts?.identity ? 'identity-arg' : 'registry',
    };
  }

  ensureTocIdentitySchema(db);
  const fromBindings = targetsFromDbBindings(db, codeSet, maxAccounts);
  if (fromBindings.length > 0) {
    return { targets: fromBindings, source: 'db-bindings' };
  }

  const fromTree = targetsFromTreeNodes(db, codeSet, maxAccounts);
  if (fromTree.length > 0) {
    return { targets: fromTree, source: 'tree-nodes' };
  }

  return { targets: [], source: 'none' };
}

function targetsFromIdentity(
  identity: TocBridgeIdentityInput | null | undefined,
  codeSet: Set<string>,
  maxAccounts: number
): TocBridgePartnerTarget[] {
  const out: TocBridgePartnerTarget[] = [];
  for (const p of identity?.partners ?? []) {
    if (!codeSet.has(norm(p.partnerCode))) continue;
    const partnerNode = typeof p.treeNodeId === 'string' ? p.treeNodeId.trim() : '';
    if (!partnerNode) continue;
    const accounts: TocBridgeAccountTarget[] = [];
    for (const a of p.accounts ?? []) {
      if (accounts.length >= maxAccounts) break;
      const nid = typeof a.treeNodeId === 'string' ? a.treeNodeId.trim() : '';
      const cs = typeof a.callSign === 'string' ? a.callSign.trim() : '';
      if (!nid || !cs) continue;
      accounts.push({ callSign: cs, treeNodeId: nid });
    }
    out.push({
      partnerCode: p.partnerCode,
      treeNodeId: partnerNode,
      accounts,
    });
  }
  return out;
}

function targetsFromDbBindings(
  db: Database,
  codeSet: Set<string>,
  maxAccounts: number
): TocBridgePartnerTarget[] {
  const partnerRows = db
    .query(`SELECT partner_code, tree_node_id FROM toc_identity_bindings ORDER BY partner_code ASC`)
    .all() as Array<{
    partner_code: string;
    tree_node_id: string; // brand-ok — TreeNodeId wire
  }>;

  const out: TocBridgePartnerTarget[] = [];
  for (const row of partnerRows) {
    if (!codeSet.has(norm(row.partner_code))) continue;
    const accountRows = db
      .query(
        `SELECT call_sign, tree_node_id FROM toc_call_sign_bindings
         WHERE partner_code = $pc
         ORDER BY call_sign ASC
         LIMIT $lim`
      )
      .all({ $pc: row.partner_code, $lim: maxAccounts }) as Array<{
      call_sign: string;
      tree_node_id: string; // brand-ok — TreeNodeId wire
    }>;

    out.push({
      partnerCode: row.partner_code,
      treeNodeId: row.tree_node_id,
      accounts: accountRows.map(a => ({
        callSign: a.call_sign,
        treeNodeId: a.tree_node_id,
      })),
    });
  }
  return out;
}

function targetsFromTreeNodes(
  db: Database,
  codeSet: Set<string>,
  maxAccounts: number
): TocBridgePartnerTarget[] {
  const out: TocBridgePartnerTarget[] = [];
  for (const code of codeSet) {
    const partner = db
      .query(
        `SELECT id, call_sign FROM tree_nodes
         WHERE active = 1 AND type = 'partner'
           AND lower(trim(call_sign)) = $cs
         LIMIT 1`
      )
      .get({ $cs: code }) as {
      id: string; // brand-ok — TreeNodeId wire
      call_sign: string;
    } | null;
    if (!partner) continue;

    const upper = partner.call_sign || code.toUpperCase();
    const accounts = db
      .query(
        `SELECT id, call_sign FROM tree_nodes
         WHERE active = 1 AND call_sign IS NOT NULL
           AND (call_sign LIKE $pref OR parent_id = $pid)
           AND id != $pid
         ORDER BY call_sign ASC
         LIMIT $lim`
      )
      .all({
        $pref: `${upper}-%`,
        $pid: partner.id,
        $lim: maxAccounts,
      }) as Array<{
      id: string; // brand-ok — TreeNodeId wire
      call_sign: string;
    }>;

    out.push({
      partnerCode: upper,
      treeNodeId: partner.id,
      accounts: accounts
        .filter(a => a.call_sign)
        .map(a => ({ callSign: a.call_sign, treeNodeId: a.id })),
    });
  }
  return out;
}

function clearNodeLimitRows(
  db: Database,
  nodeId: string // brand-ok — TreeNodeId wire
): void {
  // Scoped wipe: only this node_id (never global limit-demo purge).
  db.run(
    `DELETE FROM limit_raise_context
     WHERE node_id = $nid OR limit_record_id IN (
       SELECT id FROM partner_account_limits WHERE node_id = $nid
     )`,
    { $nid: nodeId }
  );
  db.run(`DELETE FROM market_line_movement WHERE node_id = $nid`, { $nid: nodeId });
  db.run(`DELETE FROM partner_account_limits WHERE node_id = $nid`, { $nid: nodeId });
  db.run(`DELETE FROM account_alerts WHERE node_id = $nid`, { $nid: nodeId });
}

function nodeLimitCount(
  db: Database,
  nodeId: string // brand-ok — TreeNodeId wire
): number {
  const row = db
    .query(`SELECT COUNT(*) AS n FROM partner_account_limits WHERE node_id = $nid`)
    .get({ $nid: nodeId }) as { n: number };
  return row?.n ?? 0;
}

/**
 * Insert prev → raise snapshots for one tree node (within 48h window).
 * Partner nodes get 2 series; account nodes get 1.
 */
function seedNodeRaises(
  db: Database,
  nodeId: string, // brand-ok — TreeNodeId wire
  role: 'partner' | 'account',
  now: number,
  captureContext: boolean
): { limitRows: number; raises: number; contextWritten: number } {
  const offset = role === 'partner' ? 0 : 400;
  const series: Array<{
    sportsbook: string;
    sport: string;
    market: string;
    betType: 'straight' | 'pregame' | 'live';
    prev: number;
    next: number;
    t0: number;
    t1: number;
  }> = [
    {
      sportsbook: 'draftkings',
      sport: 'nba',
      market: 'totals',
      betType: 'straight',
      prev: 500,
      next: 1_500,
      t0: now - 6 * 3600 + offset,
      t1: now - 90 * 60 + offset,
    },
    // hardrock — matches seat intake books ("Hard Rock Florida") for maxBet compare
    {
      sportsbook: 'hardrock',
      sport: 'nba',
      market: 'spread',
      betType: 'straight',
      prev: 400,
      next: 1_000,
      t0: now - 5 * 3600 + offset,
      t1: now - 70 * 60 + offset,
    },
  ];
  if (role === 'partner') {
    series.push({
      sportsbook: 'fanduel',
      sport: 'nba',
      market: 'spread',
      betType: 'straight',
      prev: 800,
      next: 1_200,
      t0: now - 4 * 3600 + offset,
      t1: now - 45 * 60 + offset,
    });
  }

  let limitRows = 0;
  for (const s of series) {
    db.run(
      `INSERT INTO partner_account_limits
         (node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at, effective_from)
       VALUES ($nid, $book, $sport, $market, $type, $max, $at, $at)`,
      {
        $nid: nodeId,
        $book: s.sportsbook,
        $sport: s.sport,
        $market: s.market,
        $type: s.betType,
        $max: s.prev,
        $at: s.t0,
      }
    );
    limitRows++;
    db.run(
      `INSERT INTO partner_account_limits
         (node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at, effective_from)
       VALUES ($nid, $book, $sport, $market, $type, $max, $at, $at)`,
      {
        $nid: nodeId,
        $book: s.sportsbook,
        $sport: s.sport,
        $market: s.market,
        $type: s.betType,
        $max: s.next,
        $at: s.t1,
      }
    );
    limitRows++;
  }

  const analytics = new PartnerAnalyticsRepository(db, nodeId);
  const raises = analytics.detectRaises(now - 48 * 3600);
  let contextWritten = 0;
  if (captureContext && raises.length > 0) {
    const first = raises[0]!;
    if (!analytics.getRaiseContext(first.limit_id)) {
      analytics.recordRaiseContext(first.limit_id, BRIDGE_CONTEXT, first.increased_at + 1);
      contextWritten = 1;
    }
  }

  return { limitRows, raises: raises.length, contextWritten };
}

function applySeed(
  db: Database,
  opts: {
    partnerCodes?: readonly string[];
    maxAccountsPerPartner?: number;
    force?: boolean;
    captureContext?: boolean;
    nowSec?: number;
    identity?: TocBridgeIdentityInput | null;
    /** Override source label when identity came from registry load. */
    sourceOverride?: SeedTocLimitBridgeResult['source'];
  }
): SeedTocLimitBridgeResult {
  ensureAccountLimitsSchema(db);
  const force = opts.force ?? false;
  const captureContext = opts.captureContext !== false;
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);

  const { targets, source: resolvedSource } = resolveTocBridgeTargets(db, {
    partnerCodes: opts.partnerCodes,
    maxAccountsPerPartner: opts.maxAccountsPerPartner,
    identity: opts.identity,
  });

  const source = opts.sourceOverride && targets.length > 0 ? opts.sourceOverride : resolvedSource;

  const nodes: SeedTocLimitBridgeNodeResult[] = [];
  let limitRows = 0;
  let raises = 0;
  let contextWritten = 0;

  for (const target of targets) {
    const work: Array<{
      partnerCode: string;
      role: 'partner' | 'account';
      callSign?: string;
      nodeId: string; // brand-ok — TreeNodeId wire
    }> = [
      {
        partnerCode: target.partnerCode,
        role: 'partner',
        nodeId: target.treeNodeId,
      },
    ];
    for (const acc of target.accounts) {
      work.push({
        partnerCode: target.partnerCode,
        role: 'account',
        callSign: acc.callSign,
        nodeId: acc.treeNodeId,
      });
    }

    for (const item of work) {
      const existing = nodeLimitCount(db, item.nodeId);
      if (existing > 0 && !force) {
        const recent = queryRecentLimitChanges(db, 48).filter(r => r.node_id === item.nodeId);
        nodes.push({
          partnerCode: item.partnerCode,
          role: item.role,
          callSign: item.callSign,
          nodeId: item.nodeId,
          seeded: false,
          skipped: true,
          reason: 'limits already present (pass (force) to re-seed this node)',
          limitRows: existing,
          raises: recent.filter(r => r.direction === 'up').length,
          contextWritten: 0,
        });
        continue;
      }

      if (force && existing > 0) {
        clearNodeLimitRows(db, item.nodeId);
      }

      const written = seedNodeRaises(db, item.nodeId, item.role, now, captureContext);
      limitRows += written.limitRows;
      raises += written.raises;
      contextWritten += written.contextWritten;
      nodes.push({
        partnerCode: item.partnerCode,
        role: item.role,
        callSign: item.callSign,
        nodeId: item.nodeId,
        seeded: true,
        skipped: false,
        limitRows: written.limitRows,
        raises: written.raises,
        contextWritten: written.contextWritten,
      });
    }
  }

  return {
    targets,
    nodes,
    limitRows,
    raises,
    contextWritten,
    source,
  };
}

/**
 * Seed recent partner_account_limits raises on TOC identity treeNodeIds
 * so ops-summary.limitChanges joins to ASH/PAT board badges.
 *
 * Loads identity from baked toc-ops.json when not passed and registry exists.
 */
export async function seedTocLimitBridge(
  db: Database,
  opts?: SeedTocLimitBridgeOpts
): Promise<SeedTocLimitBridgeResult> {
  let identity = opts?.identity ?? null;
  let sourceOverride: SeedTocLimitBridgeResult['source'] | undefined;

  if (opts?.identity) {
    sourceOverride = 'identity-arg';
  } else if (!opts?.skipRegistry) {
    identity = await loadTocIdentityFromRegistry(opts?.root);
    if (identity) sourceOverride = 'registry';
  }

  return applySeed(db, {
    partnerCodes: opts?.partnerCodes,
    maxAccountsPerPartner: opts?.maxAccountsPerPartner,
    force: opts?.force,
    captureContext: opts?.captureContext,
    nowSec: opts?.nowSec,
    identity,
    sourceOverride,
  });
}

/**
 * Sync seed for tests that supply identity (no registry I/O).
 */
export function seedTocLimitBridgeSync(
  db: Database,
  opts: SeedTocLimitBridgeOpts & { identity: TocBridgeIdentityInput }
): SeedTocLimitBridgeResult {
  return applySeed(db, {
    partnerCodes: opts.partnerCodes,
    maxAccountsPerPartner: opts.maxAccountsPerPartner,
    force: opts.force,
    captureContext: opts.captureContext,
    nowSec: opts.nowSec,
    identity: opts.identity,
    sourceOverride: 'identity-arg',
  });
}
