// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// lib/telegram/inline-confirmation.ts — inline-button confirmations (additive).
//
// Reusable confirm/cancel keyboard + callback routing for the notification
// layer, mirroring the seat-desk one-confirm pattern
// (`buildSeatDeskAdoptBookMaxConfirmMarkup`). Callback data is colon-delimited
// and ≤64 bytes: `nf:<type>:<action>:<payload>`.
//
// v1 ships one real persisted action: `nf:daily:ack:<CALLSIGN>` acknowledges
// the partner's latest daily capacity report in the ops DB
// (`telegram_daily_report_log.acked_at`).

import { sendTelegramBotMessage } from './telegram-api.ts';

import type { Database } from 'bun:sqlite';

import { ackDailyReport } from './daily-capacity-report.ts';

/** Inline keyboard with a confirm row + optional cancel row. */
export function buildInlineConfirmMarkup(
  data: string,
  confirmLabel: string,
  cancelLabel = '← Cancel',
  cancelData?: string
): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: confirmLabel, callback_data: data }],
      [{ text: cancelLabel, callback_data: cancelData ?? `${data}|cancel` }],
    ],
  };
}

/** True for notification-layer callbacks (`nf:…`). */
export function isNotificationCallback(data: string): boolean {
  return data.startsWith('nf:');
}

export type NotificationCallbackInput = {
  data: string;
  db: Database;
};

export type NotificationCallbackResult = {
  toast: string;
  acked?: boolean;
};

/**
 * Route a `nf:` callback. v1: daily-report acknowledgement.
 * `nf:daily:ack:<CALLSIGN>` → ack the latest delivery, toast the result.
 */
export function handleNotificationCallback(
  input: NotificationCallbackInput
): NotificationCallbackResult {
  const parts = input.data.split(':');
  const [, type, action, payload] = parts;

  if (type === 'daily' && action === 'ack' && payload) {
    const acked = ackDailyReport(input.db, payload.toUpperCase());
    if (acked > 0) {
      return { toast: `✅ Daily report acknowledged for ${payload.toUpperCase()}`, acked: true };
    }
    return { toast: `Nothing pending to acknowledge for ${payload.toUpperCase()}` };
  }

  return { toast: 'Unknown notification action.' };
}

export type SendInlineConfirmationOpts = {
  token: string;
  chatId: string; // brand-ok — Telegram chat_id wire
  text: string;
  data: string;
  confirmLabel: string;
  cancelLabel?: string;
  topicId?: number;
};

/** Send a message with a confirm/cancel inline keyboard. */
export async function sendInlineConfirmation(opts: SendInlineConfirmationOpts) {
  return sendTelegramBotMessage(opts.token, {
    chatId: opts.chatId,
    text: opts.text,
    parseMode: 'Markdown',
    messageThreadId: opts.topicId,
    replyMarkup: buildInlineConfirmMarkup(opts.data, opts.confirmLabel, opts.cancelLabel),
  });
}
