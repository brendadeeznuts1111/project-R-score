/**
 * Local Bun webhook — sync handler (full bot.ts + optional SQLite).
 *
 * Pages deploy uses `functions/api/telegram/webhook/` (R2 enqueue). Local
 * `serve:public` / bun-only keeps low-latency direct handling.
 *
 * @see lib/telegram/webhook-pages.ts — edge enqueue path
 * @see lib/telegram/bot.ts — command router
 */
import { getTenant, isTenantSlug } from '../../../../config/tenants.ts';
import { AccountR2Store } from '../../../../lib/accounts/account-r2-store.ts';
import { R2ChannelStore } from '../../../../lib/channels/channels.ts';
import { createTenantBot } from '../../../../lib/telegram/bot.ts';
import type { TelegramUpdate } from '../../../../lib/telegram/telegram-update.ts';
import { jsonResponse, requireBucket, type PagesContext } from '../../_shared/pages-env.ts';

export async function onRequest(context: PagesContext): Promise<Response> {
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
  if (!tenantSlug || !isTenantSlug(tenantSlug)) {
    return jsonResponse({ error: 'Invalid tenant' }, 400);
  }

  const tenant = getTenant(tenantSlug)!;
  const bot = createTenantBot(tenantSlug);
  const update = (await request.json()) as TelegramUpdate;

  const work = bot.handleUpdate(update, {
    tenant,
    accounts: new AccountR2Store(bucket),
    bucket,
    channel: new R2ChannelStore(bucket),
    env: env as Record<string, string | undefined>,
  });

  if (context.waitUntil) {
    context.waitUntil(work);
    return new Response('OK', { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }

  await work;
  return new Response('OK', { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
