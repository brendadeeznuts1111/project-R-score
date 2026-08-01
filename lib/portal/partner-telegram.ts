/**
 * Partner Telegram deep links + topic permissions.
 *
 * Reconciliation with the portal framework:
 * - Topic glossary ids are the SHIPPED Factory overlay ids
 *   (telegram.topic.* — lib/telegram/partner-ops-glossary.ts). The Kalshi
 *   glossary does not own telegram topic leaves.
 * - Phase keys use the real registry type PartnerOpsPhase
 *   (lib/telegram/partner-ops-registry.ts).
 * - In-app hashes reuse the URLPattern canonical form from partner-routes.ts
 *   (#partner/:code/telegram/:topic) — NOT the doc's divergent
 *   #telegram:code:topic.
 */

import type { PartnerOpsPhase } from '../telegram/partner-ops-registry.ts';
import { partnerHash } from './partner-routes.ts';
import {
  TELEGRAM_TOPICS,
  isTelegramTopicSlug,
  type TelegramTopicSlug,
} from './partner-telegram-topics.ts';

export { TELEGRAM_TOPICS, isTelegramTopicSlug, type TelegramTopicSlug };

const BOT_USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;
const PARTNER_CODE_RE = /^[A-Z]{3,6}$/;

/** Topic permissions by partner phase (shipped overlay topic ids). */
export const TOPIC_PERMISSIONS: Record<PartnerOpsPhase, readonly TelegramTopicSlug[]> = {
  onboarding: ['general', 'ops'],
  operator_ready: ['general', 'ops', 'alerts', 'liquidity', 'accounting'],
  incomplete: ['general'],
  paused: ['general', 'alerts'],
};

/**
 * Generate a t.me deep link with a compact base64url routing hint.
 * The bot must still authorize the Telegram user and package membership;
 * `start` payloads are public input and never grant access by themselves.
 * e.g. telegramDeepLink("FactoryWagerBot", "ASH", "ops")
 *   → https://t.me/FactoryWagerBot?start=QVNIOm9wcw
 */
export function telegramDeepLink(
  botUsername: string,
  partnerCode: string, // brand-ok — partner CODE from partners-ops registry
  topic: TelegramTopicSlug
): string {
  const username = botUsername.replace(/^@/, '');
  const code = partnerCode.trim().toUpperCase();
  if (!BOT_USERNAME_RE.test(username)) throw new Error('Invalid Telegram bot username');
  if (!PARTNER_CODE_RE.test(code)) throw new Error('Invalid partner code');
  const payload = btoa(`${code}:${topic}`)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `https://t.me/${username}?start=${payload}`;
}

/** Decode board deep-link start payload (`CODE:topic` base64url). Null if invalid. */
export function decodeTelegramStartPayload(
  raw: string
): { code: string; topic: TelegramTopicSlug } | null {
  const token = String(raw || '').trim();
  if (!token || token.startsWith('link_')) return null;
  try {
    const pad = token.length % 4 === 0 ? '' : '='.repeat(4 - (token.length % 4));
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const decoded = atob(b64);
    const colon = decoded.indexOf(':');
    if (colon < 0) return null;
    const code = decoded.slice(0, colon).trim().toUpperCase();
    const topic = decoded
      .slice(colon + 1)
      .trim()
      .toLowerCase();
    if (!PARTNER_CODE_RE.test(code) || !isTelegramTopicSlug(topic)) return null;
    return { code, topic };
  } catch {
    return null;
  }
}

/** Topics a partner phase may open via the board Bot column. */
export function telegramTopicsForPhase(phase: PartnerOpsPhase): readonly TelegramTopicSlug[] {
  return TOPIC_PERMISSIONS[phase] ?? TOPIC_PERMISSIONS.onboarding;
}

/** In-app hash to the telegram thread for a partner + topic. */
export function telegramAppHash(
  partnerCode: string, // brand-ok — partner CODE
  topic: TelegramTopicSlug
): string {
  const code = partnerCode.trim().toUpperCase();
  if (!PARTNER_CODE_RE.test(code)) return '#partners';
  return partnerHash({ type: 'telegram', code, topic });
}

/** All topic glossary ids (for the integration validator). */
export function partnerTelegramGlossaryIds(): string[] {
  return Object.values(TELEGRAM_TOPICS).map(topic => topic.glossaryId);
}
