/**
 * Telegram Bot API update wire shapes — edge-safe (no bun:sqlite).
 *
 * Shared by Pages webhook enqueue and Bun bot router.
 */

export type TelegramMessage = {
  chat: { id: number };
  from: { id: number; username?: string };
  text?: string;
};

export type TelegramCallbackQuery = {
  id: string; // brand-ok — Telegram callback_query id
  from: { id: number };
  data?: string;
  message?: { chat: { id: number }; message_id?: number };
};

export type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};
