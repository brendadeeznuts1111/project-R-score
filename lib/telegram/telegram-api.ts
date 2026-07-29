// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/networking/fetch
// @see https://core.telegram.org/bots/api#sendrichmessage — Bot API 10.1 seat desk
// @see https://core.telegram.org/type/RichText — MTProto client rich text (not bot wire)
/**
 * Telegram Bot API helpers for factory ops webhook + outbox projectors.
 *
 * Includes per-token min-interval rate limiting and a single 429 retry.
 */
import { loadTelegramEnv } from './telegram-config.ts';

export type TelegramApiResult = {
  ok: boolean;
  result?: unknown;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
};

/** editMessage* returns 400 when body matches the live message — treat as success. */
export function isTelegramMessageNotModified(result: {
  ok: boolean;
  description?: string;
  errorCode?: number;
}): boolean {
  if (result.ok) return false;
  const d = (result.description ?? '').toLowerCase();
  return d.includes('message is not modified');
}

const lastSendAtByToken = new Map<string, number>();

/** Test helper — clear in-process rate-limit clocks. */
export function resetTelegramRateLimiters(): void {
  lastSendAtByToken.clear();
}

async function respectRateLimit(token: string): Promise<void> {
  const minInterval = loadTelegramEnv().rateLimitMinIntervalMs;
  const last = lastSendAtByToken.get(token) ?? 0;
  const wait = minInterval - (Date.now() - last);
  if (wait > 0) await Bun.sleep(wait);
  lastSendAtByToken.set(token, Date.now());
}

