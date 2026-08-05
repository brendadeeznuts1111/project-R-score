// @see https://bun.com/docs/runtime/sqlite
/**
 * Partner onboarding — assign expert, parent, cut, and template from config + event.
 */
import type { Database } from 'bun:sqlite';
import type { PartnerLifecycleStatus } from '../partner-profile/schema.ts';
import {
  asPartnerTemplateId,
  asTreeNodeId,
  type PartnerTemplateId,
  type TreeNodeId,
} from '../types/branded/operations.ts';
import {
  loadOnboardingDefaultsSync,
  resolveDefaultExpertId,
  templateIdForOnboardingSource,
} from './onboarding-config.ts';
import { bindPartnerProfile } from './partner-profile-bridge.ts';
import { AccountLimitsRepository } from '../account-limits-repo.ts';

export type AssignOnboardingOpts = {
  referralNodeId?: string; // brand-ok — TreeNodeId wire from ops-sync
  source?: string;
  preferredExpertId?: string; // brand-ok — ExpertId wire
  templateId?: PartnerTemplateId;
  /** Record initial limit baselines after onboarding (sportsbook → max_wager). */
  initialLimits?: Array<{
    sportsbook: string;
    sportId: string; // brand-ok — SportId wire
    marketId: string; // brand-ok — MarketId wire
    betType: 'pregame' | 'live' | 'straight';
    maxWager: number;
  }>;
};

export type AssignOnboardingResult = {
  expertId: string | null; // brand-ok
  parentId: string | null; // brand-ok
  cutPercentage: number;
  templateId: PartnerTemplateId;
};

/** Apply tree defaults after portal or Telegram onboarding. */
export function assignOnboardingDefaults(
  db: Database,
  treeNodeId: TreeNodeId,
  opts?: AssignOnboardingOpts
): AssignOnboardingResult {
  const cfg = loadOnboardingDefaultsSync();
  const node = db
    .query('SELECT id, expert_id, parent_id, cut_percentage FROM tree_nodes WHERE id = $id')
    .get({ $id: treeNodeId as string }) as {
    id: string; // brand-ok
    expert_id: string | null; // brand-ok — opaque experts.id wire
    parent_id: string | null; // brand-ok — opaque tree_nodes.id wire
    cut_percentage: number;
  } | null;
  if (!node) throw new Error(`Tree node not found: ${treeNodeId}`);

  let expertId = node.expert_id;
  if (!expertId) {
    expertId = resolveDefaultExpertId(db, opts?.preferredExpertId);
    if (expertId) {
      db.run('UPDATE tree_nodes SET expert_id = $eid WHERE id = $id', {
        $eid: expertId,
        $id: treeNodeId as string,
      });
    }
  }

  let parentId = node.parent_id;
  let cutPercentage = node.cut_percentage ?? 0;

  const referral = opts?.referralNodeId?.trim();
  if (referral) {
    const parent = db
      .query('SELECT id, expert_id FROM tree_nodes WHERE id = $r AND active = 1')
      .get({ $r: referral }) as { id: string; expert_id: string | null } | null; // brand-ok
    if (parent) {
      parentId = parent.id;
      if (!expertId && parent.expert_id) {
        expertId = parent.expert_id;
        db.run('UPDATE tree_nodes SET expert_id = $eid WHERE id = $id', {
          $eid: expertId,
          $id: treeNodeId as string,
        });
      }
      cutPercentage = cfg.defaultCutPercentage;
      db.run('UPDATE tree_nodes SET parent_id = $pid, cut_percentage = $cut WHERE id = $id', {
        $pid: parentId,
        $cut: cutPercentage,
        $id: treeNodeId as string,
      });
    }
  } else if (!parentId && cfg.defaultParentId) {
    const hq = db
      .query('SELECT id FROM tree_nodes WHERE id = $id AND active = 1')
      .get({ $id: cfg.defaultParentId }) as { id: string } | null; // brand-ok
    if (hq) {
      parentId = hq.id;
      db.run('UPDATE tree_nodes SET parent_id = $pid WHERE id = $id', {
        $pid: parentId,
        $id: treeNodeId as string,
      });
    }
  }

  const templateId = opts?.templateId ?? templateIdForOnboardingSource(opts?.source);

  return {
    expertId,
    parentId,
    cutPercentage,
    templateId,
  };
}

/** Bind profile after onboarding defaults (uses resolved template). */
export function onboardPartnerProfile(
  db: Database,
  treeNodeId: TreeNodeId,
  opts?: AssignOnboardingOpts & {
    lifecycleStatus?: PartnerLifecycleStatus;
  }
) {
  const assigned = assignOnboardingDefaults(db, treeNodeId, opts);
  const bound = bindPartnerProfile(db, treeNodeId, {
    templateId: assigned.templateId,
    lifecycleStatus: opts?.lifecycleStatus,
  });

  // Record initial limit baselines when provided
  if (opts?.initialLimits && opts.initialLimits.length > 0) {
    const repo = new AccountLimitsRepository(db);
    for (const l of opts.initialLimits) {
      repo.recordLimit({
        node_id: treeNodeId as string,
        sportsbook: l.sportsbook,
        sport_id: l.sportId,
        market_id: l.marketId,
        bet_type: l.betType,
        max_wager: l.maxWager,
      });
    }
  }

  return bound;
}
