// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Seed a coherent account-dossier demo on real TOC identity nodes (ASH tree).
 *
 * Fills the gaps the dossier board needs: fresh raises inside the lookback window,
 * NJ geo/license (so monitoring leaves `incomplete`), partner-tree connectivity in
 * the pattern bake, and call_sign for partners-ops outs join.
 *
 * Prefer a dedicated test DB via tools/seed-account-dossier.ts --db=…
 *
 * @see docs/harness/tenants/partner-limits.md
 * @see public/portal/account/
 */
import type { Database } from 'bun:sqlite';
import { ensureAccountLimitsSchema } from '../account-limits-repo.ts';
import { applyPartnerComplianceOnboard } from './partner-compliance-onboard.ts';
import { bindPartnerProfile } from './partner-profile-bridge.ts';
import { seedLimitPatternDemo } from './limit-patterns.ts';
import { exportLimitRaisesSnapshot } from './partner-analytics-repo.ts';
import { seedTocLimitBridge, type SeedTocLimitBridgeResult } from './toc-limit-bridge-seed.ts';
import { asTreeNodeId } from '../types/branded.ts';

export const DOSSIER_DEMO_PARTNER_CODES = ['ASH'] as const;

export type SeedAccountDossierOpts = {
  /** Partner codes to enrich (default ASH). */
  partnerCodes?: readonly string[];
  /**
   * Force re-seed limit rows + rewrite demo identity labels.
   * Default false (matches seedTocLimitBridge). CLI scripts pass --force.
   */
  force?: boolean;
  /** Also refresh limit-demo-* pattern fixtures. */
  includeLimitDemo?: boolean;
  /** Bake public/registry/limit-raises.json (default true when bakePath set). */
  bake?: boolean;
  /** Lookback hours for bake (default 168 — matches dossier window). */
  lookbackHours?: number;
  /** Optional bake output path. */
  bakePath?: string;
  /** Project root for bake. */
  root?: string;
  nowSec?: number;
};

export type SeedAccountDossierResult = {
  toc: SeedTocLimitBridgeResult;
  compliance: Array<{
    nodeId: string; // brand-ok — TreeNodeId wire
    callSign?: string;
    applied: boolean;
    stateCode?: string;
    skippedReason?: string;
  }>;
  limitDemo: ReturnType<typeof seedLimitPatternDemo> | null;
  baked: {
    path: string;
    partners: number;
    raises: number;
    lookbackHours: number;
    nodes: string[];
  } | null;
};

const NJ_DESKS: Record<string, { location: string; zip: string; age: number }> = {
  partner: { location: 'Newark', zip: '07102', age: 34 },
  account: { location: 'Jersey City', zip: '07302', age: 28 },
};

/** Stable Cascade/ASH UUID used by TOC board + account dossier demos. */
export const DOSSIER_ASH_PARTNER_ID = '019f92bf-40d6-72e3-aa09-f0a9b8a95824';
export const DOSSIER_ASH_ACCOUNTS = [
  { id: '019f92ee-5ef8-71e9-b207-5ae20c07d095', callSign: 'ASH-001', name: 'TOC ASH-001' },
  { id: '019f92ee-5ef9-728d-950c-6c02a59903a2', callSign: 'ASH-002', name: 'TOC ASH-002' },
] as const;

export type EnsureDossierDemoTreeOpts = {
  /** When true, rewrite agent parent/call_sign/name to demo fixtures. */
  force?: boolean;
  nowIso?: string;
};

/**
 * Ensure ASH partner + downline agents exist (idempotent). Used so a fresh
 * test DB can seed without a prior ops:seed:toc run.
 *
 * Default is insert-only / fill blanks. Pass `force` to repair demo identity
 * (overwrites agent labels that TOC operators may have edited).
 */
