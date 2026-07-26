// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Telegram Bot API env SSOT — tokens, ops chat, forum topic threads.
 *
 * @see config/tenants.ts — per-tenant telegramBotEnvKey
 * @see docs/harness/tenants/telegram-factory.md
 */
import type { OpsChannelTopic } from '../channels/ops-channel-event.ts';
import { loadTelegramSurfacesMap } from './surfaces.ts';

export type TelegramTopicsMap = Record<string, number>;

export type TelegramEnvSnapshot = {
  factoryToken: string | null;
  legacyToken: string | null;
  effectiveToken: string | null;
  opsChatId: string | null; // brand-ok — Telegram ops chat_id wire (TELEGRAM_OPS_CHAT_ID)
  /** Concern → chat_id map from TELEGRAM_SURFACES. */
  surfaces: Record<string, string>;
  webhookSecret: string | null;
  topics: TelegramTopicsMap;
  rateLimitMinIntervalMs: number;
  /** Telegram user ids allowed for sensitive ops (comma-separated env). */
  opsAdminUserIds: number[];
};

const DEFAULT_RATE_LIMIT_MIN_INTERVAL_MS = 34; // ~29 msg/s (Telegram global ~30/s)

function trimEnv(key: string): string | null {
  const v = Bun.env[key]?.trim();
  return v || null;
}

/** Parse TELEGRAM_TOPICS JSON map (forum thread ids by logical topic). */
export function parseTelegramTopics(raw: string | null | undefined): TelegramTopicsMap {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: TelegramTopicsMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n) && n >= 0) out[k] = Math.trunc(n);
    }
    return out;
  } catch {
    return {};
  }
}

/** Parse OPS_ADMIN_USER_IDS / TELEGRAM_OPS_ADMIN_USER_IDS comma list. */
export function parseOpsAdminUserIds(raw: string | null | undefined): number[] {
  if (!raw?.trim()) return [];
  const out: number[] = [];
  for (const part of raw.split(/[,\s]+/)) {
    const n = Number(part.trim());
    if (Number.isFinite(n) && n > 0) out.push(Math.trunc(n));
  }
  return [...new Set(out)];
}

export function isOpsAdminUserId(
  userId: number,
  admins: number[] = loadTelegramEnv().opsAdminUserIds
): boolean {
  if (admins.length === 0) return false;
  return admins.includes(userId);
}

export function loadTelegramEnv(): TelegramEnvSnapshot {
  const factoryToken = trimEnv('TELEGRAM_BOT_FACTORY');
  const legacyToken = trimEnv('TELEGRAM_BOT_TOKEN');
  const rateRaw = trimEnv('TELEGRAM_RATE_LIMIT_MIN_INTERVAL_MS');
  const parsedRate = rateRaw ? Number(rateRaw) : NaN;

  return {
    factoryToken,
    legacyToken,
    effectiveToken: factoryToken ?? legacyToken,
    opsChatId: trimEnv('TELEGRAM_OPS_CHAT_ID'),
    surfaces: loadTelegramSurfacesMap(),
    webhookSecret: trimEnv('TELEGRAM_WEBHOOK_SECRET'),
    topics: parseTelegramTopics(trimEnv('TELEGRAM_TOPICS')),
    rateLimitMinIntervalMs:
      Number.isFinite(parsedRate) && parsedRate > 0
        ? parsedRate
        : DEFAULT_RATE_LIMIT_MIN_INTERVAL_MS,
    opsAdminUserIds: parseOpsAdminUserIds(
      trimEnv('OPS_ADMIN_USER_IDS') ?? trimEnv('TELEGRAM_OPS_ADMIN_USER_IDS')
    ),
  };
}

/** Resolve factory tenant token (Pages webhook + ops consumer). */
export function resolveFactoryTelegramToken(
  env: Record<string, string | undefined> = Bun.env
): string | null {
  return (
    trimEnvFromRecord(env, 'TELEGRAM_BOT_FACTORY') ?? trimEnvFromRecord(env, 'TELEGRAM_BOT_TOKEN')
  );
}

function trimEnvFromRecord(env: Record<string, string | undefined>, key: string): string | null {
  const v = env[key]?.trim();
  return v || null;
}

/** Resolve token for a portal tenant env key (e.g. TELEGRAM_BOT_FACTORY). */
export function resolveTenantTelegramToken(
  env: Record<string, string | undefined>,
  envKey?: string
): string | null {
  if (!envKey) return null;
  return trimEnvFromRecord(env, envKey);
}

/**
 * Forum thread id for ops outbox topic when posting to TELEGRAM_OPS_CHAT_ID.
 * DMs (partner.welcome, play ack) ignore this — they use tree_nodes.telegram_id.
 */
export function threadIdForOutboxTopic(
  topics: TelegramTopicsMap,
  topic: OpsChannelTopic,
  eventType?: string
): number | undefined {
  if (eventType === 'partner.welcome') return undefined;

  const byTopic = topics[topic];
  if (byTopic != null && byTopic > 0) return byTopic;

  const aliases: Partial<Record<OpsChannelTopic, string[]>> = {
    identity: ['welcome', 'identity'],
    plays: ['plays', 'ops'],
    alerts: ['alerts'],
    toc: ['toc', 'ops'],
    dod: ['dod', 'alerts'],
    provisioning: ['provisioning', 'ops'],
    experiments: ['experiments'],
  };

  for (const key of aliases[topic] ?? [topic]) {
    const id = topics[key];
    if (id != null && id > 0) return id;
  }

  return undefined;
}

/** Whether env has minimum factory bot credentials for send/consume. */
export function telegramTransportReady(env: TelegramEnvSnapshot = loadTelegramEnv()): {
  ready: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!env.effectiveToken) missing.push('TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN');
  return { ready: missing.length === 0, missing };
}
