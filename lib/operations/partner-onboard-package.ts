// @see https://bun.com/docs/runtime/sqlite
/**
 * Partner onboard package — plan/apply CLI backing (call-sign resolve, dry-run, idempotency).
 */
import type { Database } from 'bun:sqlite';
import { enqueueOnboardCompleteEvent, enqueuePartnerWelcomeEvent } from '../channels/outbox.ts';
import { getPhoneForSeat, mergeProfileMessageMetadata } from '../telegram/templates/context.ts';
import { linkTelegramChat } from '../telegram/flows/channel-meta.ts';
import { DEFAULT_MESSAGE_TEMPLATES } from '../telegram/templates/registry.ts';
import { loadTelegramEnv, telegramTransportReady } from '../telegram/telegram-config.ts';
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
import {
  assignOnboardingDefaults,
  onboardPartnerProfile,
  type AssignOnboardingOpts,
  type AssignOnboardingResult,
} from './partner-onboarding.ts';
import type { PartnerProfileBinding } from './partner-profile-bridge.ts';

export const CALL_SIGN_PATTERN = /^[A-Z]{2,4}-\d{3}$/;

export type UnboundAgentSeat = {
  treeNodeId: TreeNodeId;
  callSign: string | null;
  name: string;
  parentId: string | null; // brand-ok — tree_nodes.parent_id wire
};

export type OnboardNodeContext = {
  treeNodeId: TreeNodeId;
  callSign: string | null;
  name: string;
  telegramId: string | null; // brand-ok
  expertId: string | null; // brand-ok
  parentId: string | null; // brand-ok
  parentName: string | null;
  expertLabel: string | null;
  existingTemplateId: PartnerTemplateId | null;
  pendingWelcomeCount: number;
};

export type PartnerOnboardPlan = {
  treeNodeId: TreeNodeId;
  callSign: string | null;
  name: string;
  parentName: string | null;
  expertLabel: string | null;
  phoneLabel: string | null;
  phoneWarning: string | null;
  wouldAssign: AssignOnboardingResult;
  wouldBind: { templateId: PartnerTemplateId };
  messageTemplates: typeof DEFAULT_MESSAGE_TEMPLATES;
  wouldEnqueueWelcome: boolean;
  wouldEnqueueOnboardComplete: boolean;
  welcomeSkipReason: string | null;
  alreadyOnboarded: boolean;
  skipReason: string | null;
};

export type PartnerOnboardApplyResult = {
  status: 'ok' | 'skip' | 'dry-run';
  plan: PartnerOnboardPlan;
  binding?: PartnerProfileBinding;
  outboxEventId?: string; // brand-ok — opaque ops_channel_outbox id
  onboardCompleteEventId?: string; // brand-ok
};

export type PartnerOnboardPackageOpts = AssignOnboardingOpts & {
  force?: boolean;
  dryRun?: boolean;
};

/** Resolve call sign or UUID to a tree node id. */
export function resolveOnboardTreeNodeId(db: Database, ref: string): TreeNodeId {
  const trimmed = ref.trim();
  if (!trimmed) throw new Error('Empty tree node reference');

  if (CALL_SIGN_PATTERN.test(trimmed)) {
    const row = db
      .query('SELECT id FROM tree_nodes WHERE call_sign = $cs AND active = 1 LIMIT 1')
      .get({ $cs: trimmed }) as { id: string } | null; // brand-ok
    if (!row) throw new Error(`Unknown call sign: ${trimmed}`);
    return asTreeNodeId(row.id);
  }

  const byId = db
    .query('SELECT id FROM tree_nodes WHERE id = $id AND active = 1 LIMIT 1')
    .get({ $id: trimmed }) as { id: string } | null; // brand-ok
  if (!byId) throw new Error(`Tree node not found: ${trimmed}`);
  return asTreeNodeId(byId.id);
}

