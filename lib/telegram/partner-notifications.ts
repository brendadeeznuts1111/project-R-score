// lib/telegram/partner-notifications.ts — partner notification fan-out layer.
//
// Genuinely-new surface on top of the existing Factory Telegram integration:
// per-partner notification preferences (stored on the partner profile's
// `telegram.preferences`), a typed fan-out delivery helper over the existing
// rate-limited `sendTelegramBotMessage`, and a `notifyPartners` batch that
// never fails the whole fan-out on a single chat error.
//
// No credentials travel through chat — preferences carry flags only; secrets
// stay in Proton Pass (see seat-intake: "Book password — local intake only").

import { sendTelegramBotMessage, type TelegramApiResult } from './telegram-api.ts';

export const TELEGRAM_NOTIFICATION_TYPES = ['dailyCapacity', 'newEvents', 'betConfirm'] as const;
export type TelegramNotificationType = (typeof TELEGRAM_NOTIFICATION_TYPES)[number];

/** Partner opt-in flags, stored as `partner.telegram.preferences` (all default on). */
export type TelegramNotificationPreferences = Partial<Record<TelegramNotificationType, boolean>>;

/** Defaults applied over partial prefs — unknown keys ignored, known keys default true. */
export function resolveNotificationPreferences(
  prefs?: TelegramNotificationPreferences
): Record<TelegramNotificationType, boolean> {
  const base: Record<TelegramNotificationType, boolean> = {
    dailyCapacity: true,
    newEvents: true,
    betConfirm: true,
  };
  if (!prefs) return base;
  for (const key of TELEGRAM_NOTIFICATION_TYPES) {
    if (typeof prefs[key] === 'boolean') base[key] = prefs[key]!;
  }
  return base;
}

/** True when the partner wants this notification type (default: yes). */
export function shouldNotify(
  type: TelegramNotificationType,
  prefs?: TelegramNotificationPreferences
): boolean {
  return resolveNotificationPreferences(prefs)[type] === true;
}

export type PartnerNotificationTarget = {
  partnerCode: string; // brand-ok — partner CODE (^[A-Z]{3,6}$)
  chatId: string; // brand-ok — Telegram chat_id wire
  topicId?: number;
};

export type PartnerNotificationMessage = {
  text: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: Record<string, unknown>;
};

/** Deliver one notification to one partner chat/topic (rate-limited per token). */
export async function deliverPartnerNotification(
  token: string,
  target: PartnerNotificationTarget,
  message: PartnerNotificationMessage
): Promise<TelegramApiResult> {
  return sendTelegramBotMessage(token, {
    chatId: target.chatId,
    text: message.text,
    parseMode: message.parseMode,
    replyMarkup: message.replyMarkup,
    messageThreadId: target.topicId,
  });
}

export type PartnerNotifyResult = {
  delivered: number;
  failed: Array<{ partnerCode: string; error: string }>;
};

/**
 * Fan-out to many partner chats sequentially (sendTelegramBotMessage already
 * rate-limits per token). One failing chat never aborts the rest.
 */
export async function notifyPartners(
  token: string,
  targets: readonly PartnerNotificationTarget[],
  message: PartnerNotificationMessage
): Promise<PartnerNotifyResult> {
  const failed: PartnerNotifyResult['failed'] = [];
  let delivered = 0;
  for (const target of targets) {
    try {
      const result = await deliverPartnerNotification(token, target, message);
      if (result.ok) {
        delivered++;
      } else {
        failed.push({
          partnerCode: target.partnerCode,
          error: result.description ?? `telegram error ${result.errorCode ?? 'unknown'}`,
        });
      }
    } catch (err) {
      failed.push({
        partnerCode: target.partnerCode,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { delivered, failed };
}
