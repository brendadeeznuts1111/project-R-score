// @see https://bun.com/docs/runtime/sqlite
/**
 * Pure ops command handlers — shared by OpsTelegramBot and factory webhook bridge.
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import { DODVerifier } from '../dod/verifier.ts';
import { asTreeNodeId } from '../types/branded/operations.ts';
import { asTelegramUserId, type TelegramUserId } from '../types/branded/portal.ts';
import { onboardPartnerProfile } from '../operations/partner-onboarding.ts';
import {
  applyPartnerComplianceOnboard,
  splitComplianceKvTokens,
} from '../operations/partner-compliance-onboard.ts';
import { enqueuePartnerWelcomeEvent } from '../channels/outbox.ts';
import { flowOutputToPlainText } from './flows/deliver.ts';
import { commandToFlowId, runFlow } from './flows/registry.ts';
import { linkTelegramChat, getChatChannelMeta } from './flows/channel-meta.ts';
import {
  handleOpsSeatCommand,
  resolveFlowNodeForTelegram,
  setActiveCallSignForTelegram,
} from './flows/seat-telegram.ts';
import type { FlowOutput } from './flows/types.ts';
import { gateFactoryCommand } from './ops-acl.ts';
import { AccountLimitsRepository } from '../account-limits-repo.ts';
import { PartnerAnalyticsRepository } from '../operations/partner-analytics-repo.ts';

export type OpsTreeNode = {
  id: string; // brand-ok
  type: 'partner' | 'agent' | 'sub_agent';
  parent_id: string | null; // brand-ok
  expert_id: string | null; // brand-ok
  name: string;
  telegram_id: string; // brand-ok
};

export type OpsCommandInput = {
  telegramUserId: string; // brand-ok
  command: string;
  args: string[];
  /** Telegram chat.type when known (private | group | supergroup | channel). */
  chatType?: string | null;
};

export function findNodeByTelegram(
  db: Database,
  telegramUserId: TelegramUserId,
  callSignHint?: string | null
): OpsTreeNode | null {
  return resolveFlowNodeForTelegram(db, telegramUserId as string, { callSignHint });
}

export function handleOpsStart(db: Database, node: OpsTreeNode | null): string {
  if (!node) {
    const experts = db
      .query('SELECT name, sport, market FROM experts WHERE active = 1 LIMIT 5')
      .all() as { name: string; sport: string; market: string }[];
    const list = experts.length
      ? experts.map(e => `• ${e.name} (${e.sport} ${e.market})`).join('\n')
      : 'No experts available.';
    return [
      '👋 *Operations Platform*',
      '',
      'Link portal account: complete onboarding then `/start link_<nonce>`',
      'Or register: `/register <referral-id> <your-name>`',
      '',
      '*Available experts:*',
      list,
    ].join('\n');
  }
  return [
    `👋 ${node.name}`,
    node.call_sign ? `Seat: \`${node.call_sign}\`` : '',
    '',
    `Type: *${node.type.toUpperCase()}*`,
    '',
    '/status — Your status',
    '/accounts — Sportsbook accounts',
    "/plays — Today's plays",
    '/tree — Your down-tree',
    '/seat — Switch linked seat (shared DM)',
    '/verifydod <id> — DOD delivery receipt',
  ]
    .filter(Boolean)
    .join('\n');
}

export function handleOpsRegister(
  db: Database,
  telegramUserId: TelegramUserId,
  args: string[]
): string {
  const existing = findNodeByTelegram(db, telegramUserId);
  if (existing) return '✅ Already registered.';

  const [refId, ...rest] = args;
  const { plain: nameParts, compliance } = splitComplianceKvTokens(rest);
  if (!refId || !nameParts.length) {
    return 'Usage: `/register <referral-id> <your-name> [state=MA|NJ age=N zip=##### loc=City idv=yes]`';
  }

  const name = nameParts.join(' ');
  const parent = db
    .query('SELECT * FROM tree_nodes WHERE id = $r AND active = 1')
    .get({ $r: refId }) as OpsTreeNode | null;
  if (!parent) return '❌ Invalid referral ID.';

  const newId = randomUUIDv7();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, active, status, created_at)
     VALUES ($id, 'sub_agent', $pid, $eid, $name, $tg, 1, 'active', $now)`,
    {
      $id: newId,
      $pid: parent.id,
      $eid: parent.expert_id,
      $name: name,
      $tg: telegramUserId as string,
      $now: now,
    }
  );

  const treeNodeId = asTreeNodeId(newId);
  linkTelegramChat(db, {
    treeNodeId,
    callSign: null,
    chatId: telegramUserId as string,
    bindTreeNode: false,
    topics: { identity: 1, plays: 1 },
  });

  const binding = onboardPartnerProfile(db, treeNodeId, {
    referralNodeId: parent.id,
    source: 'telegram',
  });
  if (binding.created) {
    enqueuePartnerWelcomeEvent(db, {
      treeNodeId: binding.treeNodeId,
      profileKey: binding.profileKey as string,
      partnerTemplate: binding.templateId,
      lifecycleStatus: binding.lifecycleStatus,
      telegramId: telegramUserId,
      nodeName: name,
    });
  }

  const lines = [`✅ Registered as sub-agent of *${parent.name}*`, `Your ID: \`${newId}\``];
  if (compliance) {
    const reg = applyPartnerComplianceOnboard(db, treeNodeId, compliance);
    if (reg.applied) {
      lines.push(
        `Compliance: *${reg.stateCode}* license+geo` +
          (reg.identityVerified ? ' · identity verified' : '')
      );
    } else if (reg.skippedReason) {
      lines.push(`Compliance skipped: ${reg.skippedReason}`);
    }
  }
  return lines.join('\n');
}