/** Agent seats missing partner_profile_bindings. */
export function listUnboundAgentSeats(db: Database): UnboundAgentSeat[] {
  const rows = db
    .query(
      `SELECT n.id, n.call_sign, n.name, n.parent_id
       FROM tree_nodes n
       LEFT JOIN partner_profile_bindings b ON b.tree_node_id = n.id
       WHERE n.active = 1 AND n.type = 'agent' AND b.tree_node_id IS NULL
       ORDER BY n.call_sign ASC, n.name ASC`
    )
    .all() as Array<{
    id: string; // brand-ok
    call_sign: string | null;
    name: string;
    parent_id: string | null; // brand-ok
  }>;

  return rows.map(r => ({
    treeNodeId: asTreeNodeId(r.id),
    callSign: r.call_sign,
    name: r.name,
    parentId: r.parent_id,
  }));
}

/** Load display + idempotency context for a node. */
export function loadOnboardNodeContext(db: Database, treeNodeId: TreeNodeId): OnboardNodeContext {
  const node = db
    .query(
      `SELECT n.id, n.call_sign, n.name, n.telegram_id, n.expert_id, n.parent_id,
              p.name AS parent_name,
              e.sport AS expert_sport, e.name AS expert_name
       FROM tree_nodes n
       LEFT JOIN tree_nodes p ON p.id = n.parent_id
       LEFT JOIN experts e ON e.id = n.expert_id
       WHERE n.id = $id`
    )
    .get({ $id: treeNodeId as string }) as {
    id: string; // brand-ok
    call_sign: string | null;
    name: string;
    telegram_id: string | null; // brand-ok
    expert_id: string | null; // brand-ok
    parent_id: string | null; // brand-ok
    parent_name: string | null;
    expert_sport: string | null;
    expert_name: string | null;
  } | null;
  if (!node) throw new Error(`Tree node not found: ${treeNodeId}`);

  const binding = db
    .query('SELECT template_id FROM partner_profile_bindings WHERE tree_node_id = $id')
    .get({ $id: treeNodeId as string }) as { template_id: string } | null; // brand-ok

  const welcome = db
    .query(
      `SELECT COUNT(*) AS n FROM ops_channel_outbox
       WHERE event_type = 'partner.welcome' AND status = 'pending'
         AND payload_json LIKE $needle`
    )
    .get({ $needle: `%${treeNodeId as string}%` }) as { n: number };

  const expertLabel = node.expert_sport?.trim() || node.expert_name?.trim() || null;

  return {
    treeNodeId,
    callSign: node.call_sign,
    name: node.name,
    telegramId: node.telegram_id,
    expertId: node.expert_id,
    parentId: node.parent_id,
    parentName: node.parent_name,
    expertLabel,
    existingTemplateId: binding ? asPartnerTemplateId(binding.template_id) : null,
    pendingWelcomeCount: welcome.n,
  };
}

/** Read-only preview of assign defaults (no writes). */
export function peekAssignOnboardingDefaults(
  db: Database,
  treeNodeId: TreeNodeId,
  opts?: AssignOnboardingOpts
): AssignOnboardingResult {
  const cfg = loadOnboardingDefaultsSync();
  const node = db
    .query('SELECT id, expert_id, parent_id, cut_percentage FROM tree_nodes WHERE id = $id')
    .get({ $id: treeNodeId as string }) as {
    id: string; // brand-ok
    expert_id: string | null; // brand-ok
    parent_id: string | null; // brand-ok
    cut_percentage: number;
  } | null;
  if (!node) throw new Error(`Tree node not found: ${treeNodeId}`);

  let expertId = node.expert_id ?? resolveDefaultExpertId(db, opts?.preferredExpertId);
  let parentId = node.parent_id;
  let cutPercentage = node.cut_percentage ?? 0;

  const referral = opts?.referralNodeId?.trim();
  if (referral) {
    const parent = db
      .query('SELECT id, expert_id FROM tree_nodes WHERE id = $r AND active = 1')
      .get({ $r: referral }) as { id: string; expert_id: string | null } | null; // brand-ok
    if (parent) {
      parentId = parent.id;
      if (!node.expert_id && parent.expert_id) expertId = parent.expert_id;
      cutPercentage = cfg.defaultCutPercentage;
    }
  } else if (!parentId && cfg.defaultParentId) {
    const hq = db
      .query('SELECT id FROM tree_nodes WHERE id = $id AND active = 1')
      .get({ $id: cfg.defaultParentId }) as { id: string } | null; // brand-ok
    if (hq) parentId = hq.id;
  }

  const templateId = opts?.templateId ?? templateIdForOnboardingSource(opts?.source);

  return { expertId, parentId, cutPercentage, templateId };
}

