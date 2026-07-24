/**
 * Telegram webhook — edge-safe Pages handler (R2 enqueue only, no bun:sqlite).
 *
 * Validates secret + tenant, appends the update to R2 `telegram-updates`, ACKs Telegram.
 * Bun `telegram:ops:consume` drains the queue with full bot.ts + SQLite.
 *
 * @see functions/api/telegram/webhook/[[tenant]].ts
 * @see tools/telegram-ops-consumer.ts
 */
import { R2ChannelStore } from '../channels/channels.ts';
import {
  jsonResponse,
  requireBucket,
  type PagesContext,
} from '../pages/pages-function.ts';
import type { TelegramUpdate } from './telegram-update.ts';

/** R2 channel topic for inbound Telegram updates (Pages → Bun consumer). */
export const TELEGRAM_UPDATES_TOPIC = 'telegram-updates';

/** Edge-safe tenant allowlist (mirrors config/tenants — avoid Bun.env brand mint on Workers). */
const EDGE_TENANT_SLUGS = new Set(['factory', 'science', 'tennis']);

function isEdgeTenantSlug(slug: string): boolean {
  return EDGE_TENANT_SLUGS.has(slug);
}

export type TelegramUpdateEnqueuePayload = {
  tenantSlug: string;
  update: TelegramUpdate;
  receivedAt: string;
};

export type { PagesContext };

/** Handle Telegram Bot API webhook POST for a tenant slug (edge-safe). */
export async function onTelegramWebhookRequest(
  context: PagesContext
): Promise<Response> {
  const { request, env, params } = context;

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    if (env.ALLOW_INSECURE_TELEGRAM_WEBHOOK !== '1') {
      return jsonResponse({ error: 'Webhook secret not configured' }, 503);
    }
  } else {
    const header = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (header !== secret) return jsonResponse({ error: 'Forbidden' }, 403);
  }

  let bucket: NonNullable<typeof env.REGISTRY_BUCKET>;
  try {
    bucket = requireBucket(env);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const rawTenant = params?.tenant;
  const tenantSlug = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant;
  if (!tenantSlug || !isEdgeTenantSlug(tenantSlug)) {
    return jsonResponse({ error: 'Invalid tenant' }, 400);
  }

  const update = (await request.json()) as TelegramUpdate;
  const payload: TelegramUpdateEnqueuePayload = {
    tenantSlug,
    update,
    receivedAt: new Date().toISOString(),
  };

  const work = new R2ChannelStore(bucket).publish(TELEGRAM_UPDATES_TOPIC, payload, {
    sender: 'telegram-webhook',
  });

  if (context.waitUntil) {
    context.waitUntil(work);
    return new Response('OK', { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }

  await work;
  return new Response('OK', { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