export async function telegramApiCall(
  token: string,
  method: string,
  body: Record<string, unknown>,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch
): Promise<TelegramApiResult> {
  await respectRateLimit(token);
  const res = await fetchImpl(`https://api.telegram.org/bot${token}/` + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as TelegramApiResult;
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string, // brand-ok
  text: string
): Promise<void> {
  await telegramApiCall(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export type BotCommandDef = { command: string; description: string };

export const FACTORY_BOT_COMMANDS: BotCommandDef[] = [
  { command: 'start', description: 'Welcome / link portal account' },
  { command: 'link', description: 'How to link Telegram to portal' },
  { command: 'help', description: 'List commands' },
  { command: 'status', description: 'Ops status or registry health' },
  { command: 'balances', description: 'Liquidity / Soft balances' },
  { command: 'accounts', description: 'Sportsbook accounts' },
  { command: 'plays', description: 'Pending plays' },
  { command: 'tree', description: 'Downstream network' },
  { command: 'register', description: 'Register as sub-agent' },
  { command: 'registry', description: 'Factory registry package count' },
  { command: 'verifydod', description: 'DOD delivery receipt' },
  { command: 'deploy', description: 'Trigger deploy (admin)' },
];

export async function setBotCommands(token: string, commands: BotCommandDef[]): Promise<boolean> {
  const r = await telegramApiCall(token, 'setMyCommands', {
    commands: commands.map(c => ({ command: c.command, description: c.description })),
  });
  return r.ok;
}

/** Bot User from getMe (Bot API). */
export type TelegramBotUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
  can_connect_to_business?: boolean;
  has_main_web_app?: boolean;
  has_topics_enabled?: boolean;
};

export async function getBotMe(token: string): Promise<TelegramBotUser | null> {
  const r = await telegramApiCall(token, 'getMe', {});
  if (!r.ok || !r.result || typeof r.result !== 'object') return null;
  const u = r.result as Partial<TelegramBotUser>;
  if (typeof u.id !== 'number' || typeof u.first_name !== 'string') return null;
  return {
    id: u.id,
    is_bot: Boolean(u.is_bot),
    first_name: u.first_name,
    username: typeof u.username === 'string' ? u.username : undefined,
    can_join_groups: u.can_join_groups,
    can_read_all_group_messages: u.can_read_all_group_messages,
    supports_inline_queries: u.supports_inline_queries,
    can_connect_to_business: u.can_connect_to_business,
    has_main_web_app: u.has_main_web_app,
    has_topics_enabled: u.has_topics_enabled,
  };
}

export type TelegramWebhookInfo = {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
};

/** getWebhookInfo — used by telegram:verify transport probe. */
export async function getWebhookInfo(token: string): Promise<TelegramWebhookInfo | null> {
  const r = await telegramApiCall(token, 'getWebhookInfo', {});
  if (!r.ok || !r.result || typeof r.result !== 'object') return null;
  return r.result as TelegramWebhookInfo;
}

export type TelegramBotCommand = { command: string; description: string };

export type TelegramBotCommandScope =
  | { type: 'default' }
  | { type: 'all_private_chats' }
  | { type: 'all_group_chats' }
  | { type: 'all_chat_administrators' }
  | { type: 'chat'; chat_id: string | number } // brand-ok — Telegram chat_id wire
  | { type: 'chat_administrators'; chat_id: string | number } // brand-ok — Telegram chat_id wire
  | { type: 'chat_member'; chat_id: string | number; user_id: number }; // brand-ok — Telegram chat_id / user_id wire

export async function getMyCommands(
  token: string,
  scope?: TelegramBotCommandScope
): Promise<TelegramBotCommand[] | null> {
  const body: Record<string, unknown> = {};
  if (scope) body.scope = scope;
  const r = await telegramApiCall(token, 'getMyCommands', body);
  if (!r.ok || !Array.isArray(r.result)) return null;
  return r.result as TelegramBotCommand[];
}

export async function getMyName(token: string): Promise<string | null> {
  const r = await telegramApiCall(token, 'getMyName', {});
  if (!r.ok || !r.result || typeof r.result !== 'object') return null;
  const name = (r.result as { name?: string }).name;
  return typeof name === 'string' ? name : null;
}

export async function getMyDescription(token: string): Promise<string | null> {
  const r = await telegramApiCall(token, 'getMyDescription', {});
  if (!r.ok || !r.result || typeof r.result !== 'object') return null;
  const description = (r.result as { description?: string }).description;
  return typeof description === 'string' ? description : null;
}

export async function getMyShortDescription(token: string): Promise<string | null> {
  const r = await telegramApiCall(token, 'getMyShortDescription', {});
  if (!r.ok || !r.result || typeof r.result !== 'object') return null;
  const shortDescription = (r.result as { short_description?: string }).short_description;
  return typeof shortDescription === 'string' ? shortDescription : null;
}

export type TelegramMenuButton = {
  type: string;
  text?: string;
  web_app?: { url?: string };
};

export async function getChatMenuButton(
  token: string,
  chatId?: string | number // brand-ok — Telegram chat_id wire
): Promise<TelegramMenuButton | null> {
  const body: Record<string, unknown> = {};
  if (chatId != null) body.chat_id = chatId;
  const r = await telegramApiCall(token, 'getChatMenuButton', body);
  if (!r.ok || !r.result || typeof r.result !== 'object') return null;
  return r.result as TelegramMenuButton;
}

export type TelegramChatAdministratorRights = {
  is_anonymous?: boolean;
  can_manage_chat?: boolean;
  can_delete_messages?: boolean;
  can_manage_video_chats?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
  can_post_stories?: boolean;
  can_edit_stories?: boolean;
  can_delete_stories?: boolean;
  can_manage_topics?: boolean;
  can_manage_direct_messages?: boolean;
};

export async function getMyDefaultAdministratorRights(
  token: string,
  forChannels = false
): Promise<TelegramChatAdministratorRights | null> {
  const r = await telegramApiCall(token, 'getMyDefaultAdministratorRights', {
    for_channels: forChannels,
  });
  if (!r.ok || !r.result || typeof r.result !== 'object') return null;
  return r.result as TelegramChatAdministratorRights;
}

export type TelegramChatInfo = {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_forum?: boolean;
  description?: string;
  invite_link?: string;
  permissions?: Record<string, unknown>;
  active_usernames?: string[];
};

export async function getChat(
  token: string,
  chatId: string | number // brand-ok — Telegram chat_id wire
): Promise<
  { ok: true; chat: TelegramChatInfo } | { ok: false; description?: string; errorCode?: number }
> {
  const r = await telegramApiCall(token, 'getChat', { chat_id: chatId });
  if (!r.ok || !r.result || typeof r.result !== 'object') {
    return { ok: false, description: r.description, errorCode: r.error_code };
  }
  return { ok: true, chat: r.result as TelegramChatInfo };
}

export type TelegramChatMember = {
  status: string;
  user?: { id?: number; username?: string; is_bot?: boolean };
  can_manage_chat?: boolean;
  can_delete_messages?: boolean;
  can_manage_video_chats?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  is_anonymous?: boolean;
};

export async function getChatMember(
  token: string,
  chatId: string | number, // brand-ok — Telegram chat_id wire
  userId: number
): Promise<
  { ok: true; member: TelegramChatMember } | { ok: false; description?: string; errorCode?: number }
> {
  const r = await telegramApiCall(token, 'getChatMember', { chat_id: chatId, user_id: userId });
  if (!r.ok || !r.result || typeof r.result !== 'object') {
    return { ok: false, description: r.description, errorCode: r.error_code };
  }
  return { ok: true, member: r.result as TelegramChatMember };
}

export async function getChatMemberCount(
  token: string,
  chatId: string | number // brand-ok — Telegram chat_id wire
): Promise<number | null> {
  const r = await telegramApiCall(token, 'getChatMemberCount', { chat_id: chatId });
  return r.ok && typeof r.result === 'number' ? r.result : null;
}

export async function getChatAdministrators(
  token: string,
  chatId: string | number // brand-ok — Telegram chat_id wire
): Promise<TelegramChatMember[] | null> {
  const r = await telegramApiCall(token, 'getChatAdministrators', { chat_id: chatId });
  if (!r.ok || !Array.isArray(r.result)) return null;
  return r.result as TelegramChatMember[];
}

export type SendTelegramBotMessageInput = {
  chatId: string | number; // brand-ok — Telegram chat_id wire
  text: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: Record<string, unknown>;
  messageThreadId?: number;
  replyToMessageId?: number;
  forceReply?: {
    selective?: boolean;
    input_field_placeholder?: string;
  };
};

export type SendRichTelegramMessageInput = {
  chatId: string | number; // brand-ok — Telegram chat_id wire
  richMessage: import('./rich-message.ts').InputRichMessage;
  messageThreadId?: number;
  replyMarkup?: Record<string, unknown>;
  disableNotification?: boolean;
};

export type SendTelegramBotMessageResult = {
  ok: boolean;
  messageId?: number;
  description?: string;
  errorCode?: number;
  /** Seconds from Telegram 429 when send still failed after one retry. */
  retryAfterSec?: number;
  retriedAfter429?: boolean;
};

async function callSendMessage(
  token: string,
  body: Record<string, unknown>,
  fetchImpl?: typeof globalThis.fetch
): Promise<TelegramApiResult> {
  return telegramApiCall(token, 'sendMessage', body, fetchImpl);
}

/** sendMessage — used by ops outbox telegram projector + flow deliver. */
export async function sendTelegramBotMessage(
  token: string,
  input: SendTelegramBotMessageInput,
  fetchImpl?: typeof globalThis.fetch
): Promise<SendTelegramBotMessageResult> {
  const body: Record<string, unknown> = {
    chat_id: input.chatId,
    text: input.text,
  };
  if (input.parseMode) body.parse_mode = input.parseMode;
  if (input.replyMarkup) body.reply_markup = input.replyMarkup;
  if (input.messageThreadId != null) body.message_thread_id = input.messageThreadId;
  if (input.replyToMessageId != null) body.reply_to_message_id = input.replyToMessageId;
  if (input.forceReply) {
    body.reply_markup = {
      force_reply: true,
      selective: input.forceReply.selective ?? true,
      ...(input.forceReply.input_field_placeholder
        ? { input_field_placeholder: input.forceReply.input_field_placeholder }
        : {}),
    };
  }

  let r = await callSendMessage(token, body, fetchImpl);
  let retriedAfter429 = false;
  let retryAfterSec: number | undefined;

  if (!r.ok && r.error_code === 429) {
    retryAfterSec = r.parameters?.retry_after ?? 1;
    await Bun.sleep(Math.max(0, retryAfterSec * 1000));
    resetTelegramRateLimiters();
    r = await callSendMessage(token, body, fetchImpl);
    retriedAfter429 = true;
    if (!r.ok && r.error_code === 429) {
      retryAfterSec = r.parameters?.retry_after ?? retryAfterSec ?? 1;
    } else {
      retryAfterSec = undefined;
    }
  }

  const messageId =
    r.ok && r.result && typeof r.result === 'object'
      ? (r.result as { message_id?: number }).message_id
      : undefined;
  return {
    ok: r.ok,
    messageId: typeof messageId === 'number' ? messageId : undefined,
    description: r.description,
    errorCode: r.error_code,
    retryAfterSec,
    retriedAfter429: retriedAfter429 || undefined,
  };
}

export type EditTelegramMessageInput = {
  chatId: string | number; // brand-ok — Telegram chat_id wire
  messageId: number;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: Record<string, unknown>;
};

/** editMessageReplyMarkup — wizard keyboard steps without touching message body. */
export async function editMessageReplyMarkup(
  token: string,
  input: {
    chatId: string | number; // brand-ok — Telegram chat_id wire
    messageId: number;
    replyMarkup: Record<string, unknown>;
  }
): Promise<SendTelegramBotMessageResult> {
  const r = await telegramApiCall(token, 'editMessageReplyMarkup', {
    chat_id: input.chatId,
    message_id: input.messageId,
    reply_markup: input.replyMarkup,
  });
  return {
    ok: r.ok,
    messageId: input.messageId,
    description: r.description,
    errorCode: r.error_code,
  };
}

/** editMessageText — used by flow deliver for keyboard updates. */
export async function editTelegramMessage(
  token: string,
  input: EditTelegramMessageInput,
  fetchImpl?: typeof globalThis.fetch
): Promise<SendTelegramBotMessageResult> {
  const body: Record<string, unknown> = {
    chat_id: input.chatId,
    message_id: input.messageId,
    text: input.text,
  };
  if (input.parseMode) body.parse_mode = input.parseMode;
  if (input.replyMarkup) body.reply_markup = input.replyMarkup;

  const r = await telegramApiCall(token, 'editMessageText', body, fetchImpl);
  return {
    ok: r.ok,
    messageId: input.messageId,
    description: r.description,
    errorCode: r.error_code,
  };
}

async function callRichMessageApi(
  token: string,
  method: 'sendRichMessage' | 'editMessageText',
  body: Record<string, unknown>
): Promise<TelegramApiResult> {
  return telegramApiCall(token, method, body);
}

/** sendRichMessage — Bot API 10.1 structured desk tables. */
export async function sendRichTelegramMessage(
  token: string,
  input: SendRichTelegramMessageInput
): Promise<SendTelegramBotMessageResult> {
  const body: Record<string, unknown> = {
    chat_id: input.chatId,
    rich_message: input.richMessage,
  };
  if (input.messageThreadId != null) body.message_thread_id = input.messageThreadId;
  if (input.replyMarkup) body.reply_markup = input.replyMarkup;
  if (input.disableNotification) body.disable_notification = true;

  let r = await callRichMessageApi(token, 'sendRichMessage', body);
  let retriedAfter429 = false;
  let retryAfterSec: number | undefined;

  if (!r.ok && r.error_code === 429) {
    retryAfterSec = r.parameters?.retry_after ?? 1;
    await Bun.sleep(Math.max(0, retryAfterSec * 1000));
    resetTelegramRateLimiters();
    r = await callRichMessageApi(token, 'sendRichMessage', body);
    retriedAfter429 = true;
  }

  const messageId =
    r.ok && r.result && typeof r.result === 'object'
      ? (r.result as { message_id?: number }).message_id
      : undefined;
  return {
    ok: r.ok,
    messageId: typeof messageId === 'number' ? messageId : undefined,
    description: r.description,
    errorCode: r.error_code,
    retryAfterSec,
    retriedAfter429: retriedAfter429 || undefined,
  };
}

export type EditRichTelegramMessageInput = {
  chatId: string | number; // brand-ok — Telegram chat_id wire
  messageId: number;
  richMessage: import('./rich-message.ts').InputRichMessage;
  replyMarkup?: Record<string, unknown>;
};

/** editMessageText with rich_message (no text field). */
export async function editRichTelegramMessage(
  token: string,
  input: EditRichTelegramMessageInput
): Promise<SendTelegramBotMessageResult> {
  const body: Record<string, unknown> = {
    chat_id: input.chatId,
    message_id: input.messageId,
    rich_message: input.richMessage,
  };
  if (input.replyMarkup) body.reply_markup = input.replyMarkup;

  const r = await callRichMessageApi(token, 'editMessageText', body);
  return {
    ok: r.ok,
    messageId: input.messageId,
    description: r.description,
    errorCode: r.error_code,
  };
}
