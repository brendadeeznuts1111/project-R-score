/**
 * Partner Telegram topic slug SSOT (no partner-routes import — avoids cycles).
 *
 * @see partner-telegram.ts — deep links, phase permissions, glossary ids
 */

export type TelegramTopicSlug = 'general' | 'ops' | 'alerts' | 'liquidity' | 'accounting';

export const TELEGRAM_TOPICS: Record<
  TelegramTopicSlug,
  { id: number; glossaryId: string /* brand-ok — glossary concept key */; name: string }
> = {
  general: { id: 1, glossaryId: 'telegram.topic.general', name: 'General' },
  ops: { id: 2, glossaryId: 'telegram.topic.ops', name: 'Ops' },
  alerts: { id: 3, glossaryId: 'telegram.topic.alerts', name: 'Alerts' },
  liquidity: { id: 4, glossaryId: 'telegram.topic.liquidity', name: 'Liquidity' },
  accounting: { id: 5, glossaryId: 'telegram.topic.accounting', name: 'Accounting' },
} as const;

export function isTelegramTopicSlug(value: string): value is TelegramTopicSlug {
  return Object.hasOwn(TELEGRAM_TOPICS, value);
}
