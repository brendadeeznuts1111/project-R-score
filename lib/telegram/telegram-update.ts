/**
 * Telegram Bot API update wire shapes — edge-safe (no bun:sqlite).
 *
 * Shared by Pages webhook enqueue and Bun bot router.
 * @see https://core.telegram.org/bots/api#update
 */

export type TelegramChatWire = {
  id: number;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_forum?: boolean;
};

export type TelegramUserWire = {
  id: number;
  is_bot?: boolean;
  username?: string;
  first_name?: string;
  last_name?: string;
};

/** Photo size entry from Bot API message.photo[] (largest last). */
export type TelegramPhotoSizeWire = {
  file_id?: string; // brand-ok — Telegram file_id wire
  width?: number;
  height?: number;
  file_unique_id?: string; // brand-ok — Telegram Bot API file_unique_id wire
};

export type TelegramDocumentWire = {
  file_id?: string; // brand-ok — Telegram file_id wire
  mime_type?: string;
  file_name?: string;
};

export type TelegramMessage = {
  chat: TelegramChatWire;
  from: TelegramUserWire;
  text?: string;
  /** Caption on photo / document media. */
  caption?: string;
  message_id?: number;
  /** Forum topic thread (package Accounting · house Deposits/…). */
  message_thread_id?: number;
  date?: number;
  photo?: TelegramPhotoSizeWire[];
  document?: TelegramDocumentWire;
  reply_to_message?: TelegramMessage;
};

export type TelegramCallbackQuery = {
  id: string; // brand-ok — Telegram callback_query id
  from: TelegramUserWire;
  data?: string;
  message?: {
    chat: TelegramChatWire;
    message_id?: number;
    message_thread_id?: number;
  };
};

/** ChatMember subset — status drives known-chat active flag. */
export type TelegramChatMemberWire = {
  status: string;
  user?: TelegramUserWire;
};

export type TelegramChatMemberUpdated = {
  chat: TelegramChatWire;
  from?: TelegramUserWire;
  date?: number;
  old_chat_member?: TelegramChatMemberWire;
  new_chat_member?: TelegramChatMemberWire;
};

export type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  /** Bot joined/left/promoted — primary signal for known-chats learning. */
  my_chat_member?: TelegramChatMemberUpdated;
  /** Other members changed (requires admin + allowed_updates). */
  chat_member?: TelegramChatMemberUpdated;
};

/** Update types factory webhook should request for self-learning chats. */
export const FACTORY_WEBHOOK_ALLOWED_UPDATES = [
  'message',
  'edited_message',
  'callback_query',
  'my_chat_member',
  'channel_post',
] as const;
