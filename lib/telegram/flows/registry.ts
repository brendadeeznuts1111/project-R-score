// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Flow registry — flowId → handler.
 */
import { accountsFlow } from './cards/accounts.ts';
import { balancesFlow } from './cards/balances.ts';
import { menuFlow } from './cards/menu.ts';
import { playsFlow } from './cards/plays.ts';
import { statusFlow } from './cards/status.ts';
import { treeFlow } from './cards/tree.ts';
import { welcomeFlow } from './cards/welcome.ts';
import { resolveLocale } from './i18n.ts';
import type {
  FlowHandler,
  FlowId,
  FlowInput,
  FlowOutput,
  FlowContext,
  OpsFlowNode,
} from './types.ts';
import { asTreeNodeId } from '../../types/branded/operations.ts';
import type { Database } from 'bun:sqlite';

const handlers: Record<FlowId, FlowHandler> = {
  menu: menuFlow,
  status: statusFlow,
  balances: balancesFlow,
  accounts: accountsFlow,
  plays: playsFlow,
  tree: treeFlow,
  welcome: welcomeFlow,
  play_ack: (_input, ctx) => ({
    text: ctx.node ? 'Play ack handled via callback.' : 'Not registered.',
    parseMode: 'HTML',
  }),
};

export function findFlowNodeByTelegram(
  db: Database,
  telegramUserId: string // brand-ok
): OpsFlowNode | null {
  return db
    .query(
      `SELECT id, type, parent_id, expert_id, name, telegram_id, call_sign
       FROM tree_nodes WHERE telegram_id = $t AND active = 1`
    )
    .get({ $t: telegramUserId }) as OpsFlowNode | null;
}

export function buildFlowContext(
  db: Database,
  dbPath: string,
  telegramUserId?: string // brand-ok
): FlowContext {
  const node = telegramUserId ? findFlowNodeByTelegram(db, telegramUserId) : null;
  return { db, dbPath, node };
}

export function runFlow(db: Database, dbPath: string, input: FlowInput): FlowOutput {
  const ctx = buildFlowContext(db, dbPath, input.userId);
  const handler = handlers[input.flowId];
  if (!handler) {
    return { text: 'Unknown flow.', parseMode: 'HTML' };
  }

  const enriched: FlowInput = {
    ...input,
    locale: input.locale ?? resolveLocale(null),
    treeNodeId: input.treeNodeId ?? (ctx.node ? asTreeNodeId(ctx.node.id) : undefined),
    callSign: input.callSign ?? ctx.node?.call_sign ?? null,
  };

  const result = handler(enriched, ctx);
  if (result instanceof Promise) {
    throw new Error('Async flow handlers not supported in sync runFlow');
  }
  return result;
}

export function commandToFlowId(command: string): FlowId | null {
  switch (command.replace(/^\//, '').toLowerCase()) {
    case 'start':
      return 'welcome';
    case 'status':
      return 'status';
    case 'accounts':
      return 'accounts';
    case 'plays':
      return 'plays';
    case 'tree':
      return 'tree';
    case 'balances':
      return 'balances';
    case 'balances':
      return 'balances';
    case 'menu':
      return 'menu';
    default:
      return null;
  }
}

export { handlers as flowHandlers };
