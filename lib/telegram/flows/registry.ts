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
import { getChatChannelMeta } from './channel-meta.ts';
import { resolveFlowNodeForTelegram } from './seat-telegram.ts';
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
  telegramUserId: string, // brand-ok
  callSignHint?: string | null
): OpsFlowNode | null {
  return resolveFlowNodeForTelegram(db, telegramUserId, { callSignHint });
}

export function buildFlowContext(
  db: Database,
  dbPath: string,
  telegramUserId?: string, // brand-ok
  callSignHint?: string | null
): FlowContext {
  const node = telegramUserId ? findFlowNodeByTelegram(db, telegramUserId, callSignHint) : null;
  return { db, dbPath, node };
}

export function runFlow(db: Database, dbPath: string, input: FlowInput): FlowOutput {
  const ctx = buildFlowContext(db, dbPath, input.userId, input.callSign);
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

  if (
    result.editMessageId == null &&
    result.templateId &&
    input.chatId &&
    !input.callbackData?.endsWith(':r')
  ) {
    const meta = getChatChannelMeta(db, input.chatId);
    const remembered = meta?.lastTemplateIds?.[result.templateId];
    if (remembered != null) {
      return { ...result, editMessageId: remembered };
    }
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
    case 'menu':
      return 'menu';
    default:
      return null;
  }
}

export { handlers as flowHandlers };
