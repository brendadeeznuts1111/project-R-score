// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Telegram flow model — input / output cards for ops bot.
 */
import type { TreeNodeId } from '../../types/branded/operations.ts';

export type FlowId =
  | 'menu'
  | 'status'
  | 'balances'
  | 'accounts'
  | 'plays'
  | 'tree'
  | 'welcome'
  | 'play_ack';

export type FlowLocale = 'en' | 'es';

export type FlowInput = {
  flowId: FlowId;
  chatId: string; // brand-ok — Telegram chat id wire
  userId?: string; // brand-ok — Telegram user id wire
  treeNodeId?: TreeNodeId;
  callSign?: string | null;
  locale?: FlowLocale;
  rawText?: string;
  callbackData?: string;
  editMessageId?: number;
  photo?: { fileId: string; caption?: string }; // brand-ok — Telegram file_id wire
};

export type LabelKey =
  | 'btn.menu'
  | 'btn.status'
  | 'btn.balances'
  | 'btn.accounts'
  | 'btn.plays'
  | 'btn.tree'
  | 'btn.refresh'
  | 'btn.placed'
  | 'btn.skip'
  | 'btn.back'
  | 'card.menu.title'
  | 'card.menu.hint'
  | 'card.balances.title'
  | 'card.status.title'
  | 'card.not_registered';

export type KeyboardButton = {
  textKey: LabelKey;
  callbackData: string;
};

export type KeyboardSpec = {
  rows: KeyboardButton[][];
};

export type ChatImageMeta = {
  chatId: string; // brand-ok
  messageId?: number;
  fileId: string; // brand-ok — Telegram file_id wire
  purpose: 'proof' | 'welcome' | 'status_card' | 'bundle';
  caption?: string;
  callSign?: string | null;
  taskId?: string; // brand-ok — toc task id wire when purpose=proof
  bundleId?: string; // brand-ok
  createdAt: string;
};

export type FlowOutput = {
  text: string;
  parseMode?: 'HTML' | 'Markdown';
  keyboard?: KeyboardSpec;
  photo?: {
    fileIdOrUrl: string;
    caption?: string;
    meta?: ChatImageMeta;
  };
  editMessageId?: number;
  nextFlow?: FlowId;
  sideEffects?: Array<'enqueue_outbox' | 'log_message' | 'attach_proof'>;
};

export type TelegramInlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

export type ChatChannelMeta = {
  chatId: string; // brand-ok
  treeNodeIds: string[]; // brand-ok — TreeNodeId wires allowed in this chat
  callSigns: string[];
  locale: FlowLocale;
  topics: Partial<Record<'identity' | 'plays' | 'alerts' | 'toc' | 'ops', number>>;
  imageBundleId?: string; // brand-ok
  lastTemplateIds?: Partial<Record<import('../templates/types.ts').TemplateId, number>>;
  linkedAt?: string;
};

export type FlowHandler = (input: FlowInput, ctx: FlowContext) => FlowOutput;

export type FlowContext = {
  db: import('bun:sqlite').Database;
  dbPath: string;
  node: OpsFlowNode | null;
};

export type OpsFlowNode = {
  id: string; // brand-ok
  type: 'partner' | 'agent' | 'sub_agent';
  parent_id: string | null; // brand-ok
  expert_id: string | null; // brand-ok
  name: string;
  telegram_id: string; // brand-ok
  call_sign: string | null;
};
