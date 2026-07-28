// @see https://bun.com/docs/runtime/fetch — fetch with AbortSignal.timeout
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Telegram ops alerting for high-risk identity events (Phase 2 add-on).
 *
 * Provides a factory for the `IdentityOptions.onHighRisk` hook
 * (identity.ts): when anomaly scoring blocks a login, the hook posts a
 * short alert to the ops Telegram chat. Alerting is strictly best-effort —
 * the hook is synchronous, fires the send without awaiting, and swallows
 * every failure so a Telegram outage can never break or mask a login flow.
 *
 * Env is read through the repo SSOT (`loadTelegramEnv`,
 * lib/telegram/telegram-config.ts): TELEGRAM_BOT_FACTORY / TELEGRAM_BOT_TOKEN
 * + TELEGRAM_OPS_CHAT_ID. When token or chat id is missing the default
 * sender degrades to a no-op (tests and offline deploys stay hermetic).
 * Tests inject `send` and never touch network or env.
 */

import type { TreeNodeId } from '../types/branded.ts';
import { loadTelegramEnv } from '../telegram/telegram-config.ts';

/** Injectable sender — returns whether the message was accepted. */
export type TelegramAlertSend = (text: string) => Promise<boolean>;

const SEND_TIMEOUT_MS = 3000;

/** Pure message formatter — exported for tests and custom senders. */
export function formatHighRiskAlert(nodeId: TreeNodeId, reason: string): string {
  return [
    '🚨 High-risk login blocked',
    `Node: ${nodeId as string}`,
    `Reason: ${reason}`,
    `Time: ${new Date().toISOString()}`,
  ].join('\n');
}

let warnedOnce = false;

function warnSendFailureOnce(): void {
  if (warnedOnce) return;
  warnedOnce = true;
  console.warn('identity/telegram-alerts: ops alert send failed (swallowed; login unaffected)');
}

/**
 * Default sender: posts to the Telegram Bot API `sendMessage` with a 3s
 * timeout. Resolves false on any failure (missing env, network, non-2xx) —
 * never rejects, so the fire-and-forget hook has nothing to catch in the
 * common path.
 */
function createDefaultSend(chatId?: string): TelegramAlertSend { // brand-ok — Telegram chat_id wire string
  const env = loadTelegramEnv();
  const token = env.effectiveToken;
  const target = chatId ?? env.opsChatId;
  if (!token || !target) {
    return () => Promise.resolve(false); // tolerant no-op
  }
  return async (text: string): Promise<boolean> => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: target, text }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      return res.ok;
    } catch {
      return false;
    }
  };
}

/**
 * Build an `onHighRisk` hook for `IdentitySystem`. The returned hook is
 * synchronous (identity.ts invokes it inside try/catch): it formats the
 * alert and fires `send(text)` WITHOUT awaiting; rejections are swallowed
 * with a single console.warn.
 */
export function createHighRiskTelegramHook(options?: {
  chatId?: string; // brand-ok — Telegram chat_id wire string (TELEGRAM_OPS_CHAT_ID shape)
  send?: TelegramAlertSend;
}): (nodeId: TreeNodeId, reason: string) => void {
  const send = options?.send ?? createDefaultSend(options?.chatId);
  return (nodeId: TreeNodeId, reason: string): void => {
    try {
      void send(formatHighRiskAlert(nodeId, reason)).catch(warnSendFailureOnce);
    } catch {
      // Alerting must never break or mask the login flow.
    }
  };
}