function resolveExpertLabel(db: Database, expertId: string | null): string | null {
  // brand-ok — experts.id wire
  if (!expertId) return null;
  const row = db.query('SELECT sport, name FROM experts WHERE id = $id').get({ $id: expertId }) as {
    sport: string;
    name: string;
  } | null;
  if (!row) return null;
  return row.sport?.trim() || row.name?.trim() || null;
}

function resolveParentName(db: Database, parentId: string | null): string | null {
  // brand-ok — tree_nodes.parent_id wire
  if (!parentId) return null;
  const row = db.query('SELECT name FROM tree_nodes WHERE id = $id').get({ $id: parentId }) as {
    name: string;
  } | null;
  return row?.name ?? null;
}

function telegramLinked(telegramId: string | null): boolean {
  // brand-ok — tree_nodes.telegram_id wire
  return Boolean(telegramId && !telegramId.startsWith('pending-'));
}

/** Build read-only onboard plan. */
export function planPartnerOnboardPackage(
  db: Database,
  treeNodeId: TreeNodeId,
  opts?: PartnerOnboardPackageOpts
): PartnerOnboardPlan {
  const ctx = loadOnboardNodeContext(db, treeNodeId);
  const wouldAssign = peekAssignOnboardingDefaults(db, treeNodeId, opts);
  const wouldBind = { templateId: wouldAssign.templateId };

  const expertLabel = ctx.expertLabel ?? resolveExpertLabel(db, wouldAssign.expertId) ?? 'NBA';
  const parentName = ctx.parentName ?? resolveParentName(db, wouldAssign.parentId) ?? '—';

  const linked = telegramLinked(ctx.telegramId);
  let welcomeSkipReason: string | null = null;
  if (!linked) welcomeSkipReason = 'no linked telegram id';
  const wouldEnqueueWelcome = linked;
  const wouldEnqueueOnboardComplete = linked;

  const phone = getPhoneForSeat(db, { treeNodeId, callSign: ctx.callSign });
  const phoneLabel = phone?.displayName ?? null;
  const phoneWarning = phone
    ? null
    : 'no phone asset on seat (welcome still allowed; attach via phones.assigned_to / tree_nodes.phone_id)';

  const expertMatches =
    ctx.expertId != null && wouldAssign.expertId != null && ctx.expertId === wouldAssign.expertId;
  const templateMatches =
    ctx.existingTemplateId != null && ctx.existingTemplateId === wouldAssign.templateId;

  const alreadyOnboarded =
    !opts?.force &&
    ctx.existingTemplateId != null &&
    templateMatches &&
    ctx.expertId != null &&
    expertMatches;

  const skipReason = alreadyOnboarded
    ? `already onboarded template=${wouldAssign.templateId} expert=${expertLabel} parent=${parentName}`
    : null;

  return {
    treeNodeId,
    callSign: ctx.callSign,
    name: ctx.name,
    parentName,
    expertLabel,
    phoneLabel,
    phoneWarning,
    wouldAssign,
    wouldBind,
    messageTemplates: { ...DEFAULT_MESSAGE_TEMPLATES },
    wouldEnqueueWelcome,
    wouldEnqueueOnboardComplete,
    welcomeSkipReason,
    alreadyOnboarded,
    skipReason,
  };
}

