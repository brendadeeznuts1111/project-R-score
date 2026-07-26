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
import { enqueuePartnerWelcomeEvent } from '../channels/outbox.ts';
import { flowOutputToPlainText } from './flows/deliver.ts';
import { commandToFlowId, runFlow } from './flows/registry.ts';
import { linkTelegramChat } from './flows/channel-meta.ts';
import type { FlowOutput } from './flows/types.ts';
import { gateFactoryCommand } from './ops-acl.ts';

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
  telegramUserId: TelegramUserId
): OpsTreeNode | null {
  return db
    .query('SELECT * FROM tree_nodes WHERE telegram_id = $t AND active = 1')
    .get({ $t: telegramUserId as string }) as OpsTreeNode | null;
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
    '',
    `Type: *${node.type.toUpperCase()}*`,
    '',
    '/status — Your status',
    '/accounts — Sportsbook accounts',
    "/plays — Today's plays",
    '/tree — Your down-tree',
    '/verifydod <id> — DOD delivery receipt',
  ].join('\n');
}

export function handleOpsRegister(
  db: Database,
  telegramUserId: TelegramUserId,
  args: string[]
): string {
  const existing = findNodeByTelegram(db, telegramUserId);
  if (existing) return '✅ Already registered.';

  const [refId, ...nameParts] = args;
  if (!refId || !nameParts.length) return 'Usage: `/register <referral-id> <your-name>`';

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

  return [`✅ Registered as sub-agent of *${parent.name}*`, `Your ID: \`${newId}\``].join('\n');
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

export function dispatchOpsFlowOutput(
  db: Database,
  dbPath: string,
  input: OpsCommandInput
): FlowOutput | null {
  const flowId = commandToFlowId(input.command);
  if (!flowId || input.command === '/register' || input.command === '/verifydod') return null;
  const node = findNodeByTelegram(db, asTelegramUserId(input.telegramUserId));
  return runFlow(db, dbPath, {
    flowId: input.command === '/start' && !node ? 'menu' : flowId,
    chatId: input.telegramUserId,
    userId: input.telegramUserId,
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
    case '/register':
      return handleOpsRegister(db, telegramUserId, input.args);
    case '/verifydod':
      return handleOpsVerifyDod(db, dbPath, node, input.args);
    default:
      return 'Unknown command. Try /help';
  }
}
