// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Telegram transport readiness — env + optional live API probe.
 */
import { getBotMe, getWebhookInfo } from './telegram-api.ts';
import {
  loadTelegramEnv,
  type TelegramEnvSnapshot,
  telegramTransportReady,
} from './telegram-config.ts';

export type TelegramTransportHealth = {
  ready: boolean;
  missing: string[];
  env: Pick<TelegramEnvSnapshot, 'opsChatId' | 'topics' | 'rateLimitMinIntervalMs'> & {
    hasFactoryToken: boolean;
    hasLegacyToken: boolean;
    hasWebhookSecret: boolean;
  };
  bot: {
    username: string | null;
    id: number | null;
  };
  webhook: {
    configured: boolean;
    url: string | null;
    pendingUpdateCount: number | null;
  };
  forumTopicsConfigured: boolean;
  groupChatConfigured: boolean;
  recommendations: string[];
};

export async function queryTelegramTransportHealth(opts?: {
  probe?: boolean;
  token?: string;
}): Promise<TelegramTransportHealth> {
  const env = loadTelegramEnv();
  const transport = telegramTransportReady(env);
  const recommendations: string[] = [];

  if (!transport.ready) {
    recommendations.push('Set TELEGRAM_BOT_FACTORY in .env (see .env.example)');
  }
  if (!env.webhookSecret) {
    recommendations.push('Set TELEGRAM_WEBHOOK_SECRET before telegram:factory:setup');
  }
  if (!env.opsChatId) {
    recommendations.push('Set TELEGRAM_OPS_CHAT_ID for group ops/alerts projector');
  }
  if (Object.keys(env.topics).length === 0 && env.opsChatId) {
    recommendations.push('Set TELEGRAM_TOPICS JSON for forum thread routing');
  }

  const health: TelegramTransportHealth = {
    ready: transport.ready,
    missing: transport.missing,
    env: {
      hasFactoryToken: Boolean(env.factoryToken),
      hasLegacyToken: Boolean(env.legacyToken),
      hasWebhookSecret: Boolean(env.webhookSecret),
      opsChatId: env.opsChatId,
      topics: env.topics,
      rateLimitMinIntervalMs: env.rateLimitMinIntervalMs,
    },
    bot: { username: null, id: null },
    webhook: { configured: false, url: null, pendingUpdateCount: null },
    forumTopicsConfigured: Object.keys(env.topics).length > 0,
    groupChatConfigured: Boolean(env.opsChatId),
    recommendations,
  };

  if (!opts?.probe || !transport.ready) return health;

  const token = opts.token ?? env.effectiveToken!;
  const me = await getBotMe(token);
  if (me?.username) {
    health.bot.username = me.username;
    health.bot.id = me.id ?? null;
  } else {
    health.ready = false;
    health.missing.push('getMe failed — token invalid or revoked');
  }

  const wh = await getWebhookInfo(token);
  if (wh) {
    const url = typeof wh.url === 'string' ? wh.url : null;
    health.webhook.url = url;
    health.webhook.configured = Boolean(url);
    health.webhook.pendingUpdateCount =
      typeof wh.pending_update_count === 'number' ? wh.pending_update_count : null;
    if (!url) {
      recommendations.push('Run bun run telegram:factory:setup to register webhook');
    }
  }

  health.recommendations = [...new Set(recommendations)];
  return health;
}
