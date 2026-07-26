/**
 * Drain R2 `telegram-updates` queue → factory bot handler (shared by CLI + tests).
 */
import type { AccountR2Store } from '../accounts/account-r2-store.ts';
import type { R2ChannelStore, MemoryChannelStore, ChannelMessage } from '../channels/channels.ts';
import type { R2PutBucket } from '../pages/r2-types.ts';
import type { TenantConfig } from '../../config/tenants.ts';
import { getTenant, isTenantSlug } from '../../config/tenants.ts';
import { createTenantBot } from './bot.ts';
import type { TelegramUpdateEnqueuePayload } from './webhook-pages.ts';

export type DrainTelegramUpdatesOpts = {
  updates: ChannelMessage[];
  bucket: R2PutBucket;
  channel: R2ChannelStore | MemoryChannelStore;
  accounts: AccountR2Store;
  tenant: TenantConfig;
  env: Record<string, string | undefined>;
  dbPath: string;
};

/** Process enqueued webhook updates; returns count handled. */
export async function drainTelegramUpdates(opts: DrainTelegramUpdatesOpts): Promise<number> {
  let processed = 0;
  const bot = createTenantBot(opts.tenant.id as string);

  for (const ev of opts.updates) {
    const p = ev.payload as TelegramUpdateEnqueuePayload;
    if (!p?.tenantSlug || !p.update || !isTenantSlug(p.tenantSlug)) continue;
    const tenant = getTenant(p.tenantSlug);
    if (!tenant) continue;

    await bot.handleUpdate(p.update, {
      tenant,
      accounts: opts.accounts,
      bucket: opts.bucket,
      channel: opts.channel,
      env: { ...opts.env, OPS_DB_PATH: opts.dbPath },
    });
    processed++;
  }

  return processed;
}
