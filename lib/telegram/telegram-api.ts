// @see https://bun.com/docs/runtime/networking/fetch
/**
 * Telegram Bot API helpers for factory ops webhook + outbox projectors.
 */

export type TelegramApiResult = {
  ok: boolean;
  result?: unknown;
  description?: string;
  error_code?: number;
};

export async function telegramApiCall(
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<TelegramApiResult> {
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
};

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

  const r = await telegramApiCall(token, 'sendMessage', body);
  const messageId =
    r.ok && r.result && typeof r.result === 'object'
      ? (r.result as { message_id?: number }).message_id
      : undefined;
  return {
    ok: r.ok,
    messageId: typeof messageId === 'number' ? messageId : undefined,
    description: r.description,
    errorCode: r.error_code,
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
