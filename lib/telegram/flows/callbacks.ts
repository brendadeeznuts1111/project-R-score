// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Unified callback router — flow nav + play ack.
 */
import type { Database } from 'bun:sqlite';
import { handlePlayCallback } from '../play-callback.ts';
import { parseFlowCallback } from './keyboards.ts';
import { resolveLocale } from './i18n.ts';
import { runFlow } from './registry.ts';
import type { FlowId, FlowInput, FlowOutput, OpsFlowNode } from './types.ts';
import { asTreeNodeId } from '../../types/branded/operations.ts';

export type CallbackContext = {
  db: Database;
  dbPath: string;
  chatId: string; // brand-ok
  userId: string; // brand-ok
  messageId?: number;
  node: OpsFlowNode | null;
  locale?: string;
};

function flowIdFromCallback(data: string): FlowId | null {
  const parsed = parseFlowCallback(data);
  if (!parsed) return null;
  const id = parsed.flowId as FlowId;
  if (
    id === 'menu' ||
    id === 'status' ||
    id === 'balances' ||
    id === 'accounts' ||
    id === 'plays' ||
    id === 'tree' ||
    id === 'welcome'
  ) {
    return id;
  }
  return null;
}

export function handleFlowCallback(data: string, ctx: CallbackContext): FlowOutput | null {
  if (data.startsWith('play:')) {
    const result = handlePlayCallback(ctx.db, ctx.userId, data);
    return {
      text: result.message,
      parseMode: 'HTML',
    };
  }

  const flowId = flowIdFromCallback(data);
  if (!flowId) return null;

  const input: FlowInput = {
    flowId,
    chatId: ctx.chatId,
    userId: ctx.userId,
    treeNodeId: ctx.node ? asTreeNodeId(ctx.node.id) : undefined,
    callSign: ctx.node?.call_sign ?? null,
    locale: resolveLocale(ctx.locale),
    callbackData: data,
    editMessageId: ctx.messageId,
  };

  return runFlow(ctx.db, ctx.dbPath, input);
}