export function ensureDossierDemoTree(db: Database, opts?: EnsureDossierDemoTreeOpts): void {
  ensureAccountLimitsSchema(db);
  const force = opts?.force ?? false;
  const nowIso = opts?.nowIso ?? new Date().toISOString();
  const hasTree = db
    .query(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tree_nodes' LIMIT 1`)
    .get() as { name: string } | null;
  if (!hasTree) return;

  db.run(
    `INSERT OR IGNORE INTO tree_nodes
       (id, type, parent_id, expert_id, name, call_sign, telegram_id, rail_preference, active, created_at)
     VALUES ($id, 'partner', NULL, NULL, 'Cascade Partner', 'ASH', NULL, 'paypal', 1, $now)`,
    { $id: DOSSIER_ASH_PARTNER_ID, $now: nowIso }
  );
  // Soft fill only: blank call_sign / name, never clobber an existing label.
  db.run(
    `UPDATE tree_nodes
     SET call_sign = COALESCE(NULLIF(trim(call_sign), ''), 'ASH'),
         name = COALESCE(NULLIF(trim(name), ''), 'Cascade Partner'),
         type = 'partner',
         active = 1
     WHERE id = $id`,
    { $id: DOSSIER_ASH_PARTNER_ID }
  );
  if (force) {
    db.run(
      `UPDATE tree_nodes
       SET call_sign = 'ASH', name = 'Cascade Partner', type = 'partner', active = 1
       WHERE id = $id`,
      { $id: DOSSIER_ASH_PARTNER_ID }
    );
  }

  for (const acc of DOSSIER_ASH_ACCOUNTS) {
    db.run(
      `INSERT OR IGNORE INTO tree_nodes
         (id, type, parent_id, expert_id, name, call_sign, telegram_id, rail_preference, active, created_at)
       VALUES ($id, 'agent', $pid, NULL, $name, $cs, NULL, NULL, 1, $now)`,
      {
        $id: acc.id,
        $pid: DOSSIER_ASH_PARTNER_ID,
        $name: acc.name,
        $cs: acc.callSign,
        $now: nowIso,
      }
    );
    db.run(
      `UPDATE tree_nodes
       SET parent_id = COALESCE(parent_id, $pid),
           call_sign = COALESCE(NULLIF(trim(call_sign), ''), $cs),
           name = COALESCE(NULLIF(trim(name), ''), $name),
           type = COALESCE(NULLIF(trim(type), ''), 'agent'),
           active = 1
       WHERE id = $id`,
      {
        $id: acc.id,
        $pid: DOSSIER_ASH_PARTNER_ID,
        $name: acc.name,
        $cs: acc.callSign,
      }
    );
    if (force) {
      db.run(
        `UPDATE tree_nodes
         SET parent_id = $pid, call_sign = $cs, name = $name, type = 'agent', active = 1
         WHERE id = $id`,
        {
          $id: acc.id,
          $pid: DOSSIER_ASH_PARTNER_ID,
          $name: acc.name,
          $cs: acc.callSign,
        }
      );
    }
  }
}

/**
 * Enrich TOC bridge targets with geo/license/profile so the dossier is complete.
 */
export async function seedAccountDossierDemo(
  db: Database,
  opts?: SeedAccountDossierOpts
): Promise<SeedAccountDossierResult> {
  ensureAccountLimitsSchema(db);
  const force = opts?.force ?? false;
  ensureDossierDemoTree(db, { force });
  const partnerCodes = opts?.partnerCodes ?? DOSSIER_DEMO_PARTNER_CODES;
  const nowSec = opts?.nowSec ?? Math.floor(Date.now() / 1000);
  const lookbackHours = opts?.lookbackHours ?? 168;

  const toc = await seedTocLimitBridge(db, {
    partnerCodes,
    maxAccountsPerPartner: 4,
    force,
    captureContext: true,
    nowSec,
  });

  const compliance: SeedAccountDossierResult['compliance'] = [];
  for (const node of toc.nodes) {
    if (node.skipped && !force) {
      compliance.push({
        nodeId: node.nodeId,
        callSign: node.callSign,
        applied: false,
        skippedReason: node.reason,
      });
      continue;
    }
    const desk = NJ_DESKS[node.role] ?? NJ_DESKS.account!;
    const result = applyPartnerComplianceOnboard(db, asTreeNodeId(node.nodeId), {
      stateCode: 'NJ',
      location: desk.location,
      zipCode: desk.zip,
      age: desk.age,
      licenseNumber: `DOSSIER-NJ-${node.partnerCode}-${(node.callSign || node.role).slice(0, 12)}`,
      licenseStatus: 'active',
      identityVerified: true,
    });
    bindPartnerProfile(db, asTreeNodeId(node.nodeId), {
      lifecycleStatus: node.role === 'partner' ? 'active' : 'materialized',
    });
    // Capture context for every raise in window (bridge only writes first).
    const { PartnerAnalyticsRepository } = await import('./partner-analytics-repo.ts');
    const analytics = new PartnerAnalyticsRepository(db, node.nodeId);
    const raises = analytics.detectRaises(nowSec - lookbackHours * 3600);
    for (const raise of raises) {
      if (!analytics.getRaiseContext(raise.limit_id)) {
        analytics.recordRaiseContext(
          raise.limit_id,
          {
            active_players_7d: 48,
            new_players_7d: 7,
            total_handle_7d: 210_000,
            avg_clv_7d: 71,
            top_tier_player_count: 5,
            violation_count_30d: 0,
            chargeback_count_30d: 0,
            kyc_pass_rate: 0.98,
            market_volatility_index: 0.66,
            peak_betting_hours: JSON.stringify([18, 19, 20, 21]),
            sportsbook_share: 0.44,
            partner_profit_30d: 52_000,
            partner_roi_30d: 0.16,
          },
          raise.increased_at + 1
        );
      }
    }
    compliance.push({
      nodeId: node.nodeId,
      callSign: node.callSign,
      applied: result.applied,
      stateCode: result.stateCode,
      skippedReason: result.skippedReason,
    });
  }

  const limitDemo =
    opts?.includeLimitDemo === true
      ? seedLimitPatternDemo(db, { force: Boolean(opts.force), nowSec })
      : null;

  let baked: SeedAccountDossierResult['baked'] = null;
  if (opts?.bake !== false) {
    const root = opts?.root ?? process.cwd();
    const path = opts?.bakePath ?? `${root.replace(/\/$/, '')}/public/registry/limit-raises.json`;
    const snap = await exportLimitRaisesSnapshot(db, {
      root,
      lookbackHours,
      outPath: path,
      capture: true,
    });
    baked = {
      path,
      partners: snap.partners,
      raises: snap.raises,
      lookbackHours,
      nodes: Object.keys(snap.byNode),
    };
  }

  return { toc, compliance, limitDemo, baked };
}
