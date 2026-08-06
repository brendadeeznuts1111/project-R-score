// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Registry ops alerts — Slack webhook + Telegram bot.
 */
import { loadTelegramEnv } from '../telegram/telegram-config.ts';
import { telegramBotApiUrl } from '../telegram/telegram-api-url.ts';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type RegistryAlertFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;
export type RegistryAlertOptions = {
  slackWebhookUrl?: string;
  telegramBotToken?: string;
  telegramChatTarget?: string;
  fetcher?: RegistryAlertFetch;
};

function severityEmoji(severity: AlertSeverity): string {
  if (severity === 'critical') return '🚨';
  if (severity === 'warning') return '⚠️';
  return 'ℹ️';
}

/** Post a formatted alert to configured Slack/Telegram channels. */
export async function sendRegistryAlert(
  message: string,
  severity: AlertSeverity = 'info',
  options: RegistryAlertOptions = {}
): Promise<{ slack: boolean; telegram: boolean }> {
  const webhook = options.slackWebhookUrl?.trim() || Bun.env.SLACK_WEBHOOK_URL?.trim();
  const tg = loadTelegramEnv();
  const token = options.telegramBotToken?.trim() || tg.effectiveToken || undefined;
  const chatTarget = options.telegramChatTarget?.trim() || tg.opsChatId || undefined;
  const fetcher = options.fetcher ?? fetch;
  const formatted = `${severityEmoji(severity)} [Registry] ${message}`;

  const postSlack = async (): Promise<boolean> => {
    if (!webhook) return false;
    try {
      const res = await fetcher(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formatted }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const postTelegram = async (): Promise<boolean> => {
    if (!token || !chatTarget) return false;
    try {
      const res = await fetcher(telegramBotApiUrl(token, 'sendMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatTarget, text: formatted }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const [slack, telegram] = await Promise.all([postSlack(), postTelegram()]);
  return { slack, telegram };
}
