/**
 * Telegram-domain brand alias — keeps deep `flows/cards/*` modules off the
 * deep-relative-import ratchet (`../../../` may only go down; `../../brands.ts`
 * is two levels from cards). SSOT remains lib/types/branded/*.ts — re-export only,
 * no new brand declarations. Import brands from here within lib/telegram.
 */
export { asTreeNodeId } from '../types/branded/operations.ts';
export { asTelegramUserId, type TelegramUserId } from '../types/branded/portal.ts';