/** Persist welcome/balances/status template ids + phone label on profile metadata. */
export function attachProfileMessageTemplates(
  db: Database,
  treeNodeId: TreeNodeId,
  opts?: { phoneLabel?: string | null }
): void {
  const row = db
    .query('SELECT metadata_json FROM partner_profile_bindings WHERE tree_node_id = $id')
    .get({ $id: treeNodeId as string }) as { metadata_json: string | null } | null;
  if (!row) return;

  const phone = opts?.phoneLabel ?? getPhoneForSeat(db, { treeNodeId })?.displayName ?? null;

  const merged = mergeProfileMessageMetadata(row.metadata_json, {
    ...DEFAULT_MESSAGE_TEMPLATES,
    ...(phone ? { phoneLabel: phone } : {}),
  });

  db.run(
    `UPDATE partner_profile_bindings SET metadata_json = $meta, updated_at = $now WHERE tree_node_id = $id`,
    { $meta: merged, $now: new Date().toISOString(), $id: treeNodeId as string }
  );
}

/** Apply onboard package (respects dryRun + idempotency). */
export function applyPartnerOnboardPackage(
  db: Database,
  plan: PartnerOnboardPlan,
  opts?: PartnerOnboardPackageOpts
): PartnerOnboardApplyResult {
  if (opts?.dryRun) {
    return { status: 'dry-run', plan };
  }

  if (plan.alreadyOnboarded) {
    return { status: 'skip', plan };
  }

  const assigned = assignOnboardingDefaults(db, plan.treeNodeId, opts);
  const binding = onboardPartnerProfile(db, plan.treeNodeId, opts);
  attachProfileMessageTemplates(db, plan.treeNodeId, { phoneLabel: plan.phoneLabel });

  const node = db
    .query('SELECT name, telegram_id, call_sign FROM tree_nodes WHERE id = $id')
    .get({ $id: plan.treeNodeId as string }) as {
    name: string;
    telegram_id: string | null; // brand-ok
    call_sign: string | null;
  };

  if (telegramLinked(node.telegram_id)) {
    linkTelegramChat(db, {
      treeNodeId: binding.treeNodeId,
      callSign: node.call_sign ?? plan.callSign,
      chatId: node.telegram_id!,
      locale: plan.messageTemplates.locale,
      topics: { identity: 1, plays: 1, toc: 1 },
      bindTreeNode: false,
    });
  }

  let outboxEventId: string | undefined; // brand-ok — opaque outbox row id
  let onboardCompleteEventId: string | undefined; // brand-ok
  const shouldWelcome = plan.wouldEnqueueWelcome && (!plan.alreadyOnboarded || opts?.force);
  if (shouldWelcome) {
    const evt = enqueuePartnerWelcomeEvent(db, {
      treeNodeId: binding.treeNodeId,
      profileKey: binding.profileKey as string,
      partnerTemplate: binding.templateId,
      lifecycleStatus: binding.lifecycleStatus,
      telegramId: node.telegram_id ?? undefined,
      nodeName: node.name,
      templateId: plan.messageTemplates.welcomeTemplate,
    });
    if (evt) outboxEventId = evt.id as string;
  }

  const shouldComplete =
    plan.wouldEnqueueOnboardComplete && (!plan.alreadyOnboarded || opts?.force);
  if (shouldComplete) {
    const complete = enqueueOnboardCompleteEvent(db, {
      treeNodeId: binding.treeNodeId,
      profileKey: binding.profileKey as string,
      partnerTemplate: binding.templateId,
      telegramId: node.telegram_id ?? undefined,
    });
    if (complete) onboardCompleteEventId = complete.id as string;
  }

  return {
    status: 'ok',
    plan: {
      ...plan,
      wouldAssign: assigned,
      wouldBind: { templateId: binding.templateId },
    },
    binding,
    outboxEventId,
    onboardCompleteEventId,
  };
}

export function displayRef(plan: PartnerOnboardPlan): string {
  return plan.callSign ?? (plan.treeNodeId as string);
}

