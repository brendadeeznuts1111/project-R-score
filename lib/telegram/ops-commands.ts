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
import { deliverFlowOutput, flowOutputToPlainText } from './flows/deliver.ts';
import { commandToFlowId, runFlow } from './flows/registry.ts';

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

export function handleOpsStatus(db: Database, node: OpsTreeNode | null): string {
  if (!node) return '❌ Not registered';
  const accts = db
    .query('SELECT COUNT(*) as c FROM sb_accounts WHERE agent_id = $a')
    .get({ $a: node.id }) as { c: number };
  const placed = db
    .query(
      "SELECT COUNT(*) as c FROM play_distribution WHERE node_id = $n AND ack_status = 'placed'"
    )
    .get({ $n: node.id }) as { c: number };
  const pnl = db
    .query(
      `SELECT COALESCE(SUM(p.pnl), 0) as total
       FROM plays p JOIN play_distribution d ON p.id = d.play_id
       WHERE d.node_id = $n AND p.result IN ('win', 'loss')`
    )
    .get({ $n: node.id }) as { total: number };
  return [
    '📊 *Status*',
    `Accounts: ${accts.c}`,
    `Placed: ${placed.c}`,
    `P&L: $${pnl.total.toFixed(2)}`,
  ].join('\n');
}

export function handleOpsAccounts(db: Database, node: OpsTreeNode | null): string {
  if (!node) return '❌ Not registered';
  const accounts = db
    .query(
      'SELECT book, username, balance, status FROM sb_accounts WHERE agent_id = $a ORDER BY book'
    )
    .all({ $a: node.id }) as { book: string; username: string; balance: number; status: string }[];
  if (!accounts.length) return '📋 No accounts. Contact your referrer to get funded.';
  const rows = accounts.map(
    a => `${a.book}: **${a.username || '—'}** — $${a.balance.toFixed(0)} (${a.status})`
  );
  return ['📋 *Your Accounts*', '', ...rows].join('\n');
}

export function handleOpsPlays(db: Database, node: OpsTreeNode | null): string {
  if (!node) return '❌ Not registered';
  const plays = db
    .query(
      `SELECT p.sport, p.market, p.event, p.selection, p.odds, p.confidence, p.sent_at, d.ack_status
       FROM plays p JOIN play_distribution d ON p.id = d.play_id
       WHERE d.node_id = $n AND p.result = 'pending'
       ORDER BY p.sent_at DESC LIMIT 5`
    )
    .all({ $n: node.id }) as {
    sport: string;
    market: string;
    event: string;
    selection: string;
    odds: number;
    confidence: number;
    sent_at: string;
    ack_status: string;
  }[];
  if (!plays.length) return '📋 No pending plays.';
  const rows = plays.flatMap(p => [
    `🎯 *${p.sport} ${p.market}* (${p.ack_status})`,
    `${p.event}: ${p.selection} @ ${p.odds > 0 ? '+' : ''}${p.odds}`,
    `   Confidence: ${p.confidence}% · ${p.sent_at.slice(11, 16)}`,
    '',
  ]);
  return ['📋 *Pending Plays*', '', ...rows].join('\n');
}

export function handleOpsTree(db: Database, node: OpsTreeNode | null): string {
  if (!node || node.type === 'sub_agent')
    return '❌ Tree view available for partners and agents only.';
  const children = db
    .query(
      'SELECT type, COUNT(*) as c FROM tree_nodes WHERE parent_id = $p AND active = 1 GROUP BY type'
    )
    .all({ $p: node.id }) as { type: string; c: number }[];
  const downstream = db
    .query(
      `WITH RECURSIVE down_tree AS (
         SELECT id FROM tree_nodes WHERE parent_id = $p AND active = 1
         UNION ALL
         SELECT n.id FROM tree_nodes n JOIN down_tree t ON n.parent_id = t.id
       )
       SELECT COALESCE(SUM(a.balance), 0) as total
       FROM sb_accounts a JOIN down_tree d ON a.agent_id = d.id
       WHERE a.status = 'active'`
    )
    .get({ $p: node.id }) as { total: number };
  const rows = children.map(r => `${r.type}: ${r.c}`);
  return [
    '🌳 *Your Tree*',
    '',
    ...rows,
    '',
    `Downstream liquidity: $${downstream.total.toLocaleString()}`,
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

  const binding = onboardPartnerProfile(db, asTreeNodeId(newId), {
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
    ].join('\n');
  } finally {
    verifier.close();
  }
}

export function dispatchOpsCommand(db: Database, dbPath: string, input: OpsCommandInput): string {
  const telegramUserId = asTelegramUserId(input.telegramUserId);
  const node = findNodeByTelegram(db, telegramUserId);

  const flowId = commandToFlowId(input.command);
  if (flowId && input.command !== '/register' && input.command !== '/verifydod') {
    const output = runFlow(db, dbPath, {
      flowId: input.command === '/start' && !node ? 'menu' : flowId,
      chatId: input.telegramUserId,
      userId: input.telegramUserId,
    });
    return flowOutputToPlainText(output);
  }

  switch (input.command) {
    case '/start':
      return handleOpsStart(db, node);
    case '/status':
      return handleOpsStatus(db, node);
    case '/accounts':
      return handleOpsAccounts(db, node);
    case '/plays':
      return handleOpsPlays(db, node);
    case '/tree':
      return handleOpsTree(db, node);
    case '/register':
      return handleOpsRegister(db, telegramUserId, input.args);
    case '/verifydod':
      return handleOpsVerifyDod(db, dbPath, node, input.args);
    default:
      return 'Unknown command. Try /help';
  }
}