export function handleOpsVerifyDod(
  db: Database,
  dbPath: string,
  node: OpsTreeNode | null,
  args: string[]
): string {
  if (!node) return '❌ Not registered';
  const dodId = args[0]?.trim();
  if (!dodId) return 'Usage: `/verifydod <dod-id>`';
  const verifier = new DODVerifier(dbPath);
  try {
    const r = verifier.receipt(dodId) as Record<string, unknown> | null;
    if (!r || r.agent_id !== node.id) return '❌ DOD not found';
    return [
      '📄 *DOD Receipt*',
      `ID: \`${String(r.id).slice(0, 8)}…\``,
      `Type: ${r.type}`,
      `Status: *${r.status}*`,
      `Submitted: ${r.submitted_at}`,
      r.visual_hash ? `Visual hash: \`${String(r.visual_hash).slice(0, 16)}…\`` : '',
      r.signature ? `Signature: \`${String(r.signature).slice(0, 16)}…\`` : '',
    ]
      .filter(Boolean)
      .join('\n');
  } finally {
    verifier.close();
  }
}

/** `/limits` — show recent limit increases for the partner. */
export function handleOpsLimits(db: Database, node: OpsTreeNode | null): string {
  if (!node) return '❌ Not registered';
  const repo = new AccountLimitsRepository(db);
  const since = Math.floor(Date.now() / 1000) - 48 * 3600;
  const raises = repo.detectRaises(node.id, since);
  const decreases = repo.detectDecreases(node.id, since);
  if (raises.length === 0 && decreases.length === 0) {
    return [
      '📋 No recent limit changes in the last 48h.',
      '',
      'Use `/limits` again to re-check or `bun run ops:limits:demo` to seed test data.',
      'Portal: /portal/limits/ · /portal/partner-history/',
    ].join('\n');
  }
  const lines: string[] = ['📊 *Limit Changes* (48h)'];
  if (raises.length > 0) {
    lines.push('', '🚀 *Raises*');
    for (const r of raises.slice(0, 5)) {
      const pct =
        r.previous_max > 0
          ? ` (${(((r.new_limit - r.previous_max) / r.previous_max) * 100).toFixed(0)}%)`
          : '';
      lines.push(
        `• ${r.sportsbook} ${r.sport_id}/${r.market_id}: $${r.previous_max} → *$${r.new_limit}*${pct}`
      );
    }
    // Multi-factor score for first raise when context is available (keep short for Telegram)
    try {
      const analytics = new PartnerAnalyticsRepository(db, node.id);
      const enriched = analytics.getEnrichedRaisesWithContext(since);
      const first = raises[0];
      const match = enriched.find(
        e =>
          e.sportsbook === first.sportsbook &&
          e.sport_id === first.sport_id &&
          e.market_id === first.market_id &&
          e.bet_type === first.bet_type
      );
      if (match?.multi_factor_score != null && Number.isFinite(match.multi_factor_score)) {
        const pctScore = Math.round(match.multi_factor_score * 100);
        const drivers = (match.top_contributing_factors ?? []).slice(0, 3).join(', ');
        lines.push(`🧮 Multi-factor: *${pctScore}%*` + (drivers ? ` · ${drivers}` : ''));
      }
    } catch {
      // analytics optional — omit score line if context unavailable
    }
  }
  if (decreases.length > 0) {
    lines.push('', '⬇️ *Decreases*');
    for (const r of decreases.slice(0, 3)) {
      const pct =
        r.previous_max > 0
          ? ` (${(((r.new_limit - r.previous_max) / r.previous_max) * 100).toFixed(0)}%)`
          : '';
      lines.push(
        `• ${r.sportsbook} ${r.sport_id}/${r.market_id}: $${r.previous_max} → *$${r.new_limit}*${pct}`
      );
    }
  }
  const total = raises.length + decreases.length;
  lines.push('', `Total: ${total} change(s) · 🚀${raises.length} ⬇️${decreases.length}`);
  lines.push(
    '',
    'Use `/limits` again to refresh.',
    'Portal: /portal/limits/ · history: /portal/partner-history/'
  );
  return lines.join('\n');
}
export function dispatchOpsFlowOutput(
  db: Database,
  dbPath: string,
  input: OpsCommandInput
): FlowOutput | null {
  const flowId = commandToFlowId(input.command);
  if (!flowId || input.command === '/register' || input.command === '/verifydod') return null;
  const meta = getChatChannelMeta(db, input.telegramUserId);
  const node = findNodeByTelegram(db, asTelegramUserId(input.telegramUserId));
  return runFlow(db, dbPath, {
    flowId: input.command === '/start' && !node ? 'menu' : flowId,
    chatId: input.telegramUserId,
    userId: input.telegramUserId,
    callSign: meta?.activeCallSign ?? node?.call_sign ?? null,
  });
}

export function dispatchOpsCommand(db: Database, dbPath: string, input: OpsCommandInput): string {
  const gate = gateFactoryCommand({
    command: input.command,
    chatType: input.chatType,
    telegramUserId: input.telegramUserId,
  });
  if (!gate.ok) return gate.reason;

  const output = dispatchOpsFlowOutput(db, dbPath, input);
  if (output) return flowOutputToPlainText(output);

  const telegramUserId = asTelegramUserId(input.telegramUserId);
  const node = findNodeByTelegram(db, telegramUserId);

  switch (input.command) {
    case '/start':
      return handleOpsStart(db, node);
    case '/seat':
      return handleOpsSeatCommand(db, input.telegramUserId, input.args);
    case '/register':
      return handleOpsRegister(db, telegramUserId, input.args);
    case '/verifydod':
      return handleOpsVerifyDod(db, dbPath, node, input.args);
    case '/limits':
      return handleOpsLimits(db, node);
    default:
      return 'Unknown command. Try /help';
  }
}