export function formatOnboardStatusLine(result: PartnerOnboardApplyResult): string {
  const ref = displayRef(result.plan);
  const template = result.plan.wouldBind.templateId as string;
  const expert = result.plan.expertLabel ?? '—';
  const parent = result.plan.parentName ?? '—';

  if (result.status === 'skip') {
    return `SKIP ${ref} ${result.plan.skipReason ?? 'already onboarded'}`;
  }
  if (result.status === 'dry-run') {
    return `PLAN ${ref} (dry-run — no writes)`;
  }

  const outbox = result.outboxEventId ? `outbox=${result.outboxEventId}` : 'outbox=—';
  return `OK ${ref} template=${template} expert=${expert} parent=${parent} ${outbox}`;
}

export function formatOnboardPlanLines(plan: PartnerOnboardPlan): string[] {
  const ref = displayRef(plan);
  const lines = [
    `PLAN ${ref}`,
    `  would assign expert=${plan.expertLabel ?? '—'} parent=${plan.parentName ?? '—'} cut=${plan.wouldAssign.cutPercentage}`,
    `  would bind template=${plan.wouldBind.templateId as string}`,
    `  message templates welcome=${plan.messageTemplates.welcomeTemplate} balances=${plan.messageTemplates.balancesTemplate} status=${plan.messageTemplates.statusTemplate}`,
    `  phone=${plan.phoneLabel ?? '—'}`,
  ];
  if (plan.phoneWarning) lines.push(`  warn: ${plan.phoneWarning}`);
  if (plan.wouldEnqueueWelcome) {
    lines.push('  would enqueue partner.welcome (HTML template)');
  } else {
    lines.push(
      `  would enqueue partner.welcome (telegram: ${plan.welcomeSkipReason ?? 'skipped'})`
    );
  }
  if (plan.wouldEnqueueOnboardComplete) {
    lines.push('  would enqueue partner.onboard.complete');
  }
  lines.push(`  already bound? ${plan.alreadyOnboarded ? 'yes' : 'no'}`);
  return lines;
}

export type OnboardChecklist = {
  botTokenPresent: boolean;
  telegramLinked: boolean;
  pendingWelcomeCount: number;
  consumeReady: boolean;
};

export function buildOnboardChecklist(
  db: Database,
  treeNodeId: TreeNodeId
): { lines: string[]; checklist: OnboardChecklist } {
  const ctx = loadOnboardNodeContext(db, treeNodeId);
  const tgEnv = loadTelegramEnv();
  const transport = telegramTransportReady(tgEnv);
  const linked = telegramLinked(ctx.telegramId);

  const checklist: OnboardChecklist = {
    botTokenPresent: transport.ready,
    telegramLinked: linked,
    pendingWelcomeCount: ctx.pendingWelcomeCount,
    consumeReady: transport.ready && linked,
  };

  const phone = getPhoneForSeat(db, { treeNodeId, callSign: ctx.callSign });
  const lines = [
    'Checklist (cellphone → first DM):',
    `  [${phone ? 'x' : ' '}] Phone asset on seat (optional warn if missing)`,
    `  [${ctx.existingTemplateId ? 'x' : ' '}] Profile bound (${ctx.existingTemplateId ?? '—'})`,
    `  [${transport.ready ? 'x' : ' '}] TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN`,
    `  [${linked ? 'x' : ' '}] Telegram linked for ${ctx.callSign ?? ctx.name}`,
    `  [ ] Welcome outbox pending: ${ctx.pendingWelcomeCount}`,
  ];
  if (!transport.ready && transport.missing.length) {
    lines.push(`  → missing: ${transport.missing.join(', ')} (bun run telegram:verify)`);
  }
  if (!linked) {
    lines.push(
      `  → bun tools/telegram-link-chat.ts ${ctx.callSign ?? (treeNodeId as string)} tg:chat:<id>`
    );
  }
  if (checklist.consumeReady) {
    lines.push('  → bun run telegram:ops:consume');
  } else {
    lines.push('  → consume blocked until token + linked telegram id (bun run telegram:verify)');
  }
  lines.push(
    '  → TOC capital path: FUND → LIMIT → WARM×2 → WARMED (docs/harness/tenants/toc-ops.md)'
  );

  return { lines, checklist };
}
