// @see https://bun.com/docs/runtime/networking/fetch
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
  body: Record<string, unknown>
): Promise<TelegramApiResult> {
  await respectRateLimit(token);
  const res = await fetch(`https://api.telegram.org/bot${token}/` + method, {
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
  { command: 'accounts', description: 'Sportsbook accounts' },
  { command: 'plays', description: 'Pending plays' },
  { command: 'tree', description: 'Downstream network' },
  { command: 'register', description: 'Register as sub-agent' },
  { command: 'registry', description: 'Factory registry package count' },
  { command: 'deploy', description: 'Trigger deploy (admin)' },
];

export async function setBotCommands(token: string, commands: BotCommandDef[]): Promise<boolean> {
  const r = await telegramApiCall(token, 'setMyCommands', {
    commands: commands.map(c => ({ command: c.command, description: c.description })),
  });
  return r.ok;
}

export async function getBotMe(token: string): Promise<{ username?: string } | null> {
  const r = await telegramApiCall(token, 'getMe', {});
  if (!r.ok || !r.result || typeof r.result !== 'object') return null;
  const u = r.result as { username?: string };
  return { username: u.username };
}

export type SendTelegramBotMessageInput = {
  chatId: string | number; // brand-ok — Telegram chat_id wire
  text: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: Record<string, unknown>;
  messageThreadId?: number;
};

export type SendTelegramBotMessageResult = {
  ok: boolean;
  messageId?: number;
  description?: string;
  errorCode?: number;
  retriedAfter429?: boolean;
};

async function callSendMessage(
  token: string,
  body: Record<string, unknown>
): Promise<TelegramApiResult> {
  return telegramApiCall(token, 'sendMessage', body);
}

/** sendMessage — used by ops outbox telegram projector + flow deliver. */
export async function sendTelegramBotMessage(
  token: string,
  input: SendTelegramBotMessageInput
): Promise<SendTelegramBotMessageResult> {
  const body: Record<string, unknown> = {
    chat_id: input.chatId,
    text: input.text,
  };
  if (input.parseMode) body.parse_mode = input.parseMode;
  if (input.replyMarkup) body.reply_markup = input.replyMarkup;
  if (input.messageThreadId != null) body.message_thread_id = input.messageThreadId;

  let r = await callSendMessage(token, body);
  let retriedAfter429 = false;

  if (!r.ok && r.error_code === 429) {
    const retryAfterSec = r.parameters?.retry_after ?? 1;
    await Bun.sleep(Math.max(0, retryAfterSec * 1000));
    resetTelegramRateLimiters();
    r = await callSendMessage(token, body);
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

/** editMessageText — used by flow deliver for keyboard updates. */
export async function editTelegramMessage(
  token: string,
  input: EditTelegramMessageInput
): Promise<SendTelegramBotMessageResult> {
  const body: Record<string, unknown> = {
    chat_id: input.chatId,
    message_id: input.messageId,
    text: input.text,
  };
  if (input.parseMode) body.parse_mode = input.parseMode;
  if (input.replyMarkup) body.reply_markup = input.replyMarkup;

  const r = await telegramApiCall(token, 'editMessageText', body);
  return {
    ok: r.ok,
    messageId: input.messageId,
    description: r.description,
    errorCode: r.error_code,
  };
}
